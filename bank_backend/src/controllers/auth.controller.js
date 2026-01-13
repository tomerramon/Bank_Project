import bcrypt from 'bcryptjs';
import {
    AuthenticateUser,
    changePassword
} from '../services/auth.service.js';
import {
    createUser,
    setVerifyUser,
    findUserById,
    FindUserByEmail,
} from '../services/user.service.js';
import {
    updateRefreshToken,
    invalidateRefreshToken
} from '../services/token.service.js';
import {
    generateOTP,
    verifyOTP,
    canRequestOTP
} from '../services/otp.service.js';
import {
    sendAccountVerifiedEmail, sendOTPEmail,
    sendPasswordChangedEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
} from '../services/email.service.js';
import {
    sendAccountVerifiedSMS, sendOTPSMS,
    sendPasswordChangedSMS,
    sendPasswordResetSMS,
    sendWelcomeSMS,
} from '../services/sms.service.js';
import {
    validateSignupInputs,
    validateLoginInputs,
    validateOTP as validateOTPFormat,
    validateEmail,
    validatePassword
} from '../utils/inputValidation.util.js';
import { ValidationError, UserNotFoundError } from '../utils/errors.util.js';



// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Set refresh token as HTTP-only cookie
 * This is more secure than storing in localStorage
 * 
 * @param {Response} res - Express response object
 * @param {string} refreshToken - JWT refresh token
 */
function setRefreshTokenCookie(res, refreshToken) {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true, // Cannot be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

/**
 * send notification asynchronously (fire and forget). 
 * This pattern ensures user doesn't wait for email\sms delivery.
 * 
 * @param {Function} sendFunction - Email/SMS sending function.
 * @param {Array} args - Array of arguments for send function.
 * @param {string} description - Description for logging.
 */
function sendNotification(sendFunction, args, description) {
    sendFunction(...args)
        .then(() => console.log(`✅ ${description} sent`))
        .catch(err => console.error(`❌ ${description} failed:`, err.message));
}

/**
 * Format error response
 * Consistent error format across all endpoints
 * 
 * @param {Error} error - Error object.
 * @returns {Object} - Formatted error response. 
 */
function formatErrorResponse(error) {
    return {
        success: false,
        message: error.message || 'An error occurred',
        ...(error.errors && { errors: error.errors }),
        ...(error.details && { details: error.details }),
    };
}


// ============================================
//  SIGNUP CONTROLLER
// ============================================
/**
 * Signup controller
 * POST /auth/signup
 * 
 * Body: { email, password, phone }
 */
export async function signupController(req, res) {
    try {
        const { email, password, phone } = req.body;

        // Validate inputs
        validateSignupInputs({ email, password, phone });

        // Create user account
        const user = await createUser(email, password, phone);

        // Generate OTP for email verification
        const otp = await generateOTP(user.id, 'EMAIL_VERIFICATION');

        // Send OTP via Email (async - don't wait)
        sendNotification(
            sendOTPEmail,
            [email, otp, ''],
            'OTP email'
        );

        // Send OTP via SMS (async - don't wait)
        sendNotification(
            sendOTPSMS,
            [phone, otp],
            'OTP SMS'
        );

        // Return success response immediately
        res.status(201).json({
            success: true,
            message: 'User created successfully. Check your email and phone for verification code.',
            userId: user.id,
            // Include OTP in development for easy testing
            ...(process.env.NODE_ENV === 'development' && { devOTP: otp })
        });

    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}


// ============================================
//  OTP VERIFICATION CONTROLLER
// ============================================
/**
 * Verify OTP controller
 * POST /auth/verify-otp
 * 
 * Body: { userId, otp, type }
 */
export async function verifyOTPController(req, res) {
    try {
        const { userId, otp, type } = req.body;

        // Validate required fields
        if (!userId || !otp || !type) {
            throw new ValidationError('userId, otp, and type are required');
        }

        // Validate OTP format (6 digits)
        validateOTPFormat(otp);

        // Verify OTP code
        const isValid = await verifyOTP(userId, otp, type);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP. Please request a new code.'
            });
        }

        // Mark user as verified
        const user = await setVerifyUser(userId);

        // Prepare user info for notifications
        // const balanceInDollars = centsToDollars(user.balance);
        const userName = user.profile?.firstName || 'there';

        // Send welcome email
        sendNotification(
            sendWelcomeEmail,
            [user.email, userName],
            'Welcome email'
        );

        // Send account verified email
        sendNotification(
            sendAccountVerifiedEmail,
            [user.email, userName],
            'Account verified email'
        );

        // Send welcome SMS
        sendNotification(
            sendWelcomeSMS,
            [user.phone, userName],
            'Welcome SMS'
        );

        // Send account verified SMS
        sendNotification(
            sendAccountVerifiedSMS,
            [user.phone, userName],
            'Account verified SMS'
        );

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        });

    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}

