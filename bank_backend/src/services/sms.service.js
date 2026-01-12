/**
 * SMS Service with Twilio Integration
 * 
 * SETUP:
 * 1. Install: npm install twilio
 * 2. Sign up at: https://www.twilio.com
 * 3. Get your credentials from Twilio Console
 * 4. Add to .env:
 *    TWILIO_ACCOUNT_SID=your_account_sid
 *    TWILIO_AUTH_TOKEN=your_auth_token
 *    TWILIO_PHONE_NUMBER=+1234567890
 */

import twilio from 'twilio';
import {
    OTP_SMS, WELCOME_SMS, TRANSACTION_SENT_SMS,
    TRANSACTION_RECEIVED_SMS, TRANSACTION_FAILED_SMS,
    ACCOUNT_VERIFIED_SMS, LOW_BALANCE_SMS,
    ACCOUNT_LOCKED_SMS, PASSWORD_RESET_SMS,
    PASSWORD_CHANGED_SMS, LARGE_TRANSACTION_SMS,
    ACCOUNT_SUSPENDED_SMS, NEW_DEVICE_LOGIN_SMS,
    getSMSDefaults, validateSMSLength, formatPhoneE164
} from '../config/sms-templates.config.js';

// ============================================
// TWILIO CLIENT SETUP
// ============================================

let twilioClient = null;

/**
 * Get Twilio client (creates once, reuses after)
 */
function getTwilioClient() {
    // If already created, return it
    if (twilioClient) {
        return twilioClient;
    }

    // Check if Twilio is configured
    const isConfigured = process.env.TWILIO_ACCOUNT_SID && 
                        process.env.TWILIO_AUTH_TOKEN && 
                        process.env.TWILIO_PHONE_NUMBER;

    if (!isConfigured) {
        console.warn('⚠️  Twilio not configured. SMS will be logged to console.');
        return null;
    }

    // Create Twilio client
    try {
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        console.log('✅ Twilio SMS client initialized');
        return twilioClient;
    } catch (error) {
        console.error('❌ Failed to initialize Twilio:', error.message);
        return null;
    }
}

// ============================================
//  GENERIC SEND FUNCTION
// ============================================

/**
 * Send SMS (low-level function)
 * 
 * @param {string} to - Recipient phone number (E.164 format: +1234567890)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} - Send result
 */
async function sendSMS(to, message) {
    const client = getTwilioClient();

    // Format phone number to E.164
    const formattedPhone = formatPhoneE164(to);

    // Validate message length
    const lengthInfo = validateSMSLength(message);
    if (lengthInfo.warning) {
        console.warn(`⚠️  ${lengthInfo.warning}`);
    }

    // If Twilio not configured, log to console (development mode)
    if (!client) {
        console.log('\n📱 ========== SMS (Dev Mode) ==========');
        console.log('To:', formattedPhone);
        console.log('Message:', message);
        console.log(`Length: ${lengthInfo.length} chars (${lengthInfo.segments} segment${lengthInfo.segments > 1 ? 's' : ''})`);
        console.log('======================================\n');
        return { 
            sid: 'dev-' + Date.now(), 
            success: true,
            to: formattedPhone,
            status: 'dev_mode'
        };
    }

    // Send actual SMS via Twilio
    try {
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });

        console.log(`✅ SMS sent to ${formattedPhone} (SID: ${result.sid})`);
        return { 
            ...result, 
            success: true 
        };
    } catch (error) {
        console.error(`❌ Failed to send SMS to ${formattedPhone}:`, error.message);
        
        // Handle specific Twilio errors
        if (error.code === 21211) {
            throw new Error('Invalid phone number format');
        } else if (error.code === 21608) {
            throw new Error('Unverified phone number (Twilio trial account limitation)');
        } else if (error.code === 21610) {
            throw new Error('Phone number is blocked or unsubscribed');
        }
        
        throw new Error(`SMS sending failed: ${error.message}`);
    }
}

// ============================================
//  SPECIFIC SMS FUNCTIONS
// ============================================

/**
 * Send OTP verification SMS
 * 
 * @param {string} phone - User's phone number
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<Object>}
 */
