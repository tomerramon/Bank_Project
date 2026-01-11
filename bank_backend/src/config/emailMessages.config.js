import nodemailer from 'nodemailer';

/**
 * Email Service - Handles sending emails for verification, notifications, etc.
 * 
 * Setup required:
 * 1. Add to .env file:
 *    SMTP_HOST=smtp.gmail.com (or your email provider)
 *    SMTP_PORT=587
 *    SMTP_USER=your-email@gmail.com
 *    SMTP_PASS=your-app-password
 *    SMTP_FROM="Bank Name <noreply@yourbank.com>"
 * 
 * For Gmail:
 * - Enable 2-factor authentication
 * - Generate app-specific password: https://myaccount.google.com/apppasswords
 * - Use that password in SMTP_PASS
 * 
 * Alternative email providers:
 * - SendGrid (recommended for production)
 * - AWS SES (cost-effective for high volume)
 * - Mailgun
 * - Postmark
 */

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 * Call this during app startup
 */
function initializeTransporter() {
    if (transporter) {
        return transporter;
    }

    // Validate required environment variables
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
        console.warn(
            `⚠️  Email service not configured. Missing env vars: ${missing.join(', ')}\n` +
            `   Emails will be logged to console instead.`
        );
        return null;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        // For development: log to console instead of sending
        // Remove this in production
        ...(process.env.NODE_ENV === 'development' && {
            streamTransport: true,
            newline: 'unix',
            buffer: true
        })
    });

    return transporter;
}

/**
 * Send email (generic function)
 * 
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @returns {Promise<Object>} - Send result
 */
