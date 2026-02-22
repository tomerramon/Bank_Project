/**
 * Email Service - Simplified Version
 *
 * This service handles ONLY the sending logic.
 * All email content (subject, text, HTML) is in email-templates.config.js
 *
 * SETUP:
 * 1. Install: npm install nodemailer
 * 2. Add to .env:
 *    SMTP_HOST=smtp.gmail.com
 *    SMTP_PORT=587
 *    SMTP_USER=your-email@gmail.com
 *    SMTP_PASS=your-app-password
 *    SMTP_FROM="Bank Name <noreply@bank.com>"
 *
 * For Gmail app password: https://myaccount.google.com/apppasswords
 */

import nodemailer from "nodemailer";
import {
	OTP_EMAIL,
	WELCOME_EMAIL,
	TRANSACTION_EMAIL,
	PASSWORD_RESET_EMAIL,
	ACCOUNT_LOCKED_EMAIL,
	TRANSACTION_FAILED_EMAIL,
	ACCOUNT_VERIFIED_EMAIL,
	LOW_BALANCE_EMAIL,
	PASSWORD_CHANGED_EMAIL,
	getAppDefaults,
} from "../config/email-templates.config.js";

// ============================================
//  TRANSPORTER SETUP
// ============================================

let transporter = null;

/**
 * Create email transporter (connection to email server)
 * This is called once when the app starts
 */
function getTransporter() {
	// If already created, return it
	if (transporter) {
		return transporter;
	}

	// Check if SMTP is configured
	const isConfigured =
		process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

	if (!isConfigured) {
		console.warn(
			"⚠️  SMTP not configured. Emails will be logged to console.",
		);
		return null;
	}

	// Create transporter
	transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT || "587"),
		secure: process.env.SMTP_PORT === "465", // SSL for port 465
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	console.log("✅ Email transporter initialized");
	return transporter;
}

// ============================================
//  GENERIC SEND FUNCTION
// ============================================

/**
 * Send email (low-level function)
 *
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail(to, subject, text, html) {
	const transport = getTransporter();

	// If SMTP not configured, log to console (for development)
	if (!transport) {
		console.log("\n========== EMAIL (Dev Mode) ==========");
		console.log("To:", to);
		console.log("Subject:", subject);
		console.log("Content:", text);
		console.log("========================================\n");
		return { messageId: "dev-" + Date.now(), success: true };
	}

	// Send actual email
	try {
		const info = await transport.sendMail({
			from: process.env.SMTP_FROM || "Bank App <noreply@bank.com>",
			to,
			replyTo: "no-reply@bank.com",
			subject,
			text,
			html,
		});

		console.log(`✅ Email sent to ${to} (ID: ${info.messageId})`);
		return { ...info, success: true };
	} catch (error) {
		console.error(`❌ Failed to send email to ${to}:`, error.message);
		throw new Error(`Email sending failed: ${error.message}`);
	}
}

// ============================================
//  SPECIFIC EMAIL FUNCTIONS
// ============================================

/**
 * Send OTP verification email
 *
 * @param {string} email - User's email
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>}
 */
export async function sendOTPEmail(email, otp, userName = "") {
	const data = {
		...getAppDefaults(),
		otp,
		userName,
	};

	return await sendEmail(
		email,
		OTP_EMAIL.subject,
		OTP_EMAIL.getText(data),
		OTP_EMAIL.getHTML(data),
	);
}

/**
 * Send welcome email after successful verification
 * 
 * @param {string} email - User's email
 * @param {string} userName - User's name
//  * @param {number} balance - Initial balance
 * @returns {Promise<Object>}
 */
export async function sendWelcomeEmail(email, userName, balance) {
	const data = {
		...getAppDefaults(),
		email,
		userName,
		balance,
	};

	return await sendEmail(
		email,
		WELCOME_EMAIL.subject(data),
		WELCOME_EMAIL.getText(data),
		WELCOME_EMAIL.getHTML(data),
	);
}

/**
 * Send transaction notification email
 *
 * @param {string} email - User's email
 * @param {Object} transaction - Transaction details
 * @param {string} transaction.direction - 'T_IN' or 'T_OUT'
 * @param {number} transaction.amount - Transaction amount
 * @param {string} transaction.peerEmail - Other user's email
 * @param {number} transaction.balance - New balance after transaction
 * @returns {Promise<Object>}
 */
export async function sendTransactionEmail(email, transaction) {
	const data = {
		...getAppDefaults(),
		...transaction,
	};

	return await sendEmail(
		email,
		TRANSACTION_EMAIL.getSubject(data),
		TRANSACTION_EMAIL.getText(data),
		TRANSACTION_EMAIL.getHTML(data),
	);
}