export async function sendOTPSMS(phone, otp) {
    const data = {
        ...getSMSDefaults(),
        otp
    };

    return await sendSMS(phone, OTP_SMS.getMessage(data));
}

/**
 * Send welcome SMS after successful verification
 * 
 * @param {string} phone - User's phone number
 * @param {string} userName - User's name
 * @returns {Promise<Object>}
 */
export async function sendWelcomeSMS(phone, userName) {
    const data = {
        ...getSMSDefaults(),
        userName
    };

    return await sendSMS(phone, WELCOME_SMS.getMessage(data));
}

/**
 * Send transaction notification SMS
 * 
 * @param {string} phone - User's phone number
 * @param {Object} transaction - Transaction details
 * @param {string} transaction.direction - 'T_IN' or 'T_OUT'
 * @param {number} transaction.amount - Transaction amount
 * @param {string} transaction.peerEmail - Other user's email
 * @param {number} transaction.balance - New balance after transaction
 * @returns {Promise<Object>}
 */
export async function sendTransactionSMS(phone, transaction) {
    const { direction, amount, peerEmail, balance } = transaction;
    const data = {
        ...getSMSDefaults(),
        amount,
        peerEmail,
        balance
    };

    const template = direction === 'T_IN' 
        ? TRANSACTION_RECEIVED_SMS 
        : TRANSACTION_SENT_SMS;

    return await sendSMS(phone, template.getMessage(data));
}

/**
 * Send transaction failed notification SMS
 * 
 * @param {string} phone - User's phone number
 * @param {string} reason - Failure reason
 * @returns {Promise<Object>}
 */
export async function sendTransactionFailedSMS(phone, reason) {
    const data = {
        ...getSMSDefaults(),
        reason
    };

    return await sendSMS(phone, TRANSACTION_FAILED_SMS.getMessage(data));
}

/**
 * Send account verified SMS
 * 
 * @param {string} phone - User's phone number
 * @param {string} userName - User's name
 * @returns {Promise<Object>}
 */
export async function sendAccountVerifiedSMS(phone, userName) {
    const data = {
        ...getSMSDefaults(),
        userName
    };

    return await sendSMS(phone, ACCOUNT_VERIFIED_SMS.getMessage(data));
}

/**
 * Send low balance alert SMS
 * 
 * @param {string} phone - User's phone number
 * @param {number} balance - Current balance
 * @param {number} threshold - Alert threshold
 * @returns {Promise<Object>}
 */
export async function sendLowBalanceSMS(phone, balance, threshold = 10) {
    const data = {
        ...getSMSDefaults(),
        balance,
        threshold
    };

    return await sendSMS(phone, LOW_BALANCE_SMS.getMessage(data));
}

/**
 * Send account locked notification SMS
 * 
 * @param {string} phone - User's phone number
 * @param {number} unlockMinutes - Minutes until unlock
 * @returns {Promise<Object>}
 */
export async function sendAccountLockedSMS(phone, unlockMinutes) {
    const data = {
        ...getSMSDefaults(),
        unlockMinutes
    };

    return await sendSMS(phone, ACCOUNT_LOCKED_SMS.getMessage(data));
}

/**
 * Send password reset SMS
 * 
 * @param {string} phone - User's phone number
 * @param {string} otp - Reset OTP code
 * @returns {Promise<Object>}
 */
export async function sendPasswordResetSMS(phone, otp) {
    const data = {
        ...getSMSDefaults(),
        otp
    };

    return await sendSMS(phone, PASSWORD_RESET_SMS.getMessage(data));
}

/**
 * Send password changed notification SMS
 * 
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>}
 */
export async function sendPasswordChangedSMS(phone) {
    const data = getSMSDefaults();

    return await sendSMS(phone, PASSWORD_CHANGED_SMS.getMessage(data));
}

/**
 * Send large transaction alert SMS
 * 
 * @param {string} phone - User's phone number
 * @param {number} amount - Transaction amount
 * @param {string} type - 'T_IN' or 'T_OUT'
 * @returns {Promise<Object>}
 */
