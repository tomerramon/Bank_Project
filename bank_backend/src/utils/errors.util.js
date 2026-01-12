/**
 * Custom Error Classes
 *
 */

import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants.config.js";

/**
 * Base Application Error
 * All custom errors extend from this class
 */
export class AppError extends Error {
    constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true; // Flag for operational errors vs programming errors
        
        Error.captureStackTrace(this, this.constructor);
    }
    
    toJSON() {
        return {
            success: false,
            error: {
                name: this.name,
                message: this.message,
                ...(this.details && { details: this.details })
            }
        };
    }
}


// ==========================================
// AUTHENTICATION ERRORS (401)
// ==========================================

/**
 * Thrown when authentication fails
 */
export class AuthenticationError extends AppError {
    constructor(message = ERROR_MESSAGES.INVALID_CREDENTIALS) {
        super(message, HTTP_STATUS.UNAUTHORIZED);
    }
}

/**
 * Thrown when token is invalid or expired
 */
export class InvalidTokenError extends AppError {
    constructor(message = 'Invalid or expired token') {
        super(message, HTTP_STATUS.UNAUTHORIZED);
    }
}

/**
 * Thrown when user account is not verified
 */
export class UnverifiedAccountError extends AppError {
    constructor(message = ERROR_MESSAGES.ACCOUNT_NOT_VERIFIED) {
        super(message, HTTP_STATUS.UNAUTHORIZED);
    }
}

/**
 * Thrown when account is locked due to failed attempts
 */
export class AccountLockedError extends AppError {
    constructor(lockTimeRemaining) {
        const message = `${ERROR_MESSAGES.ACCOUNT_LOCKED}. Try again in ${lockTimeRemaining} minutes.`;
        super(message, HTTP_STATUS.UNAUTHORIZED);
        this.lockTimeRemaining = lockTimeRemaining;
    }
}

// ==========================================
// FORBIDDEN ERRORS (403)
// ==========================================

/**
 * Thrown when user doesn't have permission
 */
export class ForbiddenError extends AppError {
    constructor(message = ERROR_MESSAGES.UNAUTHORIZED_ACCESS) {
        super(message, HTTP_STATUS.FORBIDDEN);
    }
}

/**
 * Thrown when account is not active (suspended/closed)
 */
export class InactiveAccountError extends AppError {
    constructor(message = ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE) {
        super(message, HTTP_STATUS.FORBIDDEN);
    }
}

// ==========================================
// VALIDATION / BAD REQUEST ERRORS (400)
// ==========================================

/**
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
    constructor(errors) {
        const message = Array.isArray(errors) 
            ? ERROR_MESSAGES.VALIDATION_FAILED
            : errors;
        
        super(message, HTTP_STATUS.BAD_REQUEST, Array.isArray(errors) ? errors : null);
        this.errors = Array.isArray(errors) ? errors : [errors];
    }
}

/**
 * Thrown when required field is missing
 */
export class MissingFieldError extends ValidationError {
    constructor(fieldName) {
        super(`${fieldName} is required`);
        this.field = fieldName;
    }
}

/**
 * Thrown when field format is invalid
 */
export class InvalidFormatError extends ValidationError {
    constructor(fieldName, expectedFormat) {
        super(`Invalid ${fieldName} format${expectedFormat ? `: ${expectedFormat}` : ''}`);
        this.field = fieldName;
    }
}


// ==========================================
// RESOURCE ERRORS (404)
// ==========================================

/**
 * Thrown when requested resource is not found
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, HTTP_STATUS.NOT_FOUND);
        this.resource = resource;
    }
}

/**
 * Thrown when user is not found
 */
export class UserNotFoundError extends NotFoundError {
    constructor(identifier = '') {
        super('User');
        this.message = identifier 
            ? `User with ${identifier} not found`
            : ERROR_MESSAGES.USER_NOT_FOUND;
    }
}


// ==========================================
// CONFLICT ERRORS (409)
// ==========================================

/**
 * Thrown when resource already exists
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, HTTP_STATUS.CONFLICT);
    }
}

/**
 * Thrown when email already registered
 */
export class EmailExistsError extends ConflictError {
    constructor() {
        super(ERROR_MESSAGES.USER_ALREADY_EXISTS);
        this.field = 'email';
    }
}

/**
 * Thrown when phone already registered
 */
export class PhoneExistsError extends ConflictError {
    constructor() {
        super(ERROR_MESSAGES.PHONE_ALREADY_EXISTS);
        this.field = 'phone';
    }
}


