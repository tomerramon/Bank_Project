import bcrypt from "bcryptjs";
import Verifications from "../models/verification.model.js";
import { AUTH, VERIFICATION } from "../config/constants.config.js";
import { OTPLimitError } from "../utils/errors.util.js";

/**
 * Generate a random OTP code
 *
 * @returns {string} - 6-digit OTP code
 */
function generateOTPCode() {
	// Generate random 6-digit number
	const otp = Math.floor(100000 + Math.random() * 900000).toString();
	return otp;
}

/**
 * Generate and store OTP for user
 *
 * @param {string} userId - User's ID
 * @param {string} type - Verification type (EMAIL_VERIFICATION, etc.)
 * @param {number} expirationMinutes - OTP expiration time (default: 10 min)
 * @returns {Promise<string>} - The generated OTP (to send to user)
 */
export async function generateOTP(
	userId,
	type = "EMAIL_VERIFICATION",
	expirationMinutes = 10,
) {
	// Validate type
	const validTypes = [
		"EMAIL_VERIFICATION",
		"SMS_VERIFICATION",
		"PASSWORD_RESET",
		"TWO_FACTOR",
	];
	if (!validTypes.includes(type)) {
		throw new Error(
			`Invalid verification type. Must be one of: ${validTypes.join(", ")}`,
		);
	}

	// Generate OTP code
	const otpCode = generateOTPCode();

	// Hash OTP before storing (security best practice)
	const hashedOTP = await bcrypt.hash(otpCode, AUTH.BCRYPT_SALT_ROUNDS);

	// Store in database using model static method
	await Verifications.createOTP(userId, type, hashedOTP, expirationMinutes);

	console.log(`✅ OTP generated for user ${userId}: ${otpCode}`);

	// Return plain OTP to send to user
	return otpCode;
}

/**
 * Verify OTP code
 *
 * @param {string} userId - User's ID
 * @param {string} otpCode - OTP code provided by user
 * @param {string} type - Verification type
 * @returns {Promise<boolean>} - true if OTP is valid
 */
export async function verifyOTP(userId, otpCode, type = "EMAIL_VERIFICATION") {
	// Find valid OTP for this user and type
	const verification = await Verifications.findValidOTP(userId, type);

	if (!verification) {
		console.log(`❌ No valid OTP found for user ${userId}`);
		return false;
	}

	// Check if max attempts reached
	if (verification.hasReachedMaxAttempts()) {
		console.log(`❌ Max OTP attempts reached for user ${userId}`);
		return false;
	}

	// Verify OTP using bcrypt compare
	const isMatch = await bcrypt.compare(otpCode, verification.hashedOTP);

	if (!isMatch) {
		// Increment failed attempts
		await verification.incrementAttempts();
		console.log(
			`❌ Invalid OTP for user ${userId}. Attempts: ${verification.attempts + 1}/5`,
		);
		return false;
	}

	// Mark OTP as used
	await verification.markAsUsed();
	console.log(`✅ OTP verified successfully for user ${userId}`);

	return true;
}

/**
 * Check if user can request a new OTP (rate limiting)
 * Prevents spam by limiting OTP requests
 *
 * @param {string} userId - User's ID
 * @param {string} type - Verification type
 * @returns {Promise<boolean>} - true if user can request OTP
 */
export async function canRequestOTP(userId, type = "EMAIL_VERIFICATION") {
	const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

	// Count OTP requests in last 10 minutes
	const recentRequests = await Verifications.countDocuments({
		userId,
		type,
		createdAt: { $gte: tenMinutesAgo },
	});

	// Max 3 requests per 10 minutes
	if (recentRequests >= VERIFICATION.OTP_REQUEST_LIMIT_10MIN) {
		console.log(`⚠️ User ${userId} exceeded 10-min OTP limit`);
		return false;
	}

	// Count OTP requests in last hour
	const hourlyRequests = await Verifications.countDocuments({
		userId,
		type,
		createdAt: { $gte: oneHourAgo },
	});

	// Max 10 requests per hour
	if (hourlyRequests >= VERIFICATION.OTP_REQUEST_LIMIT_1HOUR) {
		console.log(`⚠️ User ${userId} exceeded 1-hour OTP limit`);
		return false;
	}

	return true;
}

/**
 * Check if OTP exists and is still valid
 * Useful for checking before resending
 *
 * @param {string} userId - User's ID
 * @param {string} type - Verification type
 * @returns {Promise<Object|null>} - Verification document or null
 */
export async function getValidOTP(userId, type = "EMAIL_VERIFICATION") {
	return await Verifications.findValidOTP(userId, type);
}

/**
 * Invalidate all OTPs for a user (security measure)
 * Useful when password is changed or account is compromised
 *
 * @param {string} userId - User's ID
 * @returns {Promise<number>} - Number of OTPs invalidated
 */
export async function invalidateAllOTPs(userId) {
	const result = await Verifications.updateMany(
		{ userId, isUsed: false },
		{ $set: { isUsed: true } },
	);

	console.log(
		`🔒 Invalidated ${result.modifiedCount} OTPs for user ${userId}`,
	);
	return result.modifiedCount;
}

/**
 * Cleanup old OTP records (run periodically via cron)
 * Removes used OTPs older than 3 days
 *
 * @returns {Promise<number>} - Number of OTPs deleted
 */
export async function cleanupOldOTPs() {
	const count = await Verifications.cleanupOldVerifications();
	console.log(`🧹 Cleaned up ${count} old OTP records`);
	return count;
}

/**
 * Get OTP statistics for monitoring
 * Useful for detecting abuse or system issues
 *
 * @param {string} userId - User's ID (optional)
 * @returns {Promise<Object>} - OTP statistics
 */
export async function getOTPStats(userId = null) {
	const match = userId ? { userId } : {};

	const stats = await Verifications.aggregate([
		{ $match: match },
		{
			$group: {
				_id: {
					type: "$type",
					isUsed: "$isUsed",
				},
				count: { $sum: 1 },
				avgAttempts: { $avg: "$attempts" },
			},
		},
	]);

	return stats;
}
