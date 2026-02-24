import Users from "../models/user.model.js";
import { addRefreshToken, removeRefreshToken } from "../utils/query.util.js";
import {
	verifyRefreshToken,
	generateAccessToken,
	generateRefreshToken,
} from "./jwt.service.js";

/**
 * Update refresh token (token rotation)
 * @param {string} oldRefreshToken - Current refresh token
 * @returns {Promise<Object>} - New access and refresh tokens
 */
export async function updateRefreshToken(oldRefreshToken) {
	// Step 1: Verify the token
	let payload;
	try {
		payload = verifyRefreshToken(oldRefreshToken);
	} catch (error) {
		throw new Error(`Invalid refresh token: ${error.message}`);
	}

	// Step 2: Find user
	const user = await Users.findById(payload.id);
	if (!user) {
		throw new Error("User not found");
	}

	// Step 3: Check if this refresh token exists in user's tokens
	const tokenExists = user.refreshTokens.some(
		(rt) => rt.token === oldRefreshToken,
	);

	if (!tokenExists) {
		// Potential security breach: token reuse detected!
		// Invalidate ALL refresh tokens for this user
		user.refreshTokens = [];
		await user.save();

		throw new Error(
			"Refresh token reuse detected. " +
				"All sessions have been invalidated. Please log in again.",
		);
	}

	// Step 4: Check account status
	if (user.accountStatus !== "active") {
		throw new Error("Account is not active");
	}

	// Step 5: Remove old refresh token
	user.refreshTokens = user.refreshTokens.filter(
		(rt) => rt.token !== oldRefreshToken,
	);

	// Step 6: Generate new tokens
	const newAccessToken = generateAccessToken(user);
	const newRefreshToken = generateRefreshToken(user);

	// Step 7: Store new refresh token
	await addRefreshToken(user._id, newRefreshToken);

	await user.save();

	return {
		token: newAccessToken,
		refreshToken: newRefreshToken,
	};
}

/**
 * Invalidate a specific refresh token
 * @param {string} refreshToken
 * @returns {Promise<boolean>}
 */
export async function invalidateRefreshToken(refreshToken) {
	try {
		const payload = verifyRefreshToken(refreshToken);
		const user = await Users.findById(payload.id);

		if (user) {
			await removeRefreshToken(user._id, refreshToken);
		}

		return true;
	} catch (error) {
		// Token is invalid anyway, so consider it invalidated
		return true;
	}
}

/**
 * Invalidate all refresh tokens for a user (logout from all devices)
 * @param {string} userId
 * @returns {Promise<number>} - Number of tokens invalidated
 */
export async function invalidateAllRefreshTokens(userId) {
	const user = await Users.findById(userId);

	if (!user) {
		throw new Error("User not found");
	}

	const count = user.refreshTokens.length;
	user.refreshTokens = [];
	await user.save();

	return count;
}
