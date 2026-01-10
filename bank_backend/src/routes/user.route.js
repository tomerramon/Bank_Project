import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
    getUserProfileController,
    updateUserProfileController,
    getAllUsersController
} from '../controllers/user.controller.js';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Get current user's profile
router.get('/me', getUserProfileController);

// Update current user's profile
router.patch('/me', updateUserProfileController);

// Get all users (admin/debug only - should add admin middleware)
router.get('/all', getAllUsersController);

export default router;