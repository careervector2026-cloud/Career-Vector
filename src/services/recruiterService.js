import Recruiter from '../models/Recruiter.js';
import { createClient } from 'redis';
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

// --- 2. Helper: Send Email via Brevo API (HTTPS) ---
const sendEmailOtp = async (email, messagePrefix) => {
    console.log(`DEBUG: [Recruiter] Starting OTP Process for ${email}`);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`DEBUG: [Recruiter] Generated OTP: ${otp}`);

    try {
        // Save to Redis
        await redisClient.setEx(email, 300, otp);
        console.log('DEBUG: [Recruiter] Saved to Redis.');

        // Send via Brevo API
        console.log('DEBUG: [Recruiter] Sending email via Brevo...');

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: 'CareerVector Recruiter',
                    email: 'careervector2026@gmail.com' // Your verified sender
                },
                to: [{ email: email }],
                subject: 'CareerVector Verification',
                textContent: `${messagePrefix}${otp}\n\nThis code expires in 5 minutes.`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Brevo API Error: ${errorText}`);
        }

        console.log('DEBUG: [Recruiter] Email Sent Successfully');
    } catch (err) {
        console.error('DEBUG: [Recruiter] Email Error:', err);
        throw new Error(`Email Service Error: ${err.message}`);
    }
};

export const recruiterService = {
    // 1. Generate OTP (Signup)
    generateAndSendOtp: async (email) => {
        console.log(`DEBUG: [Recruiter] Checking if exists: ${email}`);
        const exists = await Recruiter.findOne({ where: { email } });
        if (exists) {
            console.log('DEBUG: [Recruiter] User exists.');
            throw new Error("Email is already registered. Please login.");
        }
        await sendEmailOtp(email, "Welcome Recruiter! Your verification code is: ");
    },

    // 2. Generate OTP (Forgot Password)
    generateAndSendOtpForReset: async (email) => {
        console.log(`DEBUG: [Recruiter] Checking for reset: ${email}`);
        const exists = await Recruiter.findOne({ where: { email } });
        if (!exists) {
            console.log('DEBUG: [Recruiter] User not found.');
            throw new Error("Email not found. Please register first.");
        }
        await sendEmailOtp(email, "Password Reset Request. Your verification code is: ");
    },

    // 3. Verify OTP
    verifyOtp: async (email, otpInput) => {
        console.log(`DEBUG: [Recruiter] Verifying OTP for ${email}`);
        const storedOtp = await redisClient.get(email);
        console.log(`DEBUG: [Recruiter] Stored OTP: ${storedOtp}`);

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
        console.log(`DEBUG: [Recruiter] Password reset success.`);
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
        console.log(`DEBUG: [Recruiter] Saving new user.`);
        const { email, fullName, username, mobile, companyName, role, password } = data;

        const hashedPassword = await bcrypt.hash(password, 10);
        let imageUrl = null;

        if (file) {
            console.log('DEBUG: [Recruiter] Uploading image...');
            const safeUserName = username || "recruiter";
            const fileName = `${safeUserName}_avatar_${Date.now()}.png`;
            imageUrl = await uploadFileToSupabase(file.buffer, file.mimetype, 'recruiter-images', fileName);
        }

        const recruiter = await Recruiter.create({
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
        console.log(`DEBUG: [Recruiter] Saved success.`);
        return recruiter;
    }
};