export async function sendLargeTransactionSMS(phone, amount, type) {
    const data = {
        ...getSMSDefaults(),
        amount,
        type
    };

    return await sendSMS(phone, LARGE_TRANSACTION_SMS.getMessage(data));
}

/**
 * Send account suspended notification SMS
 * 
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>}
 */
export async function sendAccountSuspendedSMS(phone) {
    const data = getSMSDefaults();

    return await sendSMS(phone, ACCOUNT_SUSPENDED_SMS.getMessage(data));
}

/**
 * Send new device login alert SMS
 * 
 * @param {string} phone - User's phone number
 * @param {string} deviceInfo - Device information
 * @param {string} location - Login location
 * @returns {Promise<Object>}
 */
export async function sendNewDeviceLoginSMS(phone, deviceInfo, location) {
    const data = {
        ...getSMSDefaults(),
        deviceInfo,
        location
    };

    return await sendSMS(phone, NEW_DEVICE_LOGIN_SMS.getMessage(data));
}

// ============================================
//  UTILITY FUNCTIONS
// ============================================

/**
 * Test Twilio connection
 * Verifies credentials are correct
 * 
 * @returns {Promise<boolean>}
 */
export async function testTwilioConnection() {
    const client = getTwilioClient();
    
    if (!client) {
        console.log('⚠️  Twilio not configured - using console mode');
        return true; // Not an error in development
    }

    try {
        // Fetch account info to verify credentials
        await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Twilio connection verified');
        return true;
    } catch (error) {
        console.error('❌ Twilio connection failed:', error.message);
        return false;
    }
}

/**
 * Send test SMS
 * Use this to test your Twilio setup
 * 
 * @param {string} toPhone - Phone number to send test to
 * @returns {Promise<Object>}
 */
export async function sendTestSMS(toPhone) {
    return await sendSMS(
        toPhone,
        `Test SMS from ${process.env.APP_NAME || 'Bank App'}. If you received this, your SMS configuration is working! ✅`
    );
}

/**
 * Check phone number status with Twilio Lookup API
 * (Requires Lookup API to be enabled in Twilio)
 * 
 * @param {string} phoneNumber - Phone number to check
 * @returns {Promise<Object>} - Phone number info
 */
export async function lookupPhoneNumber(phoneNumber) {
    const client = getTwilioClient();
    
    if (!client) {
        return { valid: true, formatted: formatPhoneE164(phoneNumber), carrier: 'unknown' };
    }

    try {
        const result = await client.lookups.v1
            .phoneNumbers(formatPhoneE164(phoneNumber))
            .fetch();

        return {
            valid: true,
            formatted: result.phoneNumber,
            nationalFormat: result.nationalFormat,
            carrier: result.carrier?.name || 'unknown'
        };
    } catch (error) {
        console.error('Phone lookup failed:', error.message);
        return { valid: false, error: error.message };
    }
}

/**
 * Get SMS delivery status
 * Check if an SMS was delivered
 * 
 * @param {string} messageSid - Twilio message SID
 * @returns {Promise<Object>} - Delivery status
 */
export async function getSMSStatus(messageSid) {
    const client = getTwilioClient();
    
    if (!client) {
        return { status: 'dev_mode', delivered: true };
    }

    try {
        const message = await client.messages(messageSid).fetch();
        
        return {
            status: message.status,
            delivered: message.status === 'delivered',
            failed: message.status === 'failed',
            errorCode: message.errorCode,
            errorMessage: message.errorMessage
        };
    } catch (error) {
        console.error('Failed to get SMS status:', error.message);
        return { status: 'unknown', error: error.message };
    }
}

// Export all functions
export default {
    sendOTPSMS,
    sendWelcomeSMS,
    sendTransactionSMS,
    sendTransactionFailedSMS,
    sendAccountVerifiedSMS,
    sendLowBalanceSMS,
    sendAccountLockedSMS,
    sendPasswordResetSMS,
    sendPasswordChangedSMS,
    sendLargeTransactionSMS,
    sendAccountSuspendedSMS,
    sendNewDeviceLoginSMS,
    testTwilioConnection,
    sendTestSMS,
    lookupPhoneNumber,
    getSMSStatus
};