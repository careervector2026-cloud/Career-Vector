import dns from 'dns';
// CRITICAL FIX: Force IPv4 to prevent Render/Gmail timeouts
dns.setDefaultResultOrder('ipv4first');

import Recruiter from '../models/Recruiter.js';
import { createClient } from 'redis';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import { uploadFileToSupabase } from '../utils/storage.js';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// --- 1. Redis Setup ---
const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('DEBUG: [Recruiter] Redis Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('DEBUG: [Recruiter] Redis Connected');
    } catch (err) {
        console.error('DEBUG: [Recruiter] Redis Connection Failed:', err);
    }
})();

// --- 2. Email Setup (Final Fix) ---
const transporter = nodemailer.createTransport({
    service: 'gmail', // Automatically handles the correct ports/security
    auth: {
        user: process.env.MAIL_USER,
        // .replace removes spaces if you copied them from Google
        pass: process.env.MAIL_PASS ? process.env.MAIL_PASS.replace(/\s+/g, '') : ''
    }
});

// --- 3. Helper: Send Email OTP ---
const sendEmailOtp = async (email, messagePrefix) => {
    console.log(`DEBUG: [Recruiter] Starting OTP Process for ${email}`);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await redisClient.setEx(email, 300, otp);
        console.log('DEBUG: [Recruiter] Saved to Redis.');
    } catch (err) {
        console.error('DEBUG: [Recruiter] Redis Error:', err);
        throw new Error('Internal Server Error: Redis failed');
    }

    try {
        console.log('DEBUG: [Recruiter] Sending Email...');
        const info = await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "CareerVector Verification",
            text: `${messagePrefix}${otp}\n\nThis code expires in 5 minutes.`
        });
        console.log('DEBUG: [Recruiter] Email Sent:', info.response);
    } catch (err) {
        console.error('DEBUG: [Recruiter] Email Error:', err);
        throw new Error(`Email Service Error: ${err.message}`);
    }
};

export const recruiterService = {
    // 1. Generate OTP (Signup)
    generateAndSendOtp: async (email) => {
        const exists = await Recruiter.findOne({ where: { email } });
        if (exists) throw new Error("Email is already registered. Please login.");
        await sendEmailOtp(email, "Welcome Recruiter! Your verification code is: ");
    },

    // 2. Generate OTP (Forgot Password)
    generateAndSendOtpForReset: async (email) => {
        const exists = await Recruiter.findOne({ where: { email } });
        if (!exists) throw new Error("Email not found. Please register first.");
        await sendEmailOtp(email, "Password Reset Request. Your verification code is: ");
    },

    // 3. Verify OTP
    verifyOtp: async (email, otpInput) => {
        const storedOtp = await redisClient.get(email);
        if (storedOtp && storedOtp === otpInput) {
            await redisClient.del(email);
            return true;
        }
        return false;
    },

    // 4. Reset Password
    resetPassword: async (email, otp, newPassword) => {
        const isValid = await recruiterService.verifyOtp(email, otp);
        if (!isValid) throw new Error("Invalid or Expired verification code.");

        const recruiter = await Recruiter.findOne({ where: { email } });
        if (!recruiter) throw new Error("User not found.");

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        recruiter.password = hashedPassword;
        await recruiter.save();
    },

    // 5. Find User (Login)
    findUser: async (identifier) => {
        return await Recruiter.findOne({
            where: Sequelize.or(
                { email: identifier },
                { userName: identifier }
            )
        });
    },

    // 6. Save Recruiter (Signup)
    save: async (data, file) => {
        const { email, fullName, username, mobile, companyName, role, password } = data;

        const hashedPassword = await bcrypt.hash(password, 10);
        let imageUrl = null;

        if (file) {
            const safeUserName = username || "recruiter";
            const fileName = `${safeUserName}_avatar_${Date.now()}.png`;
            imageUrl = await uploadFileToSupabase(file.buffer, file.mimetype, 'recruiter-images', fileName);
        }

        return await Recruiter.create({
            email,
            fullName,
            userName: username,
            mobile,
            companyName,
            role,
            password: hashedPassword,
            imageUrl,
            verified: true
        });
    }
};