// ============================================
//  RESEND OTP CONTROLLER
// ============================================
/**
 * Resend OTP controller
 * POST /auth/resend-otp
 * 
 * Body: { userId, type }
 */
export async function resendOTPController(req, res) {
    try {
        const { userId, type } = req.body;

        // Validate required fields
        if (!userId || !type) {
            throw new ValidationError('userId and type are required');
        }

        // Check rate limiting (prevent spam)
        const canRequest = await canRequestOTP(userId, type);
        if (!canRequest) {
            return res.status(429).json({
                success: false,
                message: 'Too many OTP requests. Please wait before requesting again.'
            });
        }

        // Generate new OTP
        const otp = await generateOTP(userId, type);

        // Get user info
        const user = await findUserById(userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        const userName = user.profile?.firstName || '';

        // Send OTP based on type
        if (type === 'EMAIL_VERIFICATION' || type === 'PASSWORD_RESET') {
            // Send via Email
            sendNotification(
                sendOTPEmail,
                [user.email, otp, userName],
                'Resend OTP email'
            );

            // Send via SMS
            sendNotification(
                sendOTPSMS,
                [user.phone, otp],
                'Resend OTP SMS'
            );
        }

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            ...(process.env.NODE_ENV === 'development' && { devOTP: otp })
        });

    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}


// ============================================
//  LOGIN CONTROLLER
// ============================================
/**
 * Login controller
 * POST /auth/login
 * 
 * Body: { email, password }
 */
export async function loginController(req, res) {
    try {
        const { email, password } = req.body;

        // Validate inputs
        validateLoginInputs({ email, password });

        // Authenticate user (returns tokens and user info)
        const result = await AuthenticateUser(email, password);

        // Set refresh token as secure HTTP-only cookie
        setRefreshTokenCookie(res, result.refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: result.token,
            user: result.user
        });

    } catch (error) {
        const statusCode = error.statusCode || 401;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}


// ============================================
//  TOKEN REFRESH CONTROLLER
// ============================================
/**
 * Refresh token controller
 * POST /auth/refresh
 * 
 * Cookie: refreshToken OR Body: { refreshToken }
 * Note: New refresh token is set as cookie
 */
export async function refreshTokenController(req, res) {
    try {
        // Get refresh token from cookie or body
        const oldToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!oldToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is missing'
            });
        }

        // Generate new tokens (token rotation for security)
        const tokens = await updateRefreshToken(oldToken);

        // Set new refresh token as cookie
        setRefreshTokenCookie(res, tokens.refreshToken);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            token: tokens.token
        });

    } catch (error) {
        res.status(403).json({
            success: false,
            message: error.message || 'Token refresh failed'
        });
    }
}


// ============================================
//  LOGOUT CONTROLLER
// ============================================
/**
 * Logout controller
 * POST /auth/logout
 * 
 * Requires: Authentication (Bearer token)
 * Cookie: refreshToken
 */
export async function logoutController(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await invalidateRefreshToken(refreshToken);
        }

        res.clearCookie('refreshToken');

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        // Even if invalidation fails, clear cookie and return success
        res.clearCookie('refreshToken');
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }
}


// ============================================
//  FORGOT PASSWORD CONTROLLER
// ============================================
/**
 * Request Password Reset
 * POST /auth/forgot-password
 * 
 * Note: For security, we don't reveal if email exists or not.
 */
