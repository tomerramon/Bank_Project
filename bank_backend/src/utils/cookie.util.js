/**
 * Cookie Utilities
 *
 * Centralizes all cookie operations.
 *
 */

/**
 * Set refresh token as HTTP-only cookie
 * More secure than localStorage
 *
 * @param {Response} res - Express response object
 * @param {string} refreshToken - JWT refresh token
 */
export function setRefreshTokenCookie(res, refreshToken) {
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
}

/**
 * Clear refresh token cookie
 *
 * @param {Response} res - Express response object
 */
export function clearRefreshTokenCookie(res) {
	res.clearCookie("refreshToken");
}
