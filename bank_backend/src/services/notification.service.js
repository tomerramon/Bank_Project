/**
 * Notification Service - SINGLE SOURCE OF TRUTH
 *
 * All email/SMS sending goes through here.
 * Respects user notification preferences (email/SMS).
 * Users can choose to receive notifications via email, SMS, or both.
 */

import {
	sendOTPEmail,
	sendWelcomeEmail,
	sendAccountVerifiedEmail,
	sendPasswordResetEmail,
	sendPasswordChangedEmail,
	sendTransactionEmail,
	sendTransactionFailedEmail,
	sendLowBalanceEmail,
	sendAccountLockedEmail,
} from "./email.service.js";

import {
	sendOTPSMS,
	sendWelcomeSMS,
	sendAccountVerifiedSMS,
	sendPasswordResetSMS,
	sendPasswordChangedSMS,
	sendTransactionSMS,
	sendTransactionFailedSMS,
	sendLowBalanceSMS,
	sendAccountLockedSMS,
	sendLargeTransactionSMS,
} from "./sms.service.js";

/**
 * Generic fire-and-forget notification sender
 * Logs success/failure but doesn't block execution
 *
 * @param {Function} fn - Async function to execute
 * @param {Array} args - Arguments to pass
 * @param {string} description - For logging
 * @returns {Promise<void>} - Resolves immediately, logs async
 */
async function sendAsync(fn, args, description) {
	fn(...args)
		.then(() => console.log(`✅ ${description} sent`))
		.catch((err) =>
			console.error(`❌ ${description} failed:`, err.message),
		);
}

/**
 * Check if user wants email notifications
 *
 * @param {Object} user - User object or document
 * @returns {Promise<void>} - true if email notifications are enabled
 */
function wantsEmail(user) {
	// If user object has the method, use it
	if (typeof user.wantsEmailNotifications === "function") {
		return user.wantsEmailNotifications();
	}
	// Otherwise check the field directly (for plain objects from queries)
	return user.notificationPreferences?.email !== false; // Default true
}

/**
 * Check if user wants SMS notifications
 *
 * @param {Object} user - User object or document
 * @returns {Promise<void>} - true if SMS notifications are enabled
 */
function wantsSMS(user) {
	// If user object has the method, use it
	if (typeof user.wantsSMSNotifications === "function") {
		return user.wantsSMSNotifications();
	}
	// Otherwise check the field directly
	return user.notificationPreferences?.sms === true;
}

// ============================================
// OTP NOTIFICATIONS
// ============================================

/**
 * Send OTP notification
 * Respects user preferences
 *
 * @param {Object} user - User object with email, phone, notificationPreferences
 * @param {string} otp - OTP code
 * @param {string} userName - User's name (optional)
 */
export async function sendOTPNotification(user, otp, userName = "") {
	if (wantsEmail(user)) {
		sendAsync(sendOTPEmail, [user.email, otp, userName], "OTP email");
	}

	if (wantsSMS(user)) {
		sendAsync(sendOTPSMS, [user.phone, otp], "OTP SMS");
	}
}

/**
 * Send password reset notification
 * Respects user preferences
 *
 * @param {Object} user - User object with email, phone, notificationPreferences
 * @param {string} otp - Password reset OTP code
 */
export async function sendPasswordResetNotification(user, otp) {
	if (wantsEmail(user)) {
		sendAsync(
			sendPasswordResetEmail,
			[user.email, otp],
			"Password reset email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(
			sendPasswordResetSMS,
			[user.phone, otp],
			"Password reset SMS",
		);
	}
}

// ============================================
// ACCOUNT NOTIFICATIONS
// ============================================

export async function sendWelcomeNotification(user, userName) {
	if (wantsEmail(user)) {
		sendAsync(
			sendWelcomeEmail,
			[user.email, userName, user.balance],
			"Welcome email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(sendWelcomeSMS, [user.phone, userName], "Welcome SMS");
	}
}

export async function sendAccountVerifiedNotification(user, userName) {
	if (wantsEmail(user)) {
		sendAsync(
			sendAccountVerifiedEmail,
			[user.email, userName],
			"Account verified email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(
			sendAccountVerifiedSMS,
			[user.phone, userName],
			"Account verified SMS",
		);
	}
}

export async function sendPasswordChangedNotification(user, userName) {
	if (wantsEmail(user)) {
		sendAsync(
			sendPasswordChangedEmail,
			[user.email, userName],
			"Password changed email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(sendPasswordChangedSMS, [user.phone], "Password changed SMS");
	}
}

export async function sendAccountLockedNotification(
	user,
	unlockTime,
	unlockMinutes,
) {
	if (wantsEmail(user)) {
		sendAsync(
			sendAccountLockedEmail,
			[user.email, unlockTime],
			"Account locked email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(
			sendAccountLockedSMS,
			[user.phone, unlockMinutes],
			"Account locked SMS",
		);
	}
}

// ============================================
// TRANSACTION NOTIFICATIONS
// ============================================

export async function sendTransactionNotification(user, transactionData) {
	if (wantsEmail(user)) {
		sendAsync(
			sendTransactionEmail,
			[user.email, transactionData],
			"Transaction email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(
			sendTransactionSMS,
			[user.phone, transactionData],
			"Transaction SMS",
		);
	}
}

export async function sendTransactionFailedNotification(user, failureData) {
	if (wantsEmail(user)) {
		sendAsync(
			sendTransactionFailedEmail,
			[user.email, failureData],
			"Transaction failed email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(
			sendTransactionFailedSMS,
			[user.phone, failureData.reason],
			"Transaction failed SMS",
		);
	}
}

// Large transaction alerts only via SMS for urgency
export async function sendLargeTransactionAlert(user, amount, direction) {
	sendAsync(
		sendLargeTransactionSMS,
		[user.phone, amount, direction],
		"Large transaction alert",
	);
}

// ============================================
// BALANCE NOTIFICATIONS
// ============================================

export async function sendLowBalanceNotification(user, balance, threshold) {
	const userName = user.profile?.firstName || "there";

	if (wantsEmail(user)) {
		sendAsync(
			sendLowBalanceEmail,
			[user.email, userName, balance, threshold],
			"Low balance email",
		);
	}

	if (wantsSMS(user)) {
		sendAsync(
			sendLowBalanceSMS,
			[user.phone, balance, threshold],
			"Low balance SMS",
		);
	}
}
