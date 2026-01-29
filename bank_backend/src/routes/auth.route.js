/**
 * Authentication Routes
 *
 * Defines all authentication-related API endpoints.
 * Route structure follows REST conventions.
 *
 * Public Routes (no authentication required):
 * - POST   /auth/signup           - Create new user account
 * - POST   /auth/verify-otp       - Verify OTP code
 * - POST   /auth/resend-otp       - Resend OTP code
 * - POST   /auth/login            - User login
 * - POST   /auth/refresh          - Refresh access token
 * - POST   /auth/forgot-password  - Request password reset
 * - POST   /auth/reset-password   - Reset password with OTP
 *
 * Protected Routes (authentication required):
 * - POST   /auth/logout           - User logout
 * - POST   /auth/change-password  - Change password
 *
 * Development Only:
 * - GET    /auth/test-notifications - Test email/SMS configuration
 *
 *
 * Route Summary:
 *
 * Authentication Flow:
 * 1. POST /auth/signup              → Create account
 * 2. POST /auth/verify-otp          → Verify email/phone
 * 3. POST /auth/login               → Login
 * 4. POST /auth/refresh             → Refresh token (when expired)
 * 5. POST /auth/logout              → Logout
 *
 * Password Management:
 * 1. POST /auth/forgot-password     → Request reset code
 * 2. POST /auth/reset-password      → Reset with code
 * OR
 * 1. POST /auth/change-password     → Change with old password
 *
 * Helper Routes:
 * - POST /auth/resend-otp           → Resend verification code
 * - GET  /auth/test-notifications   → Test email/SMS (dev only)
 */

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
	loginController,
	logoutController,
	refreshTokenController,
	signupController,
	verifyOTPController,
	resendOTPController,
	forgotPasswordController,
	resetPasswordController,
	changePasswordController,
	testNotificationsController,
} from "../controllers/auth.controller.js";
import { authRateLimit } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================
/**
 * User Registration
 * Creates new user account and sends OTP for verification
 *
 * @route   POST /auth/signup
 * @access  Public
 * @body    { email, password, phone }
 * @returns { success, message, userId, devOTP? }
 */
router.post("/signup", authRateLimit, signupController);

/**
 * User Login
 * Authenticates user and returns access token
 * Refresh token set as HTTP-only cookie
 *
 * @route   POST /auth/login
 * @access  Public
 * @body    { email, password }
 * @returns { success, message, token, user }
 */
router.post("/login", authRateLimit, loginController);

/**
 * Verify OTP Code
 * Verifies user email/phone with OTP code
 *
 * @route   POST /auth/verify-otp
 * @access  Public
 * @body    { userId, otp, type }
 * @returns { success, message }
 */
router.post("/verify-otp", verifyOTPController);

/**
 * Resend OTP Code
 * Generates and sends new OTP code
 * Rate limited to prevent spam
 *
 * @route   POST /auth/resend-otp
 * @access  Public
 * @body    { userId, type }
 * @returns { success, message, devOTP? }
 */
router.post("/resend-otp", resendOTPController);

/**
 * Refresh Access Token
 * Generates new access token using refresh token
 * Implements token rotation for security
 *
 * @route   POST /auth/refresh
 * @access  Public
 * @cookie  refreshToken OR @body { refreshToken }
 * @returns { success, message, token }
 */
router.post("/refresh", refreshTokenController);

/**
 * Request Password Reset
 * Generates OTP and sends via email/SMS
 * Doesn't reveal if email exists (security)
 *
 * @route   POST /auth/forgot-password
 * @access  Public
 * @body    { email }
 * @returns { success, message, devOTP? }
 */
router.post("/forgot-password", authRateLimit, forgotPasswordController);

/**
 * Reset Password with OTP
 * Resets password using OTP code
 * Invalidates all sessions
 *
 * @route   POST /auth/reset-password
 * @access  Public
 * @body    { email, otp, newPassword }
 * @returns { success, message }
 */
router.post("/reset-password", resetPasswordController);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================
/**
 * Change Password
 * Changes password with old password verification
 * Requires current password for security
 *
 * @route   POST /auth/change-password
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    { oldPassword, newPassword }
 * @returns { success, message }
 */
router.post(
	"/change-password",
	authMiddleware,
	authRateLimit,
	changePasswordController,
);

/**
 * User Logout
 * Invalidates refresh token and clears cookie
 *
 * @route   POST /auth/logout
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @returns { success, message }
 */
router.post("/logout", authMiddleware, logoutController);

// ============================================
// DEVELOPMENT ONLY ROUTES
// ============================================
/**
 * Test Notifications
 * Tests email and SMS configuration
 * Only available in development environment
 *
 * @route   GET /auth/test-notifications
 * @access  Public (dev only)
 * @query   email, phone
 * @returns { success, results }
 */
if (process.env.NODE_ENV === "development") {
	router.get("/test-notifications", testNotificationsController);
}

export default router;
