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
    if (typeof cents !== 'number' || Number.isNaN(cents) || !Number.isFinite(cents)) {
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
    if (typeof dollars !== 'number' || Number.isNaN(dollars) || !Number.isFinite(dollars)) {
        throw new TypeError(`Dollars must be a finite number, got: ${dollars}`);
    }

    return Math.round(dollars * 100); // Changed from Math.floor to Math.round for accuracy
}

/**
 * Format cents as currency string
 * 
 * @param {number} cents - Amount in cents
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} - Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(cents, currency = '$') {
    const dollars = centsToDollars(cents);
    const sign = dollars > 0 ? '+' : '-';

    return `${sign}${currency}${Math.abs(dollars).toFixed(CURRENCY.DECIMAL_PLACES)}`;
}

/**
 * Format transaction amount with direction sign
 * 
 * @param {number} cents - Amount in cents
 * @param {string} direction - Transaction direction ('T_IN' or 'T_OUT')
 * @returns {string} - Formatted amount with +/- sign (e.g., "+$50.00" or "-$50.00")
 */
export function formatTransactionAmount(cents, direction) {
    const dollars = centsToDollars(cents);
    const sign = direction === 'T_IN' ? '+' : '-';
    return `${sign}$${Math.abs(dollars).toFixed(CURRENCY.DECIMAL_PLACES)}`;
}

/**
 * Validate amount is within transfer limits
 * 
 * @param {number} dollars - Amount in dollars
 * @returns {boolean} - true if valid
 * @throws {Error} - If amount is invalid with specific reason
 */
export function validateTransferAmount(dollars) {
    if (typeof dollars !== 'number' || Number.isNaN(dollars) || !Number.isFinite(dollars)) {
        throw new TypeError('Amount must be a valid number');
    }

    if (dollars <= 0) {
        throw new RangeError('Amount must be greater than zero');
    }

    if (dollars > CURRENCY.MAX_TRANSFER_AMOUNT) {
        throw new RangeError(
            `Maximum transfer amount is $${CURRENCY.MAX_TRANSFER_AMOUNT.toFixed(2)}`
        );
    }

    if (dollars < CURRENCY.MIN_TRANSFER_AMOUNT) {
        throw new RangeError(
            `Minimum transfer amount is $${CURRENCY.MIN_TRANSFER_AMOUNT.toFixed(2)}`
        );
    }

    return true;
}

/**
 * Check if user has sufficient balance
 * 
 * @param {number} userBalanceCents - User's balance in cents
 * @param {number} amountCents - Amount to check in cents
 * @returns {boolean} - true if sufficient balance
 */
export function hasSufficientBalance(userBalanceCents, amountCents) {
    return userBalanceCents >= amountCents;
}

/**
 * Calculate new balance after transaction
 * 
 * @param {number} currentBalance - Current balance in cents
 * @param {number} amount - Transaction amount in cents
 * @param {string} direction - 'T_IN' or 'T_OUT'
 * @returns {number} - New balance in cents
 */
export function calculateNewBalance(currentBalance, amount, direction) {
    if (direction === 'T_IN') {
        return currentBalance + amount;
    } else if (direction === 'T_OUT') {
        return currentBalance - amount;
    } else {
        throw new Error(`Invalid direction: ${direction}. Must be 'T_IN' or 'T_OUT'`);
    }
}

/**
 * Parse currency string to cents
 * Handles various formats: "$50.00", "50", "50.99"
 * 
 * @param {string} currencyString - Currency string
 * @returns {number} - Amount in cents
 * @throws {Error} - If string cannot be parsed
 */
export function parseCurrencyToCents(currencyString) {
    if (typeof currencyString !== 'string') {
        throw new TypeError('Currency string must be a string');
    }

    // Remove currency symbols and spaces
    const cleaned = currencyString.replace(/[$€£¥\s,]/g, '');
    const dollars = parseFloat(cleaned);

    if (isNaN(dollars) || !isFinite(dollars)) {
        throw new Error(`Invalid currency string: ${currencyString}`);
    }

    return dollarsToCents(dollars);
}

/**
 * Round to nearest cent
 * Useful for calculations that might produce fractions
 * 
 * @param {number} cents - Amount in cents (may have decimals)
 * @returns {number} - Rounded amount in cents
 */
export function roundToCents(cents) {
    return Math.round(cents);
}

/**
 * Calculate percentage of amount
 * Useful for fees, interest, etc.
 * 
 * @param {number} amountCents - Amount in cents
 * @param {number} percentage - Percentage (e.g., 2.5 for 2.5%)
 * @returns {number} - Calculated amount in cents (rounded)
 */
export function calculatePercentage(amountCents, percentage) {
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        throw new RangeError('Percentage must be between 0 and 100');
    }

    const result = (amountCents * percentage) / 100;
    return roundToCents(result);
}

/**
 * Compare two amounts (cents are exact integers, so simple comparison)
 * 
 * @param {number} cents1 - First amount in cents
 * @param {number} cents2 - Second amount in cents
 * @returns {boolean} - true if amounts are equal
 */
export function isEqualAmount(cents1, cents2) {
    return cents1 === cents2;
}

// Export all functions as default object for convenience
export default {
    centsToDollars,
    dollarsToCents,
    formatCurrency,
    formatTransactionAmount,
    validateTransferAmount,
    hasSufficientBalance,
    calculateNewBalance,
    parseCurrencyToCents,
    roundToCents,
    calculatePercentage,
    isEqualAmount
};