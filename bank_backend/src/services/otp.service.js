import bcrypt from "bcryptjs";
import Verifications from "../models/verification.model.js";
import { AUTH, VERIFICATION } from "../config/constants.config.js";
import {
	deleteExistingOTPs,
	findValidOTP,
	getOTPStatsQuery,
	incrementAttempts,
	insertOTP,
	markOTPAsUsed,
} from "../utils/query.util.js";
import { OTPLimitError, ValidationError } from "../utils/errors.util.js";

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

// create new OTP
async function createOTP(userId, type, otpHash, expirationMinutes = 10) {
	await deleteExistingOTPs(userId, type);
	const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
	await insertOTP(userId, type, otpHash, expiresAt);
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
	type = VERIFICATION.TYPES.EMAIL_VERIFICATION,
	expirationMinutes = VERIFICATION.OTP_EXPIRY_MINUTES,
) {
	// Validate type
	const validTypes = [
		VERIFICATION.TYPES.EMAIL_VERIFICATION,
		VERIFICATION.TYPES.SMS_VERIFICATION,
		VERIFICATION.TYPES.PASSWORD_RESET,
		VERIFICATION.TYPES.TWO_FACTOR,
	];
	if (!validTypes.includes(type)) {
		throw new ValidationError(
			`Invalid verification type. Must be one of: ${validTypes.join(", ")}`,
		);
	}

	// Generate OTP code
	const otpCode = generateOTPCode();

	// Hash OTP before storing (security best practice)
	const hashedOTP = await bcrypt.hash(otpCode, AUTH.BCRYPT_SALT_ROUNDS);

	// create new OTP and store it in DB.
	await createOTP(userId, type, hashedOTP, expirationMinutes);

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
export async function verifyOTP(
	userId,
	otpCode,
	type = VERIFICATION.TYPES.EMAIL_VERIFICATION,
) {
	// Find valid OTP for this user and type
	const verification = await findValidOTP(userId, type);

	if (!verification) {
		console.log(`❌ No valid OTP found for user ${userId}`);
		return false;
	}

	// Check if max attempts reached
	if (verification.attempts >= VERIFICATION.MAX_OTP_ATTEMPTS) {
		console.log(`❌ Max OTP attempts reached for user ${userId}`);
		return false;
	}

	// Verify OTP using bcrypt compare
	const isMatch = await bcrypt.compare(otpCode, verification.hashedOTP);

	if (!isMatch) {
		// Increment failed attempts
		await incrementAttempts(verification._id);
		console.log(
			`❌ Invalid OTP for user ${userId}. Attempts: ${verification.attempts + 1}/${VERIFICATION.MAX_OTP_ATTEMPTS}`,
		);
		return false;
	}

	// Mark OTP as used
	await markOTPAsUsed(verification._id);
	console.log(`✅ OTP verified successfully for user ${userId}`);

	return true;
}

/**
 * Check if user can request a new OTP (rate limiting)
 * Prevents spam by limiting OTP requests
 *
 * @param {string} userId - User's ID
 * @param {string} type - Verification type
 * @returns {Promise<OTPLimitError|null>} - OTPLimitError if limit exceeded, otherwise null
 */
export async function canRequestOTP(
	userId,
	type = VERIFICATION.TYPES.EMAIL_VERIFICATION,
) {
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
		return new OTPLimitError(10);
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
		return new OTPLimitError(60);
	}

	return null; // explicitly return null when OK
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
 * Get OTP statistics for monitoring
 * Useful for detecting abuse or system issues
 *
 * @param {string} userId - User's ID (optional)
 * @returns {Promise<Object>} - OTP statistics
 */
export async function getOTPStats(userId = null) {
	const stats = getOTPStatsQuery(userId);
	return stats;
}
