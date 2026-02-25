/**
 * Application Constants
 *
 * Centralized configuration values used across the application.
 */

// ==========================================
// CURRENCY
// ==========================================

export const CURRENCY = {
	// Balance limits
	MIN_BALANCE: 0, // $0.00
	INITIAL_BALANCE_MIN: 1000, // $10.00 in cents
	INITIAL_BALANCE_MAX: 10000, // $100.00 in cents

	// Transaction limits
	MIN_TRANSFER_AMOUNT: 0.01, // $0.01
	MAX_TRANSFER_AMOUNT: 10000, // $10,000.00

	// Decimal places
	DECIMAL_PLACES: 2,
};

// ==========================================
// AUTHENTICATION
// ==========================================

export const AUTH = {
	// JWT expiration
	ACCESS_TOKEN_EXPIRY: "15m", // 15 minutes
	REFRESH_TOKEN_EXPIRY: "7d", // 7 days

	// Password requirements
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_REGEX_LOWER: /(?=.*[a-z])/,
	PASSWORD_REGEX_UPPER: /(?=.*[A-Z])/,
	PASSWORD_REGEX_NUMBER: /(?=.*\d)/,
	PASSWORD_REGEX_SPECIAL: /(?=.*[@$!%*?&])/,

	// Account security
	MAX_LOGIN_ATTEMPTS: 5,
	ACCOUNT_LOCK_DURATION: 30 * 60 * 1000, // 30 minutes in ms
	MAX_REFRESH_TOKENS: 5, // Max devices logged in
	REFRESH_TOKEN_CLEANUP_DAYS: 7,

	BCRYPT_SALT_ROUNDS: 12,
};

// ==========================================
// VERIFICATION (OTP)
// ==========================================

export const VERIFICATION = {
	// OTP settings
	OTP_LENGTH: 6,
	OTP_EXPIRY_MINUTES: 10,
	MAX_OTP_ATTEMPTS: 5,

	// Rate limiting
	OTP_REQUEST_LIMIT_10MIN: 3, // Max 3 OTP requests per 10 min
	OTP_REQUEST_LIMIT_1HOUR: 10, // Max 10 OTP requests per hour

	// Cleanup
	CLEANUP_OLD_OTP_DAYS: 3, // Delete used OTPs after 3 days

	// Types
	TYPES: {
		EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
		SMS_VERIFICATION: "SMS_VERIFICATION",
		PASSWORD_RESET: "PASSWORD_RESET",
		TWO_FACTOR: "TWO_FACTOR",
	},
};

// ==========================================
// ACCOUNT STATUS
// ==========================================

export const ACCOUNT_STATUS = {
	ACTIVE: "active",
	SUSPENDED: "suspended",
	CLOSED: "closed",
};

// ==========================================
// TRANSACTION
// ==========================================

export const TRANSACTION = {
	DIRECTION: {
		IN: "T_IN",
		OUT: "T_OUT",
	},

	// Pagination
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,
};

// ==========================================
// VALIDATION
// ==========================================

export const VALIDATION = {
	// Email
	EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	EMAIL_MAX_LENGTH: 255,

	// Phone
	PHONE_REGEX: /^\+?[0-9]{9,15}$/,
	PHONE_MIN_LENGTH: 9,
	PHONE_MAX_LENGTH: 15,

	// User fields
	NAME_MIN_LENGTH: 2,
	NAME_MAX_LENGTH: 50,
};

// ==========================================
// HTTP STATUS CODES
// ==========================================

export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,

	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,

	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
};

// ==========================================
// ERROR MESSAGES
// ==========================================

export const ERROR_MESSAGES = {
	// User
	USER_NOT_FOUND: "User not found",
	USER_ALREADY_EXISTS: "User with this email already exists",
	PHONE_ALREADY_EXISTS: "User with this phone number already exists",

	// Authentication
	INVALID_CREDENTIALS: "Invalid email or password",
	ACCOUNT_NOT_VERIFIED: "Please verify your email address before logging in",
	ACCOUNT_LOCKED: "Account is locked due to too many failed login attempts",
	ACCOUNT_NOT_ACTIVE: "Your account is not active",

	// Transactions
	INSUFFICIENT_FUNDS: "Insufficient funds",
	RECEIVER_NOT_FOUND: "Receiver not found",
	SELF_TRANSFER: "Cannot transfer money to the same account",
	INVALID_AMOUNT: "Invalid transfer amount",

	// Validation
	VALIDATION_FAILED: "Validation failed",
	REQUIRED_FIELD_MISSING: "Required field missing",

	// General
	INTERNAL_ERROR: "Internal server error",
	UNAUTHORIZED_ACCESS: "Unauthorized access",
};

// ==========================================
// SUCCESS MESSAGES
// ==========================================

export const SUCCESS_MESSAGES = {
	USER_CREATED: "User created successfully",
	LOGIN_SUCCESS: "Login successful",
	LOGOUT_SUCCESS: "Logged out successfully",
	TRANSFER_SUCCESS: "Money transferred successfully",
	OTP_SENT: "Verification code sent",
	ACCOUNT_VERIFIED: "Account verified successfully",
};

// ==========================================
// DATABASE
// ==========================================

export const DATABASE = {
	CONNECTION_POOL_SIZE_MAX: 10,
	CONNECTION_POOL_SIZE_MIN: 2,
	SOCKET_TIMEOUT_MS: 45000,
	SERVER_SELECTION_TIMEOUT_MS: 5000,
};

// ==========================================
// RATE LIMITING
// ==========================================

export const RATE_LIMIT = {
	// General API
	GENERAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
	GENERAL_MAX_REQUESTS: 100,

	// Authentication endpoints
	AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
	AUTH_MAX_REQUESTS: 5,

	// Transaction endpoints
	TRANSACTION_WINDOW_MS: 60 * 1000, // 1 minute
	TRANSACTION_MAX_REQUESTS: 10,
};

// ==========================================
// PAGINATION
// ==========================================

export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 20,
	MAX_LIMIT: 100,
};

// ==========================================
// ENVIRONMENT
// ==========================================

export const ENVIRONMENT = {
	DEVELOPMENT: "development",
	PRODUCTION: "production",
	TEST: "test",
};

export const APP = {
	DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "972",
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================
/**
 * Generate random balance between min and max
 * @returns {number} - Balance in cents
 */
export function generateInitialBalance() {
	const { INITIAL_BALANCE_MIN, INITIAL_BALANCE_MAX } = CURRENCY;
	return Math.floor(
		Math.random() * (INITIAL_BALANCE_MAX - INITIAL_BALANCE_MIN) +
			INITIAL_BALANCE_MIN,
	);
}

/**
 * Check if environment is production
 * @returns {boolean}
 */
export function isProduction() {
	return process.env.NODE_ENV === ENVIRONMENT.PRODUCTION;
}

/**
 * Check if environment is development
 * @returns {boolean}
 */
export function isDevelopment() {
	return process.env.NODE_ENV === ENVIRONMENT.DEVELOPMENT;
}

/**
 * Check if environment is test
 * @returns {boolean}
 */
export function isTest() {
	return process.env.NODE_ENV === ENVIRONMENT.TEST;
}
