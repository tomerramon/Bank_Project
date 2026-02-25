/**
 * Validation Utilities - centralizes all input and user state validations.
 *
 */

import {
	ValidationError,
	InvalidFormatError,
	InvalidAmountError,
	UserNotFoundError,
	UnverifiedAccountError,
	InactiveAccountError,
	AccountLockedError,
	SelfTransferError,
	MissingFieldError,
} from "./errors.util.js";
import {
	VALIDATION,
	AUTH,
	CURRENCY,
	VERIFICATION,
	ACCOUNT_STATUS,
} from "../config/constants.config.js";

// ==========================================
// INPUT VALIDATION
// ==========================================

export function validateEmail(email) {
	if (!email || typeof email !== "string") {
		throw new InvalidFormatError("email");
	}

	if (!VALIDATION.EMAIL_REGEX.test(email)) {
		throw new InvalidFormatError("email", "user@example.com");
	}

	if (email.length > VALIDATION.EMAIL_MAX_LENGTH) {
		throw new ValidationError(
			`Email must be less than ${VALIDATION.EMAIL_MAX_LENGTH} characters`,
		);
	}

	return true;
}

export function validatePassword(password) {
	if (!password || typeof password !== "string") {
		throw new ValidationError("Password is required");
	}

	const errors = [];

	if (password.length < AUTH.PASSWORD_MIN_LENGTH) {
		errors.push(
			`Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters long`,
		);
	}

	if (!AUTH.PASSWORD_REGEX_LOWER.test(password)) {
		errors.push("Password must contain at least one lowercase letter");
	}

	if (!AUTH.PASSWORD_REGEX_UPPER.test(password)) {
		errors.push("Password must contain at least one uppercase letter");
	}

	if (!AUTH.PASSWORD_REGEX_NUMBER.test(password)) {
		errors.push("Password must contain at least one number");
	}

	if (!AUTH.PASSWORD_REGEX_SPECIAL.test(password)) {
		errors.push(
			"Password must contain at least one special character (@$!%*?&)",
		);
	}

	if (errors.length > 0) {
		throw new ValidationError(errors);
	}

	return true;
}

export function validatePhone(phone) {
	if (!phone || typeof phone !== "string") {
		throw new InvalidFormatError("phone");
	}

	if (!VALIDATION.PHONE_REGEX.test(phone)) {
		throw new InvalidFormatError(
			"phone",
			"9-15 digits, optionally starting with +",
		);
	}

	return true;
}

export function validateAmount(amount) {
	if (typeof amount !== "number" || !Number.isFinite(amount)) {
		throw new InvalidAmountError(amount, "must be a number");
	}

	if (amount <= 0) {
		throw new InvalidAmountError(amount, "must be greater than zero");
	}

	if (amount < CURRENCY.MIN_TRANSFER_AMOUNT) {
		throw new InvalidAmountError(
			amount,
			`minimum is $${CURRENCY.MIN_TRANSFER_AMOUNT}`,
		);
	}

	if (amount > CURRENCY.MAX_TRANSFER_AMOUNT) {
		throw new InvalidAmountError(
			amount,
			`maximum is $${CURRENCY.MAX_TRANSFER_AMOUNT}`,
		);
	}

	return true;
}

export function validateOTP(otp) {
	if (!otp || typeof otp !== "string") {
		throw new ValidationError("OTP is required");
	}

	const otpRegex = new RegExp(`^\\d{${VERIFICATION.OTP_LENGTH}}$`);

	if (!otpRegex.test(otp)) {
		throw new ValidationError(
			`OTP must be ${VERIFICATION.OTP_LENGTH} digits`,
		);
	}

	return true;
}

export function validateNotificationPreferences(preferences) {
	if (typeof preferences !== "object") {
		throw new ValidationError("Preferences must be an object");
	}

	// Ensure at least one field is provided
	if (preferences.email === undefined && preferences.sms === undefined) {
		throw new ValidationError(
			"At least one preference (email or sms) must be specified",
		);
	}

	// Ensure values are boolean
	if (
		preferences.email !== undefined &&
		typeof preferences.email !== "boolean"
	) {
		throw new ValidationError("Email preference must be true or false");
	}

	if (preferences.sms !== undefined && typeof preferences.sms !== "boolean") {
		throw new ValidationError("SMS preference must be true or false");
	}
	// Prevent disabling both (users must receive notifications)
	if (preferences.email === false && preferences.sms === false) {
		throw new ValidationError(
			"You must enable at least one notification method",
		);
	}
}

// ==========================================
// COMPOSITE VALIDATORS (for controllers)
// ==========================================

export function validateSignupInputs(data) {
	const { email, password, phone } = data;

	validateEmail(email);
	validatePassword(password);
	validatePhone(phone);

	return true;
}

export function validateLoginInputs(data) {
	const { email, password } = data;

	if (!email) throw new MissingFieldError("email");
	if (!password) throw new MissingFieldError("password");

	validateEmail(email);

	return true;
}

export function validateTransferInputs(data) {
	const { toEmail, amount } = data;

	if (!toEmail) {
		throw new MissingFieldError("Receiver email");
	}
	if (amount === undefined || amount === null) {
		throw new MissingFieldError("Amount");
	}

	validateEmail(toEmail);
	validateAmount(amount);

	return true;
}

// ==========================================
// USER STATE VALIDATION
// ==========================================

export function requireUserExists(user, identifier = "") {
	if (!user) {
		throw new UserNotFoundError(identifier);
	}
	return user;
}

export function requireVerified(user) {
	if (!user.isVerified) {
		throw new UnverifiedAccountError();
	}
	return user;
}

export function requireActive(user) {
	if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
		const messages = {
			[ACCOUNT_STATUS.SUSPENDED]:
				"Your account has been suspended. Please contact support.",
			[ACCOUNT_STATUS.CLOSED]: "This account has been closed.",
		};
		throw new InactiveAccountError(
			messages[user.accountStatus] || "Account is not active",
		);
	}
	return user;
}

export function requireUnlocked(user) {
	if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
		const lockTimeRemaining = Math.ceil(
			(user.accountLockedUntil - Date.now()) / 60000,
		);
		throw new AccountLockedError(lockTimeRemaining);
	}
	return user;
}

/**
 * Complete validation for operations
 * Use this for any authenticated action
 */
export function validateUserForOperation(user, { checkLock = true } = {}) {
	requireUserExists(user);
	requireVerified(user);
	requireActive(user);
	if (checkLock) {
		requireUnlocked(user);
	}
	return user;
}

/**
 * Validate users are different (prevent self-operations)
 */
export function requireDifferentUsers(userId1, userId2) {
	const id1 = typeof userId1 === "string" ? userId1 : userId1.toString();
	const id2 = typeof userId2 === "string" ? userId2 : userId2.toString();

	if (id1 === id2) {
		throw new SelfTransferError();
	}
}

// ==========================================
// SANITIZATION
// ==========================================
export function sanitizeUserForToken(user) {
	return {
		id: user._id || user.id,
		email: user.email,
	};
}
