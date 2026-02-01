import express from 'express';
import multer from 'multer';
import * as controller from '../controllers/recruiterController.js'; // Note 'controller' (singular) folder

const router = express.Router();

// Multer for file uploads (Memory Storage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/send-otp', controller.sendOtp);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

// 'image' matches the key used in your Java @RequestParam("image")
router.post('/signup', upload.single('image'), controller.signup);
router.post('/login', controller.login);

export default router;