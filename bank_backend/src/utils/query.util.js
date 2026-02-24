/**
 * Query Utilities - THE ONLY PLACE FOR DATABASE QUERIES
 *
 * All database operations go here.
 * Services call these functions - they never query directly.
 *
 */

import Users from "../models/user.model.js";
import Transactions from "../models/transaction.model.js";
import Verifications from "../models/verification.model.js";
import { validateUserForOperation } from "./validations.util.js";
import mongoose from "mongoose";
import { AUTH } from "../config/constants.config.js";

// ==========================================
// USER QUERIES
// ==========================================
export async function findUserById(userId, session = null) {
	const query = Users.findById(userId).select(
		"email balance isVerified accountStatus phone profile notificationPreferences createdAt",
	);

	if (session) query.session(session);

	return await query;
}

export async function findUserByIdWithPassword(userId) {
	return await Users.findById(userId).select(
		"email balance isVerified accountStatus phone profile notificationPreferences createdAt +passwordHash",
	);
}

export async function findUserByEmail(email, session = null) {
	const query = Users.findOne({ email }).select(
		"email balance isVerified accountStatus phone profile notificationPreferences createdAt",
	);

	if (session) query.session(session);

	return await query;
}

export async function findUserByEmailWithPassword(email) {
	return await Users.findOne({ email }).select(
		"+passwordHash email phone balance isVerified accountStatus failedLoginAttempts accountLockedUntil refreshTokens profile notificationPreferences",
	);
}

export async function findUserByPhone(phone) {
	return await Users.findOne({ phone }).select(
		"email phone isVerified accountStatus notificationPreferences",
	);
}

/**
 * Find and validate user is ready for operations
 */
export async function findActiveUser(userId, session = null) {
	const user = await findUserById(userId, session);
	return validateUserForOperation(user);
}

export async function checkEmailExists(email) {
	const count = await Users.countDocuments({ email });
	return count > 0;
}

export async function checkPhoneExists(phone) {
	const count = await Users.countDocuments({ phone });
	return count > 0;
}

export async function updateUserBalance(userId, amountInCents, session = null) {
	return await Users.updateOne(
		{ _id: userId },
		{ $inc: { balance: amountInCents } },
		{ session },
	);
}

export async function setUserVerified(userId) {
	return await Users.findByIdAndUpdate(
		userId,
		{ $set: { isVerified: true } },
		{ new: true, runValidators: true },
	);
}

export async function updateNotificationPreferences(userId, preferences) {
	return await Users.findByIdAndUpdate(
		userId,
		{ $set: { notificationPreferences: preferences } },
		{ new: true, runValidators: true },
	).select("email notificationPreferences");
}

export async function incrementFailedLoginAttempts(userId) {
	return await Users.updateOne(
		{ _id: userId },
		{
			$inc: { failedLoginAttempts: 1 },
		},
	);
}

export async function resetUserLoginAttempts(userId) {
	return await Users.updateOne(
		{ _id: userId },
		{
			$set: { failedLoginAttempts: 0 },
			$unset: { accountLockedUntil: 1 },
		},
	);
}

export async function lockUserAccount(userId, lockedUntil) {
	return await Users.updateOne(
		{ _id: userId },
		{ $set: { accountLockedUntil: lockedUntil } },
	);
}

// ==========================================
// USER QUERIES for refresh tokens manegement
// ==========================================
/**
 * Add a new refresh token to user's tokens array
 * keep only the most recent 5 tokens to prevent memory issues and force re-login on old devices
 * @param {string} userId - user's id to update
 * @param {string} token - Refresh token to add
 * @returns {Promise} - Save operation result
 */
export async function addRefreshToken(userId, token) {
	return await Users.findByIdAndUpdate(
		userId,
		{
			$push: {
				refreshTokens: {
					$each: [{ token, createdAt: new Date() }],
					$sort: { createdAt: -1 },
					$slice: AUTH.MAX_REFRESH_TOKENS, // Keep only the most recent 5 tokens
				},
			},
		},
		{ new: true },
	);
}

/**
 * Remove a specific refresh token from user
 * @param {string} userId - user's id to remove token from.
 * @param {string} token - Token to remove
 * @returns {Promise} - Update operation result
 */
export async function removeRefreshToken(userId, token) {
	return await Users.updateOne(
		{ _id: userId },
		{ $pull: { refreshTokens: { token } } },
	);
}