/**
 * Send password reset email
 *
 * @param {string} email - User's email
 * @param {string} otp - Reset OTP code
 * @returns {Promise<Object>}
 */
export async function sendPasswordResetEmail(email, otp) {
	const data = {
		...getAppDefaults(),
		otp,
	};

	return await sendEmail(
		email,
		PASSWORD_RESET_EMAIL.subject,
		PASSWORD_RESET_EMAIL.getText(data),
		PASSWORD_RESET_EMAIL.getHTML(data),
	);
}

/**
 * Send account locked notification
 *
 * @param {string} email - User's email
 * @param {Date} unlockTime - When account will be unlocked
 * @returns {Promise<Object>}
 */
export async function sendAccountLockedEmail(email, unlockTime) {
	const data = {
		...getAppDefaults(),
		unlockTime: unlockTime.toLocaleString(),
	};

	return await sendEmail(
		email,
		ACCOUNT_LOCKED_EMAIL.subject,
		ACCOUNT_LOCKED_EMAIL.getText(data),
		ACCOUNT_LOCKED_EMAIL.getHTML(data),
	);
}

/**
 * Send transaction failed notification
 *
 * @param {string} email - User's email
 * @param {Object} failureDetails - Transaction failure details
 * @param {string} failureDetails.reason - Failure reason
 * @param {number} failureDetails.amount - Transaction amount
 * @param {string} failureDetails.toEmail - Recipient email
 * @param {number} failureDetails.currentBalance - User's current balance
 * @returns {Promise<Object>}
 */
export async function sendTransactionFailedEmail(email, failureDetails) {
	const data = {
		...getAppDefaults(),
		...failureDetails,
		balanceCheck: failureDetails.currentBalance !== undefined,
	};

	return await sendEmail(
		email,
		TRANSACTION_FAILED_EMAIL.getSubject(data),
		TRANSACTION_FAILED_EMAIL.getText(data),
		TRANSACTION_FAILED_EMAIL.getHTML(data),
	);
}

/**
 * Send account verified confirmation
 *
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @returns {Promise<Object>}
 */
export async function sendAccountVerifiedEmail(email, userName) {
	const data = {
		...getAppDefaults(),
		email,
		userName,
	};

	return await sendEmail(
		email,
		ACCOUNT_VERIFIED_EMAIL.subject(data),
		ACCOUNT_VERIFIED_EMAIL.getText(data),
		ACCOUNT_VERIFIED_EMAIL.getHTML(data),
	);
}

/**
 * Send low balance alert
 *
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @param {number} balance - Current balance
 * @param {number} threshold - Alert threshold
 * @returns {Promise<Object>}
 */
export async function sendLowBalanceEmail(
	email,
	userName,
	balance,
	threshold = 10,
) {
	const data = {
		...getAppDefaults(),
		userName,
		balance,
		threshold,
	};

	return await sendEmail(
		email,
		LOW_BALANCE_EMAIL.subject,
		LOW_BALANCE_EMAIL.getText(data),
		LOW_BALANCE_EMAIL.getHTML(data),
	);
}

/**
 * Send password changed confirmation
 *
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @returns {Promise<Object>}
 */
export async function sendPasswordChangedEmail(email, userName) {
	const data = {
		...getAppDefaults(),
		userName,
	};

	return await sendEmail(
		email,
		PASSWORD_CHANGED_EMAIL.subject,
		PASSWORD_CHANGED_EMAIL.getText(data),
		PASSWORD_CHANGED_EMAIL.getHTML(data),
	);
}

// ============================================
//  UTILITY FUNCTIONS
// ============================================

/**
 * Test email configuration
 * Call this to verify SMTP settings are correct
 *
 * @returns {Promise<boolean>}
 */
export async function testEmailConnection() {
	const transport = getTransporter();

	if (!transport) {
		console.log("⚠️  SMTP not configured - using console mode");
		return true; // Not an error in development
	}

	try {
		await transport.verify();
		console.log("✅ Email server connection verified");
		return true;
	} catch (error) {
		console.error("❌ Email server connection failed:", error.message);
		return false;
	}
}

/**
 * Send test email
 * Use this to test your email setup
 *
 * @param {string} toEmail - Email to send test to
 * @returns {Promise<Object>}
 */
export async function sendTestEmail(toEmail) {
	return await sendEmail(
		toEmail,
		"Test Email from Bank App",
		"This is a test email. If you received this, your email configuration is working!",
		"<p>This is a test email.</p><p>If you received this, your email configuration is working! ✅</p>",
	);
}
