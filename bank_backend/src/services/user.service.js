/**
 * User Service
 *
 * Handles all user-related business logic:
 * - User creation and management
 * - Profile updates
 * - Balance checks
 * - User statistics
 */

import bcrypt from "bcryptjs";
import Users from "../models/user.model.js";
import { centsToDollars } from "../utils/currency.util.js";
import {
	EmailExistsError,
	PhoneExistsError,
	ValidationError,
	UserNotFoundError,
} from "../utils/errors.util.js";
import { sendLowBalanceNotification } from "./notification.service.js";
import {
	findUserById,
	checkEmailExists,
	checkPhoneExists,
	setUserVerified,
	updateNotificationPreferences as updateNotificationPrefsQuery,
} from "../utils/query.util.js";
import { getRecentTransactions } from "./transaction.service.js";
import { validateNotificationPreferences } from "../utils/validations.util.js";
import { AUTH } from "../config/constants.config.js";

// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Check if user exists by email or phone
 * Throws appropriate error if exists
 *
 * @param {string} email - User email
 * @param {string} phone - User phone
 * @throws {EmailExistsError|PhoneExistsError}
 */
async function checkUserExists(email, phone) {
	// Check if user exists
	if (await checkEmailExists(email)) {
		throw new EmailExistsError();
	}

	if (await checkPhoneExists(phone)) {
		throw new PhoneExistsError();
	}
}

// ============================================
// USER CREATION
// ============================================
/**
 * Create a new user
 *
 * @param {string} email - User email
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} phone - User phone number
 * @returns {Promise<Object>} - Created user (sanitized)
 * @throws {ValidationError|EmailExistsError|PhoneExistsError}
 */
export async function createUser(email, password, phone) {
	if (!email || !password || !phone) {
		throw new ValidationError("Email, password, and phone are required");
	}

	await checkUserExists(email, phone);

	const hashedPassword = await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);

	try {
		const newUser = await Users.create({
			email,
			passwordHash: hashedPassword,
			phone,
		});

		console.log(`✅ User created: ${email} (ID: ${newUser._id})`);

		return {
			id: newUser._id,
			email: newUser.email,
			phone: newUser.phone,
			balance: newUser.balance,
			isVerified: newUser.isVerified,
			accountStatus: newUser.accountStatus,
			notificationPreferences: newUser.notificationPreferences,
			createdAt: newUser.createdAt,
		};
	} catch (error) {
		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern)[0];
			if (field === "email") throw new EmailExistsError();
			if (field === "phone") throw new PhoneExistsError();
			throw new Error(`${field} is already in use`);
		}

		if (error.name === "ValidationError") {
			const messages = Object.values(error.errors).map((e) => e.message);
			throw new ValidationError(messages);
		}

		throw error;
	}
}

// ============================================
// USER VERIFICATION
// ============================================
/**
 * Mark user as verified
 * Called after successful OTP verification
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user
 * @throws {UserNotFoundError}
 */
export async function verifyUser(userId) {
	const user = await setUserVerified(userId);

	if (!user) {
		throw new UserNotFoundError();
	}

	console.log(`✅ User verified: ${user.email}`);

	return user;
}

// ============================================
// USER PROFILE
// ============================================
/**
 * Get user profile with balance and recent transactions
 *
 * @param {string} userId - User ID
 * @param {number} limit - Number of recent transactions (default: 10)
 * @returns {Promise<Object>} - User profile with transactions
 * @throws {UserNotFoundError}
 */
export async function getUserProfile(userId, lim = 10) {
	const user = await findUserById(userId);

	if (!user) {
		throw new UserNotFoundError();
	}
	// Get recent transactions
	const transactionsWithDollars = await getRecentTransactions(userId, lim);

	return {
		id: user._id,
		email: user.email,
		phone: user.phone,
		balance: user.balance,
		balanceInDollars: centsToDollars(user.balance),
		isVerified: user.isVerified,
		accountStatus: user.accountStatus,
		profile: user.profile,
		notificationPreferences: user.notificationPreferences,
		createdAt: user.createdAt,
		recentTransactions: transactionsWithDollars,
	};
}

/**
 * Update user profile information
 * Only allows updating safe fields (not balance, email, etc.)
 *
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated user profile
 * @throws {UserNotFoundError|ValidationError}
 */
export async function updateUserProfile(userId, updates) {
	const allowedFields = [
		"profile.firstName",
		"profile.lastName",
		"profile.dateOfBirth",
		"profile.address.street",
		"profile.address.city",
		"profile.address.country",
		"profile.address.zipCode",
	];

	// Filter to only allowed fields
	const approvedUpdates = {};
	Object.keys(updates).forEach((key) => {
		if (allowedFields.includes(key)) {
			approvedUpdates[key] = updates[key];
		}
	});

	if (Object.keys(approvedUpdates).length === 0) {
		throw new ValidationError("No valid fields to update");
	}

	const user = await Users.findByIdAndUpdate(
		userId,
		{ $set: approvedUpdates },
		{ new: true, runValidators: true },
	);

	if (!user) {
		throw new UserNotFoundError();
	}

	console.log(`✅ Profile updated for user: ${user.email}`);

	return {
		id: user._id,
		email: user.email,
		phone: user.phone,
		profile: user.profile,
	};
}

// ============================================
// BALANCE OPERATIONS
// ============================================
/**
 * Check if user balance is low and send alert
 * Call this after transactions or periodically
 *
 * @param {string} userId - User ID
 * @param {number} thresholdDollars - Alert threshold in dollars (default: 10)
 * @returns {Promise<boolean>} - true if alert sent
 */
export async function checkLowBalance(userId, thresholdDollars = 10) {
	const user = await findUserById(userId);

	if (!user) {
		return false;
	}

	const balanceInDollars = centsToDollars(user.balance);

	if (balanceInDollars < thresholdDollars) {
		console.log(
			`⚠️  Low balance: ${user.email} - $${balanceInDollars.toFixed(2)}`,
		);

		sendLowBalanceNotification(user, balanceInDollars, thresholdDollars);

		return true;
	}

	return false;
}

// ==========================================
// NOTIFICATION PREFERENCES
// ==========================================

/**
 * Update notification preferences
 *
 * @param {string} userId - User's ID
 * @param {Object} preferences - { email: boolean, sms: boolean }
 * @returns {Promise<Object>} - Updated preferences
 */
export async function updateNotificationPreferences(userId, preferences) {
	// Validate preferences
	validateNotificationPreferences(preferences);

	const user = await updateNotificationPrefsQuery(userId, preferences);

	if (!user) {
		throw new UserNotFoundError();
	}

	console.log(`✅ Notification preferences updated for: ${user.email}`);

	return {
		email: user.email,
		notificationPreferences: user.notificationPreferences,
	};
}