/**
 * Remove all refresh tokens (logout from all devices)
 * @param {string} userId - user's id to remove all tokens from.
 * @returns {Promise} - Update operation result
 */
export async function removeAllRefreshTokens(userId) {
	return await Users.updateOne(
		{ _id: userId },
		{ $set: { refreshTokens: [] } },
	);
}

/**
 * Clean up old refresh tokens (run periodically via cron job)
 *
 * @returns {Promise} - Update operation result
 */
export async function deleteStaleRefreshTokens() {
	const cutoff = new Date(
		Date.now() - AUTH.REFRESH_TOKEN_CLEANUP_DAYS * 24 * 60 * 60 * 1000,
	);
	return await Users.updateMany(
		{ "refreshTokens.createdAt": { $lt: cutoff } },
		{ $pull: { refreshTokens: { createdAt: { $lt: cutoff } } } },
	);
}

// ==========================================
// TRANSACTION QUERIES
// ==========================================
export async function createTransactionPair(
	fromUserId,
	toUserId,
	amountInCents,
	reference,
	session,
) {
	return await Transactions.create(
		[
			{
				userId: fromUserId,
				peerUserId: toUserId,
				amount: amountInCents,
				direction: "T_OUT",
				reference,
			},
			{
				userId: toUserId,
				peerUserId: fromUserId,
				amount: amountInCents,
				direction: "T_IN",
				reference,
			},
		],
		{ session, ordered: true },
	);
}

export async function findTransactionsByUser(userId, options = {}) {
	const {
		page = 1,
		limit = 20,
		direction = null,
		startDate = null,
		endDate = null,
	} = options;

	const query = { userId };

	if (direction) query.direction = direction;

	if (startDate || endDate) {
		query.createdAt = {};
		if (startDate) query.createdAt.$gte = new Date(startDate);
		if (endDate) query.createdAt.$lte = new Date(endDate);
	}

	const skip = (page - 1) * limit;

	const [transactions, total] = await Promise.all([
		Transactions.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate("peerUserId", "email profile.firstName profile.lastName")
			.lean(),
		Transactions.countDocuments(query),
	]);

	return {
		transactions,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			hasMore: skip + transactions.length < total, // what ois this and the 2 below
			hasNextPage: page * limit < total,
			hasPreviousPage: page > 1,
		},
	};
}

export async function findRecentTransactions(userId, limit = 10) {
	return await Transactions.find({ userId })
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate("peerUserId", "email profile.firstName profile.lastName")
		.lean();
}

export async function findTransactionByReference(reference) {
	return await Transactions.find({ reference })
		.populate("userId", "email")
		.populate("peerUserId", "email profile.firstName profile.lastName")
		.lean();
}

export async function getTransactionStats(userId) {
	const userObjectId = new mongoose.Types.ObjectId(userId);

	return await Transactions.aggregate([
		{ $match: { userId: userObjectId } },
		{
			$group: {
				_id: "$direction",
				count: { $sum: 1 },
				totalAmount: { $sum: "$amount" },
			},
		},
	]);
}

// ==========================================
// VERIFICATION QUERIES
// ==========================================
export async function insertOTP(userId, type, hashedOTP, expiresAt) {
	return await Verifications.create({ userId, type, hashedOTP, expiresAt });
}

export async function deleteExistingOTPs(userId, type) {
	return await Verifications.deleteMany({ userId, type, isUsed: false });
}

// find latest valid OTP of a user.
export async function findValidOTP(userId, type) {
	return Verifications.findOne({
		userId,
		type,
		isUsed: false,
		expiresAt: { $gt: new Date() },
	}).sort({ createdAt: -1 }); // Get the most recent one
}

// mark as OTP as used
export async function markOTPAsUsed(otpId) {
	return await Verifications.findByIdAndUpdate(otpId, {
		$set: { isUsed: true, verifiedAt: new Date() },
	});
}

// increment attempts
export async function incrementAttempts(otpId) {
	return await Verifications.findByIdAndUpdate(otpId, {
		$inc: { attempts: 1 },
	});
}

export async function deleteExpiredOTP() {
	const result = await Verifications.deleteMany({
		expiresAt: { $lt: new Date() },
	});

	return result.deletedCount;
}
// ==========================================
// HELPER FUNCTIONS
// ==========================================
export function buildPaginationParams(query) {
	const page = Math.max(1, parseInt(query.page) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));

	return { page, limit };
}
