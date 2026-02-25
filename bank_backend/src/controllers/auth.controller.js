/**
 * Auth Controller - Handles authentication-related HTTP requests
 *
 */

import bcrypt from "bcryptjs";
import { AuthenticateUser, changePassword } from "../services/auth.service.js";
import { createUser, verifyUser } from "../services/user.service.js";
import {
	updateRefreshToken,
	invalidateRefreshToken,
} from "../services/token.service.js";
import {
	generateOTP,
	verifyOTP,
	canRequestOTP,
	invalidateAllOTPs,
} from "../services/otp.service.js";
import {
	validateSignupInputs,
	validateLoginInputs,
	validateOTP,
	validateEmail,
	validatePassword,
} from "../utils/validations.util.js";
import {
	sendOTPNotification,
	sendWelcomeNotification,
	sendPasswordResetNotification,
	sendPasswordChangedNotification,
	sendAccountVerifiedNotification,
} from "../services/notification.service.js";
import {
	findUserById,
	findUserByEmail,
	changeUserPassword,
	removeAllRefreshTokens,
} from "../utils/query.util.js";
import {
	setRefreshTokenCookie,
	clearRefreshTokenCookie,
} from "../utils/cookie.util.js";
import {
	formatErrorResponse,
	formatSuccessResponse,
} from "../utils/response.util.js";
import {
	ValidationError,
	UserNotFoundError,
	InvalidTokenError,
	ForbiddenError,
} from "../utils/errors.util.js";
import {
	AUTH,
	isDevelopment,
	SUCCESS_MESSAGES,
	VERIFICATION,
} from "../config/constants.config.js";

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
		validateSignupInputs({ email, password, phone });

		const user = await createUser(email, password, phone);
		const otp = await generateOTP(
			user.id,
			VERIFICATION.TYPES.EMAIL_VERIFICATION,
		);

		// Pass full user object to notification service
		sendOTPNotification(user, otp);

		res.status(201).json(
			formatSuccessResponse(
				`${SUCCESS_MESSAGES.USER_CREATED}. Check your email and phone for verification code.`,
				{
					userId: user.id,
					...(isDevelopment() && {
						devOTP: otp,
					}),
				},
			),
		);
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

		if (!userId || !otp || !type) {
			throw new ValidationError("userId, otp, and type are required");
		}

		validateOTP(otp);

		const isValid = await verifyOTP(userId, otp, type);
		if (!isValid) {
			return res
				.status(400)
				.json(
					formatErrorResponse(
						new ValidationError(
							"Invalid or expired OTP. Please request a new code.",
						),
					),
				);
		}

		const user = await verifyUser(userId);
		const userName = user.profile?.firstName || "there";

		// Send verified notifications (async)
		sendAccountVerifiedNotification(user, userName);
		// Send welcome notifications (async)
		sendWelcomeNotification(user, userName);

		res.status(200).json(
			formatSuccessResponse(SUCCESS_MESSAGES.ACCOUNT_VERIFIED),
		);
	} catch (error) {
		const statusCode = error.statusCode || 400;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

// ============================================
//  RESEND OTP CONTROLLER
// ============================================
/**
 * POST /auth/resend-otp
 *
 * Body: { userId, type }
 */
export async function resendOTPController(req, res) {
	try {
		const { userId, type } = req.body;

		if (!userId || !type) {
			throw new ValidationError("userId and type are required");
		}

		const canRequest = await canRequestOTP(userId, type);
		if (canRequest !== null) {
			return res.status(429).json(formatErrorResponse(canRequest));
		}

		const otp = await generateOTP(userId, type);
		const user = await findUserById(userId);
		if (!user) {
			throw new UserNotFoundError();
		}

		// Pass full user object
		sendOTPNotification(user, otp);

		res.status(200).json(
			formatSuccessResponse("OTP resent successfully", {
				...(isDevelopment() && { devOTP: otp }),
			}),
		);
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

		validateLoginInputs({ email, password });

		const result = await AuthenticateUser(email, password);

		setRefreshTokenCookie(res, result.refreshToken);

		res.status(200).json(
			formatSuccessResponse(SUCCESS_MESSAGES.LOGIN_SUCCESS, {
				token: result.token,
				user: result.user,
			}),
		);
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
		const oldToken = req.cookies?.refreshToken || req.body.refreshToken;

		if (!oldToken) {
			return res
				.status(401)
				.json(
					formatErrorResponse(
						new InvalidTokenError("Refresh token is missing"),
					),
				);
		}

		// Generate new tokens (token rotation for security)
		const tokens = await updateRefreshToken(oldToken);

		setRefreshTokenCookie(res, tokens.refreshToken);

		res.status(200).json(
			formatSuccessResponse("Token refreshed successfully", {
				token: tokens.token,
			}),
		);
	} catch (error) {
		res.status(403).json(formatErrorResponse(error));
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

		clearRefreshTokenCookie(res);

		res.status(200).json(
			formatSuccessResponse(SUCCESS_MESSAGES.LOGOUT_SUCCESS),
		);
	} catch (error) {
		// Even if invalidation fails, clear cookie and return success
		res.clearCookie("refreshToken");
		res.status(200).json(
			formatSuccessResponse(SUCCESS_MESSAGES.LOGOUT_SUCCESS),
		);
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

		if (!email) {
			throw new ValidationError("Email is required");
		}

		validateEmail(email);

		const user = await findUserByEmail(email);

		// Security: Always return success
		if (!user) {
			return res
				.status(200)
				.json(
					formatSuccessResponse(
						"If that email exists, a reset code has been sent.",
					),
				);
		}

		const otp = await generateOTP(
			user._id,
			VERIFICATION.TYPES.PASSWORD_RESET,
			10,
		);

		// Pass full user object
		sendPasswordResetNotification(user, otp);

		res.status(200).json(
			formatSuccessResponse(
				"If that email exists, a reset code has been sent to your email and phone.",
				{
					...(isDevelopment() && {
						devOTP: otp,
					}),
				},
			),
		);
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

		if (!email || !otp || !newPassword) {
			throw new ValidationError(
				"Email, OTP, and new password are required",
			);
		}

		validateEmail(email);
		validatePassword(newPassword);
		validateOTP(otp);

		const user = await findUserByEmail(email);
		if (!user) {
			throw new UserNotFoundError();
		}

		const isValid = await verifyOTP(
			user._id,
			otp,
			VERIFICATION.TYPES.PASSWORD_RESET,
		);
		if (!isValid) {
			return res
				.status(400)
				.json(
					formatErrorResponse(
						new ValidationError("Invalid or expired reset code"),
					),
				);
		}

		const newHashPassword = await bcrypt.hash(
			newPassword,
			AUTH.BCRYPT_SALT_ROUNDS,
		);
		await changeUserPassword(user._id, newHashPassword);
		await removeAllRefreshTokens(user._id);
		await invalidateAllOTPs(user._id);

		const userName = user.profile?.firstName || "there";
		sendPasswordChangedNotification(user, userName);

		res.status(200).json(
			formatSuccessResponse(
				"Password reset successfully. Please log in with your new password.",
			),
		);
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
		const userId = req.user.id;

		if (!oldPassword || !newPassword) {
			throw new ValidationError(
				"Old password and new password are required",
			);
		}

		validatePassword(newPassword);

		if (oldPassword === newPassword) {
			throw new ValidationError(
				"New password must be different from old password",
			);
		}

		await changePassword(userId, oldPassword, newPassword);

		clearRefreshTokenCookie(res);

		res.status(200).json(
			formatSuccessResponse(
				"Password changed successfully. Please log in again.",
			),
		);
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
	if (process.env.NODE_ENV !== "development") {
		return res
			.status(403)
			.json(
				formatErrorResponse(
					new ForbiddenError(
						"This endpoint is only available in development mode",
					),
				),
			);
	}

	try {
		const { email, phone } = req.query;

		const { testEmailConnection, sendTestEmail } =
			await import("../services/email.service.js");
		const { testTwilioConnection, sendTestSMS } =
			await import("../services/sms.service.js");

		const results = {
			email: { configured: false, sent: false },
			sms: { configured: false, sent: false },
		};

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

		res.status(200).json(formatSuccessResponse("Test completed", results));
	} catch (error) {
		res.status(500).json(formatErrorResponse(error));
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
	testNotificationsController,
};
