import dns from 'dns';
// CRITICAL FIX: Force IPv4 to prevent Render/Gmail timeouts
dns.setDefaultResultOrder('ipv4first');

import Student from '../models/Student.js';
import { createClient } from 'redis';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import { uploadFileToSupabase } from '../utils/storage.js';
import dotenv from 'dotenv';
dotenv.config();

// --- 1. Redis Client Setup ---
const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('DEBUG: Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('DEBUG: Redis Connected Successfully');
    } catch (err) {
        console.error('DEBUG: Redis Connection Failed:', err);
    }
})();

// --- 2. Email Transporter Setup (Final Fix) ---
const transporter = nodemailer.createTransport({
    service: 'gmail', // Automatically handles the correct ports/security
    auth: {
        user: process.env.MAIL_USER,
        // .replace removes spaces if you copied them from Google (e.g. "abcd efgh" -> "abcdefgh")
        pass: process.env.MAIL_PASS ? process.env.MAIL_PASS.replace(/\s+/g, '') : ''
    }
});

// --- 3. Helper: Send Email with Debug Logs ---
const sendEmailOtp = async (email, messagePrefix) => {
    console.log(`DEBUG: Starting OTP Process for ${email}`);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        // Save to Redis (5 minutes)
        await redisClient.setEx(email, 300, otp);
        console.log('DEBUG: OTP saved to Redis successfully.');
    } catch (redisError) {
        console.error('DEBUG: Failed to save to Redis:', redisError);
        throw new Error('Internal Server Error: Redis failed');
    }

    try {
        console.log('DEBUG: Attempting to send email...');
        const info = await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "CareerVector Verification Code",
            text: `${messagePrefix}${otp}\n\nThis code expires in 5 minutes`
        });
        console.log('DEBUG: Email sent successfully. Response:', info.response);
    } catch (emailError) {
        console.error('DEBUG: Failed to send email:', emailError);
        throw new Error(`Email Service Error: ${emailError.message}`);
    }
};

export const studentService = {
    // 1. Generate OTP (Signup)
    generateAndSendOtp: async (email) => {
        console.log(`DEBUG: Checking if student exists: ${email}`);
        const exists = await Student.findOne({ where: { email } });
        if (exists) {
            console.log('DEBUG: User already exists.');
            throw new Error("Email is already registered. Please login");
        }
        await sendEmailOtp(email, "Welcome to CareerVector! Your Verification Code is: ");
    },

    // 2. Generate OTP (Reset Password)
    generateAndSendOtpForReset: async (email) => {
        console.log(`DEBUG: Checking for password reset: ${email}`);
        const exists = await Student.findOne({ where: { email } });
        if (!exists) {
            console.log('DEBUG: Email not found.');
            throw new Error("Email not found in our records.");
        }
        await sendEmailOtp(email, "CareerVector Password Reset. Your Verification Code is: ");
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
        const isValid = await studentService.verifyOtp(email, otp);
        if (!isValid) throw new Error("Invalid or Expired OTP.");

        const student = await Student.findOne({ where: { email } });
        if (!student) throw new Error("User not found.");

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        student.password = hashedPassword;
        await student.save();
        console.log(`DEBUG: Password reset successful for ${email}`);
    },

    // 5. Save Student (Signup Logic)
    saveStudent: async (data, files) => {
        const {
            roll, fullName, email, password, username, dept, branch,
            mobile, sem, year, semesterGPAs, leetcode, github
        } = data;

        const hashedPassword = await bcrypt.hash(password, 10);

        // Upload Files
        let profileImageUrl = null;
        let resumeUrl = null;

        if (files.profilePic) {
            const file = files.profilePic[0];
            const name = `${roll}_avatar_${Date.now()}.png`;
            profileImageUrl = await uploadFileToSupabase(file.buffer, file.mimetype, 'images', name);
        }
        if (files.resume) {
            const file = files.resume[0];
            const name = `${roll}_resume_${Date.now()}.pdf`;
            resumeUrl = await uploadFileToSupabase(file.buffer, file.mimetype, 'resumes', name);
        }

        // Parse GPAs
        let gpas = {};
        if (semesterGPAs) {
            try {
                const parsed = JSON.parse(semesterGPAs);
                gpas = {
                    gpaSem1: parseFloat(parsed.sem1) || 0.0,
                    gpaSem2: parseFloat(parsed.sem2) || 0.0,
                    gpaSem3: parseFloat(parsed.sem3) || 0.0,
                    gpaSem4: parseFloat(parsed.sem4) || 0.0,
                    gpaSem5: parseFloat(parsed.sem5) || 0.0,
                    gpaSem6: parseFloat(parsed.sem6) || 0.0,
                    gpaSem7: parseFloat(parsed.sem7) || 0.0,
                    gpaSem8: parseFloat(parsed.sem8) || 0.0,
                };
            } catch (e) { console.error("GPA Parse Error", e); }
        }

        // Create Record
        return await Student.create({
            rollNumber: roll,
            fullName,
            email,
            password: hashedPassword,
            userName: username,
            dept,
            branch,
            mobileNumber: mobile,
            semester: parseInt(sem),
            year: parseInt(year),
            ...gpas,
            profileImageUrl,
            resumeUrl,
            leetcodeurl: leetcode,
            githubUrl: github,
            verified: true
        });
    }
};