export async function sendEmail(to, subject, text, html) {
    const transport = initializeTransporter();
    
    const mailOptions = {
        from: process.env.SMTP_FROM || 'Bank App <noreply@bank.com>',
        to,
        subject,
        text, // Plain text fallback
        html, // HTML version
    };

    try {
        // If transporter not configured (development), log to console
        if (!transport) {
            console.log('\n📧 EMAIL (not sent - SMTP not configured)');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Content:', text);
            console.log('─'.repeat(50) + '\n');
            return { messageId: 'dev-' + Date.now() };
        }

        const info = await transport.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

/**
 * Send OTP verification email
 * 
 * @param {string} email - User's email
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} - Send result
 */
export async function sendOTPEmail(email, otp, userName = '') {
    const subject = 'Your Verification Code';
    
    const text = `
Hello ${userName || 'there'},

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Bank App Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4F46E5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .otp-box {
            background-color: white;
            border: 2px solid #4F46E5;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #4F46E5;
            font-family: 'Courier New', monospace;
        }
        .warning {
            color: #dc2626;
            font-size: 14px;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Email Verification</h1>
    </div>
    <div class="content">
        <p>Hello ${userName || 'there'},</p>
        <p>Thank you for signing up! Please use the following verification code to complete your registration:</p>
        
        <div class="otp-box">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Your Verification Code</p>
            <p class="otp-code">${otp}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Valid for 10 minutes</p>
        </div>
        
        <p>Enter this code in the verification screen to activate your account.</p>
        
        <p class="warning">
            ⚠️ If you didn't request this code, please ignore this email.
            Never share this code with anyone.
        </p>
    </div>
    <div class="footer">
        <p>This is an automated message, please do not reply.</p>
        <p>© 2024 Bank App. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim();

    return await sendEmail(email, subject, text, html);
}

/**
 * Send welcome email after successful verification
 * 
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @param {number} balance - Initial balance
 * @returns {Promise<Object>} - Send result
 */
export async function sendWelcomeEmail(email, userName, balance) {
    const subject = 'Welcome to Bank App! 🎉';
    
    const text = `
Hello ${userName},

Welcome to Bank App! Your account has been successfully verified.

Your account details:
- Email: ${email}
- Initial Balance: $${balance.toFixed(2)}

You can now:
✅ View your balance
✅ Send money to other users
✅ Track your transactions

Log in now to get started: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions, feel free to reach out to our support team.

Best regards,
Bank App Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .info-box {
            background-color: white;
            border-left: 4px solid #4F46E5;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 10px 0;
            padding-left: 30px;
            position: relative;
        }
        .feature-list li:before {
            content: "✅";
            position: absolute;
            left: 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to Bank App!</h1>
        <p>Your account is now active</p>
    </div>
    <div class="content">
        <p>Hello ${userName},</p>
        <p>Congratulations! Your account has been successfully verified.</p>
        
        <div class="info-box">
            <p><strong>Your Account Details:</strong></p>
            <p>📧 Email: ${email}</p>
            <p>💰 Initial Balance: <strong>$${balance.toFixed(2)}</strong></p>
        </div>
        
        <p><strong>What you can do now:</strong></p>
        <ul class="feature-list">
            <li>View your real-time balance</li>
            <li>Send money to other users instantly</li>
            <li>Track all your transactions</li>
            <li>Manage your account securely</li>
        </ul>
        
        <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="cta-button">
                Login Now
            </a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            If you have any questions or need assistance, our support team is here to help.
        </p>
    </div>
</body>
</html>
    `.trim();

    return await sendEmail(email, subject, text, html);
}

/**
 * Send transaction notification email
 * 
 * @param {string} email - User's email
 * @param {Object} transaction - Transaction details
 * @returns {Promise<Object>} - Send result
 */
export async function sendTransactionEmail(email, transaction) {
    const { direction, amount, peerEmail, balance } = transaction;
    const isIncoming = direction === 'T_IN';
    
    const subject = isIncoming 
        ? `You received $${amount.toFixed(2)}` 
        : `You sent $${amount.toFixed(2)}`;
    
    const text = `
Transaction Notification

${isIncoming ? 'You received' : 'You sent'} $${amount.toFixed(2)}
${isIncoming ? 'From' : 'To'}: ${peerEmail}
New Balance: $${balance.toFixed(2)}

Transaction Date: ${new Date().toLocaleString()}

For security, if you did not authorize this transaction, please contact support immediately.

Best regards,
Bank App Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${isIncoming ? '#059669' : '#dc2626'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .amount { font-size: 32px; font-weight: bold; color: ${isIncoming ? '#059669' : '#dc2626'}; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${isIncoming ? '💰 Money Received' : '💸 Money Sent'}</h1>
    </div>
    <div class="content">
        <p class="amount">${isIncoming ? '+' : '-'}$${amount.toFixed(2)}</p>
        <p><strong>${isIncoming ? 'From' : 'To'}:</strong> ${peerEmail}</p>
        <p><strong>New Balance:</strong> $${balance.toFixed(2)}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p style="font-size: 12px; color: #6b7280;">
            ⚠️ If you did not authorize this transaction, please contact support immediately.
        </p>
    </div>
</body>
</html>
    `.trim();

    return await sendEmail(email, subject, text, html);
}

/**
 * Send password reset email
 * 
 * @param {string} email - User's email
 * @param {string} otp - Reset OTP
 * @returns {Promise<Object>} - Send result
 */
export async function sendPasswordResetEmail(email, otp) {
    const subject = 'Password Reset Request';
    
    const text = `
Password Reset Request

You requested to reset your password. Use this code to reset it:

${otp}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Bank App Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Password Reset</h1>
    </div>
    <div class="content">
        <p>You requested to reset your password.</p>
        <p>Use this code to reset it:</p>
        <p class="otp-code">${otp}</p>
        <p style="color: #dc2626;">⚠️ This code expires in 10 minutes.</p>
        <p style="font-size: 12px; color: #6b7280;">
            If you didn't request this, please ignore this email.
        </p>
    </div>
</body>
</html>
    `.trim();

    return await sendEmail(email, subject, text, html);
}

export default {
    sendEmail,
    sendOTPEmail,
    sendWelcomeEmail,
    sendTransactionEmail,
    sendPasswordResetEmail
};