// ==========================================
// BUSINESS LOGIC ERRORS (400)
// ==========================================

/**
 * Thrown when business rule is violated
 */
export class BusinessRuleError extends AppError {
    constructor(message) {
        super(message, HTTP_STATUS.BAD_REQUEST);
    }
}

/**
 * Thrown when insufficient funds for transaction
 */
export class InsufficientFundsError extends BusinessRuleError {
    constructor(balance, required) {
        const message = `${ERROR_MESSAGES.INSUFFICIENT_FUNDS}. Balance: $${balance}, Required: $${required}`;
        super(message);
        this.balance = balance;
        this.required = required;
    }
}

/**
 * Thrown when trying to transfer to same account
 */
export class SelfTransferError extends BusinessRuleError {
    constructor() {
        super(ERROR_MESSAGES.SELF_TRANSFER);
    }
}

/**
 * Thrown when transaction amount is invalid
 */
export class InvalidAmountError extends BusinessRuleError {
    constructor(amount, reason = '') {
        super(`${ERROR_MESSAGES.INVALID_AMOUNT}: ${amount}${reason ? ` (${reason})` : ''}`);
        this.amount = amount;
    }
}


// ==========================================
// RATE LIMIT ERRORS (429)
// ==========================================

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = null) {
        super(message, 429); // 429 Too Many Requests
        this.retryAfter = retryAfter;
    }
}

/**
 * Thrown when OTP request limit exceeded
 */
export class OTPLimitError extends RateLimitError {
    constructor(waitMinutes) {
        super(`Too many OTP requests. Please wait ${waitMinutes} minutes.`);
        this.waitMinutes = waitMinutes;
    }
}



// ==========================================
// SERVER ERRORS (500)
// ==========================================

/**
 * Thrown when database operation fails
 */
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}

/**
 * Thrown when external service fails
 */
export class ExternalServiceError extends AppError {
    constructor(serviceName, message = 'External service error') {
        super(`${serviceName}: ${message}`, HTTP_STATUS.SERVICE_UNAVAILABLE);
        this.serviceName = serviceName;
    }
}


// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if error is operational (expected) or programming error (bug)
 * 
 * @param {Error} error - Error to check
 * @returns {boolean} - true if operational error
 */
export function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Format error for logging
 * 
 * @param {Error} error - Error to format
 * @returns {Object} - Formatted error object
 */
export function formatErrorForLogging(error) {
    return {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        ...(error.details && { details: error.details }),
        timestamp: new Date().toISOString()
    };
}

/**
 * Convert error to HTTP response format
 * 
 * @param {Error} error - Error to convert
 * @param {boolean} includeStack - Include stack trace (dev only)
 * @returns {Object} - Response object
 */
export function errorToResponse(error, includeStack = false) {
    if (error instanceof AppError) {
        return {
            success: false,
            error: {
                message: error.message,
                ...(error.details && { details: error.details }),
                ...(includeStack && { stack: error.stack })
            }
        };
    }
    
    // Generic error
    return {
        success: false,
        error: {
            message: includeStack ? error.message : ERROR_MESSAGES.INTERNAL_ERROR,
            ...(includeStack && { stack: error.stack })
        }
    };
}

/**
 * Get HTTP status code from error
 * 
 * @param {Error} error - Error object
 * @returns {number} - HTTP status code
 */
export function getStatusCode(error) {
    if (error instanceof AppError) {
        return error.statusCode;
    }
    
    // Mongoose errors
    if (error.name === 'ValidationError') {
        return HTTP_STATUS.BAD_REQUEST;
    }
    if (error.name === 'CastError') {
        return HTTP_STATUS.BAD_REQUEST;
    }
    if (error.code === 11000) {
        return HTTP_STATUS.CONFLICT;
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return HTTP_STATUS.UNAUTHORIZED;
    }
    
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

// Export all error classes
export default {
    AppError,
    AuthenticationError,
    InvalidTokenError,
    UnverifiedAccountError,
    AccountLockedError,
    ForbiddenError,
    InactiveAccountError,
    ValidationError,
    MissingFieldError,
    InvalidFormatError,
    NotFoundError,
    UserNotFoundError,
    ConflictError,
    EmailExistsError,
    PhoneExistsError,
    BusinessRuleError,
    InsufficientFundsError,
    SelfTransferError,
    InvalidAmountError,
    RateLimitError,
    OTPLimitError,
    DatabaseError,
    ExternalServiceError,
    
    // Helper functions
    isOperationalError,
    formatErrorForLogging,
    errorToResponse,
    getStatusCode
};