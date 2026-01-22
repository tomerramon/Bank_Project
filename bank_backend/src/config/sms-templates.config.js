/**
 * SMS Templates Configuration
 * 
 * SMS messages should be concise (160 characters is ideal for single SMS).
 * 
 * Tips for good SMS:
 * - Keep it short (under 160 chars for single SMS)
 * - Include brand name
 * - Clear call to action
 * - No special characters (they count as 2 chars)
 */

import { VERIFICATION } from './constants.config.js';

/**
 * OTP Verification SMS Template
 */
export const OTP_SMS = {
    getMessage: (data) => {
        const { otp, appName = 'Bank App', expiryMinutes = 10 } = data;
        return `${appName}: Your verification code is ${otp}. Valid for ${expiryMinutes} minutes. Do not share this code.`;
    }
};

/**
 * Welcome SMS Template
 */
export const WELCOME_SMS = {
    getMessage: (data) => {
        const { userName, appName = 'Bank App' } = data;
        return `Welcome to ${appName}, ${userName}! Your account is now active. Log in to start banking.`;
    }
};

/**
 * Transaction Notification SMS (Money Sent)
 */
export const TRANSACTION_SENT_SMS = {
    getMessage: (data) => {
        const { amount, peerEmail, balance, appName = 'Bank App' } = data;
        return `${appName}: You sent $${amount.toFixed(2)} to ${peerEmail}. New balance: $${balance.toFixed(2)}`;
    }
};

/**
 * Transaction Notification SMS (Money Received)
 */
export const TRANSACTION_RECEIVED_SMS = {
    getMessage: (data) => {
        const { amount, peerEmail, balance, appName = 'Bank App' } = data;
        return `${appName}: You received $${amount.toFixed(2)} from ${peerEmail}. New balance: $${balance.toFixed(2)}`;
    }
};

/**
 * Transaction Failed SMS
 */
export const TRANSACTION_FAILED_SMS = {
    getMessage: (data) => {
        const { reason, appName = 'Bank App' } = data;
        return `${appName}: Transaction failed - ${reason}. Please try again or contact support.`;
    }
};

/**
 * Account Verified SMS
 */
export const ACCOUNT_VERIFIED_SMS = {
    getMessage: (data) => {
        const { userName, appName = 'Bank App' } = data;
        return `${appName}: Great news ${userName}! Your account has been verified. You can now send and receive money.`;
    }
};

/**
 * Low Balance Alert SMS
 */
export const LOW_BALANCE_SMS = {
    getMessage: (data) => {
        const { balance, threshold = 10, appName = 'Bank App' } = data;
        return `${appName} Alert: Your balance ($${balance.toFixed(2)}) is below $${threshold}. Consider adding funds.`;
    }
};

/**
 * Account Locked SMS
 */
export const ACCOUNT_LOCKED_SMS = {
    getMessage: (data) => {
        const { unlockMinutes, appName = 'Bank App' } = data;
        return `${appName} Security: Your account has been locked due to failed login attempts. Try again in ${unlockMinutes} minutes.`;
    }
};

/**
 * Password Reset SMS
 */
export const PASSWORD_RESET_SMS = {
    getMessage: (data) => {
        const { otp, expiryMinutes = 10, appName = 'Bank App' } = data;
        return `${appName}: Your password reset code is ${otp}. Valid for ${expiryMinutes} minutes. Don't share this code.`;
    }
};

/**
 * Password Changed SMS
 */
export const PASSWORD_CHANGED_SMS = {
    getMessage: (data) => {
        const { appName = 'Bank App' } = data;
        return `${appName} Security: Your password was changed. If this wasn't you, contact support immediately.`;
    }
};

/**
 * Large Transaction Alert SMS
 */
export const LARGE_TRANSACTION_SMS = {
    getMessage: (data) => {
        const { amount, type, appName = 'Bank App' } = data;
        const action = type === 'T_OUT' ? 'sent' : 'received';
        return `${appName} Alert: Large transaction detected - You ${action} $${amount.toFixed(2)}. Contact support if unauthorized.`;
    }
};

/**
 * Account Suspension SMS
 */
export const ACCOUNT_SUSPENDED_SMS = {
    getMessage: (data) => {
        const { appName = 'Bank App' } = data;
        return `${appName}: Your account has been suspended. Please contact support for assistance.`;
    }
};

/**
 * Login from New Device SMS
 */
export const NEW_DEVICE_LOGIN_SMS = {
    getMessage: (data) => {
        const { deviceInfo, location, appName = 'Bank App' } = data;
        return `${appName} Security: New login detected from ${deviceInfo} in ${location}. If this wasn't you, secure your account immediately.`;
    }
};

/**
 * Helper function to get app-specific SMS defaults
 */
export function getSMSDefaults() {
    return {
        appName: process.env.APP_NAME || 'Bank App',
        expiryMinutes: VERIFICATION.OTP_EXPIRY_MINUTES || 10
    };
}

/**
 * Validate SMS length (single SMS = 160 chars)
 * Returns warning if message is too long
 */
export function validateSMSLength(message) {
    const length = message.length;
    const segments = Math.ceil(length / 160);
    
    return {
        length,
        segments,
        isSingle: segments === 1,
        warning: segments > 1 ? `Message will be sent as ${segments} SMS segments` : null
    };
}

/**
 * Format phone number to E.164 format
 * Required by Twilio
 */
export function formatPhoneE164(phone, defaultCountryCode = '972') {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // Add country code if missing
    if (!digits.startsWith(defaultCountryCode)) {
        digits = defaultCountryCode + digits;
    }
    
    return `+${digits}`;
}

export default {
    OTP_SMS,
    WELCOME_SMS,
    TRANSACTION_SENT_SMS,
    TRANSACTION_RECEIVED_SMS,
    TRANSACTION_FAILED_SMS,
    ACCOUNT_VERIFIED_SMS,
    LOW_BALANCE_SMS,
    ACCOUNT_LOCKED_SMS,
    PASSWORD_RESET_SMS,
    PASSWORD_CHANGED_SMS,
    LARGE_TRANSACTION_SMS,
    ACCOUNT_SUSPENDED_SMS,
    NEW_DEVICE_LOGIN_SMS,
    getSMSDefaults,
    validateSMSLength,
    formatPhoneE164
};