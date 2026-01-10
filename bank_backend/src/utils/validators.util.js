/**
 * Input Validation Utilities
 * 
 * Centralizes all input validation logic.
 * Benefits:
 * - Single source of truth for validation rules
 * - Consistent error messages
 * - Easy to modify validation rules
 * - Reusable across the application
 */

import {
    ValidationError,
    InvalidFormatError,
    InvalidAmountError
} from './errors.util.js';
import { VALIDATION, AUTH, CURRENCY } from '../config/constants.config.js';

// ==========================================
// EMAIL VALIDATION
// ==========================================

/**
 * Validate email format
 * 
 * @param {string} email - Email to validate
 * @throws {InvalidFormatError}
 * @returns {boolean} - true if valid
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new InvalidFormatError('email');
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
        throw new InvalidFormatError('email', 'user@example.com');
    }
    
    if (email.length > VALIDATION.EMAIL_MAX_LENGTH) {
        throw new ValidationError(`Email must be less than ${VALIDATION.EMAIL_MAX_LENGTH} characters`);
    }
    
    return true;
}

// ==========================================
// PASSWORD VALIDATION
// ==========================================

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password - Password to validate
 * @throws {ValidationError}
 * @returns {boolean} - true if valid
 */
export function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        throw new ValidationError('Password is required');
    }
    
    const errors = [];
    
    if (password.length < AUTH.PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters long`);
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    if (errors.length > 0) {
        throw new ValidationError(errors);
    }
    
    return true;
}

// ==========================================
// PHONE VALIDATION
// ==========================================

/**
 * Validate phone number format
 * Accepts international format with optional + prefix
 * 
 * @param {string} phone - Phone number to validate
 * @throws {InvalidFormatError}
 * @returns {boolean} - true if valid
 */
export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        throw new InvalidFormatError('phone');
    }
    
    if (!VALIDATION.PHONE_REGEX.test(phone)) {
        throw new InvalidFormatError(
            'phone',
            '9-15 digits, optionally starting with +'
        );
    }
    
    return true;
}

// ==========================================
// AMOUNT VALIDATION
// ==========================================

/**
 * Validate transaction amount
 * Checks if amount is within allowed range
 * 
 * @param {number} amount - Amount in dollars
 * @throws {InvalidAmountError}
 * @returns {boolean} - true if valid
 */
export function validateTransferAmount(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new InvalidAmountError(amount, 'must be a number');
    }
    
    if (amount <= 0) {
        throw new InvalidAmountError(amount, 'must be greater than zero');
    }
    
    if (amount < CURRENCY.MIN_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `minimum is $${CURRENCY.MIN_TRANSFER_AMOUNT}`
        );
    }
    
    if (amount > CURRENCY.MAX_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `maximum is $${CURRENCY.MAX_TRANSFER_AMOUNT}`
        );
    }
    
    return true;
}

// ==========================================
// NAME VALIDATION
// ==========================================

/**
 * Validate name (first name, last name)
 * 
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError}
 * @returns {boolean} - true if valid
 */
export function validateName(name, fieldName = 'name') {
    if (!name || typeof name !== 'string') {
        throw new ValidationError(`${fieldName} is required`);
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length < VALIDATION.NAME_MIN_LENGTH) {
        throw new ValidationError(
            `${fieldName} must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`
        );
    }
    
    if (trimmed.length > VALIDATION.NAME_MAX_LENGTH) {
        throw new ValidationError(
            `${fieldName} must be less than ${VALIDATION.NAME_MAX_LENGTH} characters`
        );
    }
    
    // Only letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
        throw new ValidationError(
            `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
        );
    }
    
    return true;
}

// ==========================================
// ID VALIDATION
// ==========================================

/**
 * Validate MongoDB ObjectId format
 * 
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError}
 * @returns {boolean} - true if valid
 */
export function validateObjectId(id, fieldName = 'ID') {
    if (!id || typeof id !== 'string') {
        throw new ValidationError(`${fieldName} is required`);
    }
    
    // MongoDB ObjectId is 24 hex characters
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new ValidationError(`Invalid ${fieldName} format`);
    }
    
    return true;
}

