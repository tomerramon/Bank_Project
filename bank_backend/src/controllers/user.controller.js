import {
    getUserProfile,
    updateUserProfile,
    getUserStatistics
} from '../services/user.service.js';
import Users from '../models/user.model.js';
import { validateProfileInputs } from '../utils/inputValidation.util.js';
import { centsToDollars } from '../utils/currency.util.js';

/**
 * Get current user's profile
 * GET /users/me
 * 
 * Headers: Authorization: Bearer <token>
 */
export async function getUserProfileController(req, res) {
    try {
        const userId = req.user.id;
        
        // Get profile with recent transactions
        const profile = await getUserProfile(userId, 10);

        // Convert balance to dollars for display
        profile.balanceInDollars = centsToDollars(profile.balance);

        // Convert transaction amounts to dollars
        profile.recentTransactions = profile.recentTransactions.map(t => ({
            ...t,
            amountInDollars: centsToDollars(t.amount),
            formattedAmount: t.direction === 'T_IN' 
                ? `+$${centsToDollars(t.amount).toFixed(2)}`
                : `-$${centsToDollars(t.amount).toFixed(2)}`
        }));

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Update current user's profile
 * PATCH /users/me
 * 
 * Body: { firstName, lastName, address }
 * Headers: Authorization: Bearer <token>
 */
export async function updateUserProfileController(req, res) {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Validate profile inputs
        validateProfileInputs(updates);

        // Update profile
        const updatedUser = await updateUserProfile(userId, updates);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get user statistics
 * GET /users/me/stats
 * 
 * Headers: Authorization: Bearer <token>
 */
export async function getUserStatsController(req, res) {
    try {
        const userId = req.user.id;
        
        const stats = await getUserStatistics(userId);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get all users (Admin/Debug only)
 * GET /users/all
 * 
 * WARNING: In production, this should require admin authentication
 * Headers: Authorization: Bearer <token>
 */
export async function getAllUsersController(req, res) {
    try {
        // TODO: Add admin middleware check
        // if (!req.user.isAdmin) {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'Admin access required'
        //     });
        // }

        const users = await Users.find({})
            .select('email balance isVerified accountStatus createdAt')
            .lean();

        // Convert balances to dollars
        const usersWithDollarBalance = users.map(user => ({
            ...user,
            balance: centsToDollars(user.balance)
        }));

        res.status(200).json({
            success: true,
            count: users.length,
            data: usersWithDollarBalance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}