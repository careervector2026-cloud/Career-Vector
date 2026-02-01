import { recruiterService } from '../services/recruiterService.js';
import bcrypt from 'bcryptjs';

// --- Helper for responses ---
const sendError = (res, msg, status = 400) => res.status(status).send(msg);

// 1. Send OTP (Signup)
export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return sendError(res, "Email is required");
        
        await recruiterService.generateAndSendOtp(email);
        res.status(200).send("OTP sent successfully to " + email);
    } catch (e) { sendError(res, e.message); }
};

// 2. Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return sendError(res, "Email is required");

        await recruiterService.generateAndSendOtpForReset(email);
        res.status(200).send("OTP sent successfully for password reset.");
    } catch (e) { sendError(res, e.message); }
};

// 3. Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return sendError(res, "Email, OTP and New Password are required");

        await recruiterService.resetPassword(email, otp, newPassword);
        res.status(200).send("Password updated successfully. Please login.");
    } catch (e) { sendError(res, e.message); }
};

// 4. Signup
export const signup = async (req, res) => {
    try {
        // Data comes from form-data (req.body)
        const { email, otp } = req.body;
        
        const isValid = await recruiterService.verifyOtp(email, otp);
        if (!isValid) return sendError(res, "Invalid or Expired verification code.");

        const recruiter = await recruiterService.save(req.body, req.file); // req.file holds the image
        res.status(201).json(recruiter);
    } catch (e) { 
        console.error(e);
        sendError(res, "Error: " + e.message, 500); 
    }
};

// 5. Login
export const login = async (req, res) => {
    try {
        let { emailOrUsername, email, password } = req.body;
        const identifier = emailOrUsername || email;

        if (!identifier) return sendError(res, "Email or Username is Required");

        const recruiter = await recruiterService.findUser(identifier);

        if (recruiter && await bcrypt.compare(password, recruiter.password)) {
            if (!recruiter.verified) return sendError(res, "Account not verified", 403);
            
            // Remove password before sending back
            const { password: _, ...data } = recruiter.toJSON();
            return res.status(200).json(data);
        }

        return sendError(res, "Invalid Credentials", 401);
    } catch (e) { sendError(res, e.message, 500); }
};