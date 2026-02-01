import { studentService } from '../services/studentService.js';
import Student from '../models/Student.js';
import bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';

export const sendOtp = async (req, res) => {
    try {
        let { email } = req.body;
        if (!email) return res.status(400).send("Email is Required");
        await studentService.generateAndSendOtp(email.trim());
        res.ok(`OTP sent successfully to ${email}`);
    } catch (e) { res.status(400).send(e.message); }
};

export const forgotPassword = async (req, res) => {
    try {
        let { email } = req.body;
        console.log(`Forgot Password Request for: ${email}`);
        if (!email) return res.status(400).send("Email is Required");
        await studentService.generateAndSendOtpForReset(email.trim());
        res.ok("OTP sent for password reset.");
    } catch (e) { res.status(400).send(e.message); }
};

export const resetPassword = async (req, res) => {
    try {
        let { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).send("All fields required");
        await studentService.resetPassword(email.trim(), otp.trim(), newPassword);
        res.ok("Password updated successfully.");
    } catch (e) { res.status(400).send(e.message); }
};

export const signup = async (req, res) => {
    try {
        // req.body contains text fields, req.files contains binary files
        let { email, otp } = req.body;
        
        const isValid = await studentService.verifyOtp(email.trim(), otp.trim());
        if (!isValid) return res.status(400).send("Invalid or expired OTP.");

        const savedStudent = await studentService.saveStudent(req.body, req.files || {});
        res.status(201).json(savedStudent);
    } catch (e) { res.status(400).send("Error: " + e.message); }
};

export const login = async (req, res) => {
    try {
        let { emailOrUsername, email, password } = req.body;
        let identifier = (emailOrUsername || email || "").trim();

        if (!identifier) return res.status(400).send("Email or Username is required");

        // Find by Email OR Username
        const student = await Student.findOne({
            where: Sequelize.or({ email: identifier }, { userName: identifier })
        });

        if (student && await bcrypt.compare(password, student.password)) {
            if (!student.verified) return res.status(403).send("Account not verified.");
            
            // In Node, we usually return a token here, but returning object to match your Java code
            const { password, ...safeData } = student.toJSON();
            return res.ok(safeData);
        }
        res.status(401).send("Invalid Credentials");
    } catch (e) { res.status(500).send(e.message); }
};

// Helper for consistent responses
const responseHelper = (res) => {
    res.ok = (msg) => res.status(200).type('text').send(msg); // Match Java text/plain response
};