// ==========================================
// OTP VALIDATION
// ==========================================

/**
 * Validate OTP code
 * 
 * @param {string} otp - OTP code to validate
 * @throws {ValidationError}
 * @returns {boolean} - true if valid
 */
export function validateOTP(otp) {
    if (!otp || typeof otp !== 'string') {
        throw new ValidationError('OTP is required');
    }
    
    const otpRegex = new RegExp(`^\\d{${VERIFICATION.OTP_LENGTH}}$`);
    
    if (!otpRegex.test(otp)) {
        throw new ValidationError(
            `OTP must be ${VERIFICATION.OTP_LENGTH} digits`
        );
    }
    
    return true;
}

// ==========================================
// PAGINATION VALIDATION
// ==========================================

/**
 * Validate and sanitize pagination parameters
 * 
 * @param {Object} params - Pagination params {page, limit}
 * @returns {Object} - Sanitized params
 */
export function validatePaginationParams(params) {
    const { page, limit } = params;
    
    const sanitized = {
        page: Math.max(1, parseInt(page) || 1),
        limit: Math.max(1, Math.min(100, parseInt(limit) || 20))
    };
    
    return sanitized;
}

// ==========================================
// DATE VALIDATION
// ==========================================

/**
 * Validate date string
 * 
 * @param {string} dateString - Date string to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError}
 * @returns {Date} - Validated Date object
 */
export function validateDate(dateString, fieldName = 'date') {
    if (!dateString) {
        throw new ValidationError(`${fieldName} is required`);
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        throw new ValidationError(`Invalid ${fieldName} format`);
    }
    
    return date;
}

// ==========================================
// COMPOSITE VALIDATORS
// ==========================================

/**
 * Validate signup inputs
 * Validates all required fields for user registration
 * 
 * @param {Object} data - Signup data {email, password, phone}
 * @throws {ValidationError}
 * @returns {boolean} - true if all valid
 */
export function validateSignupInputs(data) {
    const { email, password, phone } = data;
    
    validateEmail(email);
    validatePassword(password);
    validatePhone(phone);
    
    return true;
}

/**
 * Validate login inputs
 * 
 * @param {Object} data - Login data {email, password}
 * @throws {ValidationError}
 * @returns {boolean} - true if all valid
 */
export function validateLoginInputs(data) {
    const { email, password } = data;
    
    if (!email) {
        throw new ValidationError('Email is required');
    }
    
    if (!password) {
        throw new ValidationError('Password is required');
    }
    
    validateEmail(email);
    validatePassword(password);
    
    return true;
}

/**
 * Validate transfer inputs
 * 
 * @param {Object} data - Transfer data {toEmail, amount}
 * @throws {ValidationError}
 * @returns {boolean} - true if all valid
 */
export function validateTransferInputs(data) {
    const { toEmail, amount } = data;
    
    if (!toEmail) {
        throw new ValidationError('Receiver email is required');
    }
    
    if (!amount) {
        throw new ValidationError('Amount is required');
    }
    
    validateEmail(toEmail);
    validateTransferAmount(amount);
    
    return true;
}

/**
 * Validate profile update inputs
 * 
 * @param {Object} data - Profile data {firstName, lastName, address}
 * @throws {ValidationError}
 * @returns {boolean} - true if all valid
 */
export function validateProfileInputs(data) {
    const { firstName, lastName } = data;
    
    if (firstName) {
        validateName(firstName, 'first name');
    }
    
    if (lastName) {
        validateName(lastName, 'last name');
    }
    
    return true;
}

// Export all validators
export default {
    validateEmail,
    validatePassword,
    validatePhone,
    validateTransferAmount,
    validateName,
    validateObjectId,
    validateOTP,
    validatePaginationParams,
    validateDate,
    validateSignupInputs,
    validateLoginInputs,
    validateTransferInputs,
    validateProfileInputs
};