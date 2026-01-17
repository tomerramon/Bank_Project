/**
 * User Controller - Handles user-related HTTP requests
 * 
 */

import {
    getUserProfile,
    updateUserProfile,
    updateNotificationPreferences
} from '../services/user.service.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.util.js';

/**
 * Get current user's profile
 * GET /users/me
 * 
 * Headers: Authorization: Bearer <token>
 */
export async function getUserProfileController(req, res) {
    try {
        const userId = req.user.id;

        const profile = await getUserProfile(userId, 10);

        res.status(200).json(formatSuccessResponse('Profile retrieved successfully', profile));
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(formatErrorResponse(error));
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

        const updatedUser = await updateUserProfile(userId, updates);

        res.status(200).json(formatSuccessResponse('Profile updated successfully', updatedUser));
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}

/**
 * Update current user's notification preferences
 * PATCH /users/me/notifications
 * 
 * Body: { email: boolean, sms: boolean }
 * Headers: Authorization: Bearer <token>
 * Example Body: { "email": true, "sms": false }
 */
export async function updateNotificationPreferencesController(req, res) {
    try {
        const userId = req.user.id;
        const preferences = req.body;

        const result = await updateNotificationPreferences(userId, preferences);

        res.status(200).json(formatSuccessResponse('Notification preferences updated successfully', result));
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}

export default {
    getUserProfileController,
    updateUserProfileController,
    updateNotificationPreferencesController
};