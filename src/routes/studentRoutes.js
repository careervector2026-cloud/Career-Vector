import express from 'express';
import multer from 'multer';
import * as controller from '../controllers/studentController.js';

const router = express.Router();

// Memory storage for Multer (files held in RAM before upload to Supabase)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});
const fileFields = upload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'resume', maxCount: 1 }]);

// Middleware to attach helper
router.use((req, res, next) => {
    res.ok = (data) => {
        if (typeof data === 'string') res.send(data);
        else res.json(data);
    };
    next();
});

router.post('/send-otp', controller.sendOtp);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/signup', fileFields, controller.signup);
router.post('/login', controller.login);

export default router;