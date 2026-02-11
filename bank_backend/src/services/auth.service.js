/**
 * Auth Service
 *
 */
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "./jwt.service.js";
import {
	findUserByEmailWithPassword,
	findUserByIdWithPassword,
} from "../utils/query.util.js";
import {
	requireActive,
	requireUnlocked,
	requireVerified,
	validatePassword,
} from "../utils/validations.util.js";
import {
	UserNotFoundError,
	AuthenticationError,
} from "../utils/errors.util.js";
import { AUTH } from "../config/constants.config.js";

/**
 * Authenticate user with email and password
 * Implements security features:
 * - Account locking after failed attempts
 * - Account status validation
 * - Email verification requirement
 *
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} - Access token, refresh token, and user info
 */
export async function AuthenticateUser(email, password) {
	const user = await findUserByEmailWithPassword(email);

	// Security: Use same error message for "user not found" and "wrong password"
	// This prevents attackers from discovering which emails are registered
	// const authError = new Error("Authentication failed: Invalid email or password.");
	const authError = new AuthenticationError();

	if (!user) {
		throw authError;
	}

	// Check if account is suspended or closed
	requireActive(user);

	// Check if account is locked due to failed login attempts
	requireUnlocked(user);

	// Require email verification before allowing login
	requireVerified(user);

	// Verify password
	const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordMatch) {
		// Increment failed login attempts
		await user.incrementLoginAttempts();

		// Check if account should now be locked (after increment)
		if (user.failedLoginAttempts > AUTH.MAX_LOGIN_ATTEMPTS) {
			throw new Error(
				"Too many failed login attempts. " +
					"Your account has been locked for 30 minutes.",
			);
		}

		throw authError;
	}

	// Successful login - reset failed attempts counter
	await user.resetLoginAttempts();

	// Generate tokens
	const accessToken = generateAccessToken(user);
	const refreshToken = generateRefreshToken(user);

	// Store refresh token in database for validation and revocation
	await user.addRefreshToken(refreshToken);

	return {
		token: accessToken,
		refreshToken: refreshToken,
		user: {
			id: user._id,
			email: user.email,
			balance: user.balance,
			isVerified: user.isVerified,
			accountStatus: user.accountStatus,
		},
	};
}

/**
 * Change user password (requires old password verification)
 * This is more secure than password reset which might use email
 *
 * @param {string} userId
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise<Object>} - Success message
 */
export async function changePassword(userId, oldPassword, newPassword) {
	const user = await findUserByIdWithPassword(userId);

	if (!user) {
		throw new UserNotFoundError("User not found");
	}

	// Verify old password matches the current password
	const isOldPasswordMatch = await bcrypt.compare(
		oldPassword,
		user.passwordHash,
	);
	if (!isOldPasswordMatch) {
		throw new Error("Current password is incorrect");
	}

	// Validate new password strength
	validatePassword(newPassword);

	// Update password
	user.passwordHash = await bcrypt.hash(newPassword, 10);
	user.refreshTokens = []; // Logout from all devices
	await user.save();

	return { message: "Password changed successfully. Please log in again." };
}

export default {
	AuthenticateUser,
	changePassword,
};
