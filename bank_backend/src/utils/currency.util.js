/**
 * Currency Utilities - FIXED VERSION
 *
 * Centralized currency conversion between dollars and cents.
 *
 * IMPORTANT: Only use these functions in SERVICE layer.
 * DO NOT use getters/setters in models to avoid double conversion.
 *
 * Why use cents internally?
 * - Avoids JavaScript floating-point precision errors
 * - Example: 0.1 + 0.2 = 0.30000000000000004 (wrong!)
 * - With cents: 10 + 20 = 30 (correct!)
 */

import { CURRENCY } from "../config/constants.config.js";

/**
 * Convert cents to dollars
 *
 * @param {number} cents - Amount in cents
 * @returns {number} - Amount in dollars with 2 decimal places
 * @throws {TypeError} - If cents is not a valid number
 */
export function centsToDollars(cents) {
	if (
		typeof cents !== "number" ||
		Number.isNaN(cents) ||
		!Number.isFinite(cents)
	) {
		throw new TypeError(`Cents must be a finite number, got: ${cents}`);
	}

	return Number((cents / 100).toFixed(CURRENCY.DECIMAL_PLACES));
}

/**
 * Convert dollars to cents
 *
 * @param {number} dollars - Amount in dollars
 * @returns {number} - Amount in cents (integer)
 * @throws {TypeError} - If dollars is not a valid number
 */
export function dollarsToCents(dollars) {
	if (
		typeof dollars !== "number" ||
		Number.isNaN(dollars) ||
		!Number.isFinite(dollars)
	) {
		throw new TypeError(`Dollars must be a finite number, got: ${dollars}`);
	}

	return Math.round(dollars * 100); // Changed from Math.floor to Math.round for accuracy
}
