/**
 * SMS Service
 * 
 * Handles all SMS-related functionality including OTP delivery via Twilio.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install: npm install twilio
 * 2. Add to .env:
 *    TWILIO_ACCOUNT_SID=your_account_sid
 *    TWILIO_AUTH_TOKEN=your_auth_token
 *    TWILIO_PHONE_NUMBER=your_twilio_phone
 * 3. Uncomment the Twilio code below
 */

import { VERIFICATION } from '../config/constants.config.js';

// PRODUCTION: Uncomment when you have Twilio credentials
// import twilio from 'twilio';
// const client = twilio(
//     process.env.TWILIO_ACCOUNT_SID,
//     process.env.TWILIO_AUTH_TOKEN
// );

/**
 * Send OTP via SMS using Twilio
 * 
 * @param {string} phoneNumber - Recipient phone number (E.164 format: +1234567890)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function sendOTPSMS(phoneNumber, otp) {
    try {
        // Validate phone format
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`;
        }

        const message = `Your verification code is: ${otp}\n\nThis code will expire in ${VERIFICATION.OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this code, please ignore this message.`;

        // DEVELOPMENT: Log to console
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📱 ==================== OTP SMS ====================');
            console.log(`To: ${phoneNumber}`);
            console.log(`Message: ${message}`);
            console.log('==================================================\n');
            return true;
        }

        // PRODUCTION: Send actual SMS via Twilio
        /*
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        console.log(`✅ OTP SMS sent to ${phoneNumber} (SID: ${result.sid})`);
        return true;
        */

        // For now, just log
        console.log(`📱 [SIMULATION] SMS would be sent to ${phoneNumber}: ${otp}`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to send OTP SMS to ${phoneNumber}:`, error);
        
        // Handle specific Twilio errors
        if (error.code === 21211) {
            throw new Error('Invalid phone number format');
        } else if (error.code === 21608) {
            throw new Error('Phone number is not verified (Twilio trial account)');
        }
        
        throw new Error('Failed to send verification SMS');
    }
}

/**
 * Send transaction notification SMS
 * 
 * @param {string} phoneNumber - User phone number
 * @param {Object} transaction - Transaction details
 * @returns {Promise<boolean>}
 */
export async function sendTransactionSMS(phoneNumber, transaction) {
    try {
        const { amount, direction, peerEmail } = transaction;
        const action = direction === 'T_IN' ? 'received' : 'sent';
        const preposition = direction === 'T_IN' ? 'from' : 'to';
        
        const message = `Bank Alert: You ${action} $${amount} ${preposition} ${peerEmail}`;

        if (process.env.NODE_ENV === 'development') {
            console.log('\n📱 ==================== TRANSACTION SMS ====================');
            console.log(`To: ${phoneNumber}`);
            console.log(`Message: ${message}`);
            console.log('==========================================================\n');
            return true;
        }

        // PRODUCTION: Send actual SMS
        /*
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
        */

        return true;
    } catch (error) {
        console.error('Failed to send transaction SMS:', error);
        // Don't throw - notification failure shouldn't block transaction
        return false;
    }
}

/**
 * Send account alert SMS
 * 
 * @param {string} phoneNumber - User phone number
 * @param {string} alertMessage - Alert message
 * @returns {Promise<boolean>}
 */
export async function sendAlertSMS(phoneNumber, alertMessage) {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📱 ==================== ALERT SMS ====================');
            console.log(`To: ${phoneNumber}`);
            console.log(`Alert: ${alertMessage}`);
            console.log('====================================================\n');
            return true;
        }

        // PRODUCTION: Send actual SMS
        return true;
    } catch (error) {
        console.error('Failed to send alert SMS:', error);
        return false;
    }
}

/**
 * Verify phone number format before sending
 * 
 * @param {string} phoneNumber - Phone number to verify
 * @returns {boolean} - true if valid E.164 format
 */
export function isValidPhoneFormat(phoneNumber) {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
}

/**
 * Format phone number to E.164
 * 
 * @param {string} phoneNumber - Phone number
 * @param {string} defaultCountryCode - Default country code (e.g., '972' for ISRAEL)
 * @returns {string} - Formatted phone number
 */
export function formatToE164(phoneNumber, defaultCountryCode = '972') {
    // Remove all non-digit characters
    let digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!digits.startsWith(defaultCountryCode)) {
        digits = defaultCountryCode + digits;
    }
    
    return `+${digits}`;
}

export default {
    sendOTPSMS,
    sendTransactionSMS,
    sendAlertSMS,
    isValidPhoneFormat,
    formatToE164
};