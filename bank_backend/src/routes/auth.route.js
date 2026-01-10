import { Router } from 'express';
import {
    loginController,
    logoutController,
    refreshTokenController,
    signupController,
    verifyOTPController,
    resendOTPController,
} from "../controllers/auth.controller.js";
import { authMiddleware } from '../middlewares/auth.middleware.js';


const router = Router();

// Public routes
router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/verify-otp', verifyOTPController);
router.post('/resend-otp', resendOTPController);

// Token management
router.post('/refresh', refreshTokenController);

// Protected routes
router.post('/logout', authMiddleware, logoutController);

export default router;