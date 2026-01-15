/**
 * Notification Service - SINGLE SOURCE OF TRUTH
 * 
 * All email/SMS sending goes through here.
 * 
 */

import {
    sendOTPEmail, sendWelcomeEmail, sendAccountVerifiedEmail,
    sendPasswordResetEmail, sendPasswordChangedEmail,
    sendTransactionEmail, sendTransactionFailedEmail,
    sendLowBalanceEmail, sendAccountLockedEmail
} from './email.service.js';

import {
    sendOTPSMS, sendWelcomeSMS, sendAccountVerifiedSMS,
    sendPasswordResetSMS, sendPasswordChangedSMS,
    sendTransactionSMS, sendTransactionFailedSMS,
    sendLowBalanceSMS, sendAccountLockedSMS,
    sendLargeTransactionSMS
} from './sms.service.js';

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
        .catch(err => console.error(`❌ ${description} failed:`, err.message));
}

// ============================================
// OTP NOTIFICATIONS
// ============================================

export async function sendOTPNotification(email, phone, otp, userName = '') {
    sendAsync(sendOTPEmail, [email, otp, userName], 'OTP email');
    sendAsync(sendOTPSMS, [phone, otp], 'OTP SMS');
}

export async function sendPasswordResetNotification(email, phone, otp) {
    sendAsync(sendPasswordResetEmail, [email, otp], 'Password reset email');
    sendAsync(sendPasswordResetSMS, [phone, otp], 'Password reset SMS');
}

// ============================================
// ACCOUNT NOTIFICATIONS
// ============================================

export async function sendWelcomeNotification(email, phone, userName) {
    sendAsync(sendWelcomeEmail, [email, userName], 'Welcome email');
    sendAsync(sendWelcomeSMS, [phone, userName], 'Welcome SMS');
}

export async function sendAccountVerifiedNotification(email, phone, userName) {
    sendAsync(sendAccountVerifiedEmail, [email, userName], 'Account verified email');
    sendAsync(sendAccountVerifiedSMS, [phone, userName], 'Account verified SMS');
}

export async function sendPasswordChangedNotification(email, phone, userName) {
    sendAsync(sendPasswordChangedEmail, [email, userName], 'Password changed email');
    sendAsync(sendPasswordChangedSMS, [phone], 'Password changed SMS');
}

export async function sendAccountLockedNotification(email, phone, unlockTime, unlockMinutes) {
    sendAsync(sendAccountLockedEmail, [email, unlockTime], 'Account locked email');
    sendAsync(sendAccountLockedSMS, [phone, unlockMinutes], 'Account locked SMS');
}

// ============================================
// TRANSACTION NOTIFICATIONS
// ============================================

export async function sendTransactionNotification(user, transactionData) {
    const { email, phone } = user;
    
    sendAsync(sendTransactionEmail, [email, transactionData], 'Transaction email');
    sendAsync(sendTransactionSMS, [phone, transactionData], 'Transaction SMS');
}

export async function sendTransactionFailedNotification(user, failureData) {
    const { email, phone } = user;
    
    sendAsync(sendTransactionFailedEmail, [email, failureData], 'Transaction failed email');
    sendAsync(sendTransactionFailedSMS, [phone, failureData.reason], 'Transaction failed SMS');
}

export async function sendLargeTransactionAlert(user, amount, direction) {
    sendAsync(sendLargeTransactionSMS, [user.phone, amount, direction], 'Large transaction alert');
}

// ============================================
// BALANCE NOTIFICATIONS
// ============================================

export async function sendLowBalanceNotification(user, balance, threshold) {
    const userName = user.profile?.firstName || 'there';
    
    sendAsync(sendLowBalanceEmail, [user.email, userName, balance, threshold], 'Low balance email');
    sendAsync(sendLowBalanceSMS, [user.phone, balance, threshold], 'Low balance SMS');
}

export default {
    sendOTPNotification,
    sendPasswordResetNotification,
    sendWelcomeNotification,
    sendAccountVerifiedNotification,
    sendPasswordChangedNotification,
    sendAccountLockedNotification,
    sendTransactionNotification,
    sendTransactionFailedNotification,
    sendLargeTransactionAlert,
    sendLowBalanceNotification
};