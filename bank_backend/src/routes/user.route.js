/**
 * User Routes - Handles user-related endpoints
 * 
 */
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
    getUserProfileController,
    updateUserProfileController,
} from '../controllers/user.controller.js';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Get current user's profile
router.get('/me', getUserProfileController);

// Update current user's profile
router.patch('/me', updateUserProfileController);

export default router;