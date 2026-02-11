/**
 * Rate Limiting Middleware
 *  *
 * Protects against brute force attacks and API abuse.
 * Uses in-memory store ( For production, use express-rate-limit with Redis ).
 */

/**
 * HOW TO USE:
 *
 * In auth.route.js:
 * import { authRateLimit } from '../middlewares/rateLimit.middleware.js';
 * router.post('/login', authRateLimit, loginController);
 * router.post('/signup', authRateLimit, signupController);
 *
 * In transaction.route.js:
 * import { transactionRateLimit } from '../middlewares/rateLimit.middleware.js';
 * router.post('/transfer', transactionRateLimit, transferController);
 *
 * In app.js (for general API protection):
 * import { generalRateLimit } from './middlewares/rateLimit.middleware.js';
 * app.use(generalRateLimit);
 */

import { RATE_LIMIT } from "../config/constants.config.js";

/**
 * Simple in-memory rate limiter
 * For production, use express-rate-limit with Redis
 */
class RateLimiter {
	constructor(windowMs, maxRequests) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
		this.requests = new Map();

		// Cleanup old entries every minute
		setInterval(() => this.cleanup(), 60000);
	}

	/**
	 * Check if IP has exceeded rate limit
	 */
	isRateLimited(ip) {
		const now = Date.now();
		const userRequests = this.requests.get(ip) || [];

		// Remove requests outside the time window
		const validRequests = userRequests.filter(
			(time) => now - time < this.windowMs,
		);

		if (validRequests.length >= this.maxRequests) {
			return true;
		}

		// Add current request
		validRequests.push(now);
		this.requests.set(ip, validRequests);

		return false;
	}

	/**
	 * Clean up old entries
	 */
	cleanup() {
		const now = Date.now();
		for (const [ip, requests] of this.requests.entries()) {
			const validRequests = requests.filter(
				(time) => now - time < this.windowMs,
			);
			if (validRequests.length === 0) {
				this.requests.delete(ip);
			} else {
				this.requests.set(ip, validRequests);
			}
		}
	}
}

// Create rate limiters for different endpoints
const generalLimiter = new RateLimiter(
	RATE_LIMIT.GENERAL_WINDOW_MS,
	RATE_LIMIT.GENERAL_MAX_REQUESTS,
);

const authLimiter = new RateLimiter(
	RATE_LIMIT.AUTH_WINDOW_MS,
	RATE_LIMIT.AUTH_MAX_REQUESTS,
);

const transactionLimiter = new RateLimiter(
	RATE_LIMIT.TRANSACTION_WINDOW_MS,
	RATE_LIMIT.TRANSACTION_MAX_REQUESTS,
);

/**
 * General API rate limiting middleware
 * 100 requests per 15 minutes
 */
export function generalRateLimit(req, res, next) {
	const ip = req.ip || req.connection.remoteAddress;

	if (generalLimiter.isRateLimited(ip)) {
		return res.status(429).json({
			success: false,
			message: "Too many requests. Please try again later.",
			retryAfter: Math.ceil(RATE_LIMIT.GENERAL_WINDOW_MS / 1000),
		});
	}

	next();
}

/**
 * Auth endpoint rate limiting middleware
 * 5 requests per 15 minutes
 *
 * Apply to: login, signup, password reset
 */
export function authRateLimit(req, res, next) {
	const ip = req.ip || req.connection.remoteAddress;

	if (authLimiter.isRateLimited(ip)) {
		return res.status(429).json({
			success: false,
			message:
				"Too many authentication attempts. Please try again in 15 minutes.",
			retryAfter: Math.ceil(RATE_LIMIT.AUTH_WINDOW_MS / 1000),
		});
	}

	next();
}

/**
 * Transaction rate limiting middleware
 * 10 requests per minute
 *
 * Apply to: money transfer endpoint
 */
export function transactionRateLimit(req, res, next) {
	const ip = req.ip || req.connection.remoteAddress;

	if (transactionLimiter.isRateLimited(ip)) {
		return res.status(429).json({
			success: false,
			message: "Too many transaction requests. Please wait a moment.",
			retryAfter: Math.ceil(RATE_LIMIT.TRANSACTION_WINDOW_MS / 1000),
		});
	}

	next();
}

export default {
	generalRateLimit,
	authRateLimit,
	transactionRateLimit,
};