export async function forgotPasswordController(req, res) {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            throw new ValidationError('Email is required');
        }

        validateEmail(email);

        // Find user
        const user = await FindUserByEmail(email);

        // Security: Always return success (don't reveal if email exists)
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If that email exists, a reset code has been sent.'
            });
        }

        // Generate OTP for password reset
        const otp = await generateOTP(user._id, 'PASSWORD_RESET', 10);

        // Send reset code via Email
        sendNotification(
            sendPasswordResetEmail,
            [email, otp],
            'Password reset email'
        );

        // Send reset code via SMS
        sendNotification(
            sendPasswordResetSMS,
            [user.phone, otp],
            'Password reset SMS'
        );

        res.status(200).json({
            success: true,
            message: 'If that email exists, a reset code has been sent to your email and phone.',
            ...(process.env.NODE_ENV === 'development' && { devOTP: otp })
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}

// ============================================
//  RESET PASSWORD CONTROLLER
// ============================================

/**
 * Reset Password with OTP
 * POST /auth/reset-password
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456",
 *   "newPassword": "NewSecurePass123!"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Password reset successfully. Please log in with your new password."
 * }
 */
export async function resetPasswordController(req, res) {
    try {
        const { email, otp, newPassword } = req.body;

        // Validate required fields
        if (!email || !otp || !newPassword) {
            throw new ValidationError('Email, OTP, and new password are required');
        }

        // Validate email and password
        validateEmail(email);
        validatePassword(newPassword);
        validateOTPFormat(otp);

        // Find user
        const user = await FindUserByEmail(email);
        if (!user) {
            throw new UserNotFoundError();
        }

        // Verify OTP
        const isValid = await verifyOTP(user._id, otp, 'PASSWORD_RESET');
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code'
            });
        }

        // Update password
        user.passwordHash = await bcrypt.hash(newPassword, 10);

        // Security: Invalidate all refresh tokens (logout from all devices)
        user.refreshTokens = [];

        await user.save();

        // Notify user of password change
        const userName = user.profile?.firstName || 'there';

        sendNotification(
            sendPasswordChangedEmail,
            [user.email, userName],
            'Password changed email'
        );

        sendNotification(
            sendPasswordChangedSMS,
            [user.phone],
            'Password changed SMS'
        );

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. Please log in with your new password.'
        });

    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}

// ============================================
//  CHANGE PASSWORD CONTROLLER
// ============================================

/**
 * Change Password (requires current password)
 * POST /auth/change-password
 * 
 * Requires: Authentication (Bearer token)
 * 
 * Request Body:
 * {
 *   "oldPassword": "CurrentPass123!",
 *   "newPassword": "NewSecurePass123!"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Password changed successfully. Please log in again."
 * }
 */
export async function changePasswordController(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id; // From auth middleware

        // Validate required fields
        if (!oldPassword || !newPassword) {
            throw new ValidationError('Old password and new password are required');
        }

        // Validate new password
        validatePassword(newPassword);

        // Check passwords are different
        if (oldPassword === newPassword) {
            throw new ValidationError('New password must be different from old password');
        }

        // Change password
        await changePassword(userId, oldPassword, newPassword);

        // Clear refresh token cookie (user needs to log in again)
        res.clearCookie('refreshToken');

        res.status(200).json({
            success: true,
            message: 'Password changed successfully. Please log in again.'
        });

    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json(formatErrorResponse(error));
    }
}

// ============================================
//  TEST NOTIFICATIONS CONTROLLER (DEV ONLY)
// ============================================
/**
 * Test Email and SMS Configuration
 * GET /auth/test-notifications?email=...&phone=...
 * 
 * Development Only - Tests notification services
 * 
 * Query Parameters:
 * - email: Email address to test
 * - phone: Phone number to test
 * 
 * Response:
 * {
 *   "success": true,
 *   "results": {
 *     "email": { "configured": true, "sent": true },
 *     "sms": { "configured": true, "sent": true }
 *   }
 * }
 */
export async function testNotificationsController(req, res) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only available in development mode'
        });
    }

    try {
        const { email, phone } = req.query;

        // Import test functions dynamically
        const { testEmailConnection, sendTestEmail } = await import('../services/email.service.js');
        const { testTwilioConnection, sendTestSMS } = await import('../services/sms.service.js');

        const results = {
            email: { configured: false, sent: false },
            sms: { configured: false, sent: false }
        };

        // Test email if provided
        if (email) {
            results.email.configured = await testEmailConnection();
            if (results.email.configured) {
                try {
                    await sendTestEmail(email);
                    results.email.sent = true;
                } catch (err) {
                    results.email.error = err.message;
                }
            }
        }

        // Test SMS if provided
        if (phone) {
            results.sms.configured = await testTwilioConnection();
            if (results.sms.configured) {
                try {
                    await sendTestSMS(phone);
                    results.sms.sent = true;
                } catch (err) {
                    results.sms.error = err.message;
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Test completed',
            results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export default {
    signupController,
    verifyOTPController,
    resendOTPController,
    loginController,
    refreshTokenController,
    logoutController,
    forgotPasswordController,
    resetPasswordController,
    changePasswordController,
    testNotificationsController
};