/**
 * Email Service
 * 
 * Handles all email-related functionality including OTP delivery.
 * 
 */

import nodemailer from 'nodemailer';
import { VALIDATION } from '../config/constants.config.js';
/**
 * Send OTP via email
 * 
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function sendOTPEmail(email, otp) {
    try {
        // in development mode: Log to console
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📧 ==================== OTP EMAIL ====================');
            console.log(`To: ${email}`);
            console.log(`Subject: Your Verification Code`);
            console.log(`\nYour verification code is: ${otp}`);
            console.log(`This code will expire in ${VERIFICATION.OTP_EXPIRY_MINUTES} minutes.`);
            console.log('====================================================\n');
            return true;
        }

        // PRODUCTION: Implement actual email sending
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Verification Code',
            html: `
                <h2>Bank Account Verification</h2>
                <p>Your verification code is: <strong>${otp}</strong></p>
                <p>This code will expire in ${VERIFICATION.OTP_EXPIRY_MINUTES} minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${email}`);
    
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to send OTP email to ${email}:`, error);
        throw new Error('Failed to send verification email');
    }
}

/**
 * Send welcome email after successful registration
 * 
 * @param {string} email - User email
 * @param {string} firstName - User first name (optional)
 * @returns {Promise<boolean>}
 */
export async function sendWelcomeEmail(email, name = '') {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📧 ==================== WELCOME EMAIL ====================');
            console.log(`To: ${email}`);
            console.log(`Subject: Welcome to Our Bank!`);
            console.log(`\nHello ${firstName || 'there'}!`);
            console.log('Welcome to our banking platform. Your account has been created successfully.');
            console.log('========================================================\n');
            return true;
        }

        // PRODUCTION: Implement actual email
        return true;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw - welcome email failure shouldn't block registration
        return false;
    }
}

/**
 * Send password reset email
 * 
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail(email, resetToken) {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📧 ==================== PASSWORD RESET ====================');
            console.log(`To: ${email}`);
            console.log(`Reset Token: ${resetToken}`);
            console.log('=========================================================\n');
            return true;
        }

        // PRODUCTION: Implement actual email
        return true;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
}

/**
 * Send transaction notification email
 * 
 * @param {string} email - User email
 * @param {Object} transaction - Transaction details
 * @returns {Promise<boolean>}
 */
export async function sendTransactionEmail(email, transaction) {
    try {
        const { amount, direction, peerEmail } = transaction;
        const sign = direction === 'T_IN' ? 'received' : 'sent';

        if (process.env.NODE_ENV === 'development') {
            console.log('\n📧 ==================== TRANSACTION NOTIFICATION ====================');
            console.log(`To: ${email}`);
            console.log(`You ${sign} $${amount} ${direction === 'T_IN' ? 'from' : 'to'} ${peerEmail}`);
            console.log('===================================================================\n');
            return true;
        }

        // PRODUCTION: Implement actual email
        return true;
    } catch (error) {
        console.error('Failed to send transaction email:', error);
        // Don't throw - notification failure shouldn't block transaction
        return false;
    }
}

export default {
    sendOTPEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendTransactionEmail
};