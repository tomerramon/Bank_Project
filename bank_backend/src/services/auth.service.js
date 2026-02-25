/**
 * Auth Service
 *
 */
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "./jwt.service.js";
import {
	addRefreshToken,
	changeUserPassword,
	findUserByEmailWithPassword,
	findUserByIdWithPassword,
	incrementFailedLoginAttempts,
	lockUserAccount,
	resetUserLoginAttempts,
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
	AccountLockedError,
} from "../utils/errors.util.js";
import { AUTH } from "../config/constants.config.js";
import { invalidateAllOTPs } from "./otp.service.js";
import { sendAccountLockedNotification } from "./notification.service.js";

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
		// If a previous lock has expired, treat this as a fresh start
		if (user.accountLockedUntil && user.accountLockedUntil < new Date()) {
			await resetUserLoginAttempts(user._id);
			await incrementFailedLoginAttempts(user._id);
			return authError;
		}
		if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
			throw new AccountLockedError(
				Math.ceil((user.accountLockedUntil - Date.now()) / 6000),
			);
		}

		await incrementFailedLoginAttempts(user._id);

		// Use +1 because incrementFailedLoginAttempts wrote to DB but
		// didn't mutate the in-memory user object
		const attemptsAfterIncrement = user.failedLoginAttempts + 1;

		if (attemptsAfterIncrement >= AUTH.MAX_LOGIN_ATTEMPTS) {
			const lockUntil = new Date(Date.now() + AUTH.ACCOUNT_LOCK_DURATION);
			await lockUserAccount(user._id, lockUntil);

			const lockMinutes = Math.ceil(AUTH.ACCOUNT_LOCK_DURATION / 60000);
			sendAccountLockedNotification(user, lockUntil, lockMinutes);

			throw new AccountLockedError(lockMinutes);
		}

		throw authError;
	}

	// Successful login - reset failed attempts counter and lock time
	await resetUserLoginAttempts(user._id);

	// Generate tokens
	const accessToken = generateAccessToken(user);
	const refreshToken = generateRefreshToken(user);

	// Store refresh token in database for validation and revocation
	await addRefreshToken(user._id, refreshToken);

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
		throw new AuthenticationError("Current password is incorrect");
	}

	// Validate new password strength
	validatePassword(newPassword);

	// Update password
	const newHashPassword = await bcrypt.hash(
		newPassword,
		AUTH.BCRYPT_SALT_ROUNDS,
	);
	await changeUserPassword(userId, newHashPassword);
	await removeAllRefreshTokens(userId);
	await invalidateAllOTPs(userId);

	return { message: "Password changed successfully. Please log in again." };
}
