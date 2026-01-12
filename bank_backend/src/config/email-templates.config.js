/**
 * Email Templates Configuration
 * 
 * All email content (subjects, text, HTML) is stored here for easy reuse and modification.
 * This makes it easy to update email content without touching the service code.
 */

import { VERIFICATION } from './constants.config.js';

/**
 * Common email styles (reused across templates)
 */
const COMMON_STYLES = `
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
    .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 12px;
        color: #6b7280;
    }
`;

/**
 * OTP Verification Email Template
 */
export const OTP_EMAIL = {
    // Email subject
    subject: 'Your Verification Code',
    
    // Plain text version (for email clients that don't support HTML)
    getText: (data) => `
Hello ${data.userName || 'there'},

Your verification code is: ${data.otp}

This code will expire in ${data.expiryMinutes || 10} minutes.

If you didn't request this code, please ignore this email.

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    // HTML version (for modern email clients)
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
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
    </style>
</head>
<body>
    <div class="header">
        <h1>Email Verification</h1>
    </div>
    <div class="content">
        <p>Hello ${data.userName || 'there'},</p>
        <p>Thank you for signing up! Please use the following verification code to complete your registration:</p>
        
        <div class="otp-box">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Your Verification Code</p>
            <p class="otp-code">${data.otp}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Valid for ${data.expiryMinutes || 10} minutes</p>
        </div>
        
        <p>Enter this code in the verification screen to activate your account.</p>
        
        <p class="warning">
            ⚠️ If you didn't request this code, please ignore this email.
            Never share this code with anyone.
        </p>
    </div>
    <div class="footer">
        <p>This is an automated message, please do not reply.</p>
        <p>© 2024 ${data.appName || 'Bank App'}. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Welcome Email Template
 */
export const WELCOME_EMAIL = {
    subject: (data) => `Welcome to ${data.appName || 'Bank App'}! 🎉`,
    
    getText: (data) => `
Hello ${data.userName},

Welcome to ${data.appName || 'Bank App'}! Your account has been successfully verified.

Your account details:
- Email: ${data.email}
- Initial Balance: $${data.balance.toFixed(2)}

You can now:
✅ View your balance
✅ Send money to other users
✅ Track your transactions

Log in now to get started: ${data.loginUrl}

If you have any questions, feel free to reach out to our support team.

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
        .header {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
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
        <h1>🎉 Welcome to ${data.appName || 'Bank App'}!</h1>
        <p>Your account is now active</p>
    </div>
    <div class="content">
        <p>Hello ${data.userName},</p>
        <p>Congratulations! Your account has been successfully verified.</p>
        
        <div class="info-box">
            <p><strong>Your Account Details:</strong></p>
            <p>📧 Email: ${data.email}</p>
            <p>💰 Initial Balance: <strong>$${data.balance.toFixed(2)}</strong></p>
        </div>
        
        <p><strong>What you can do now:</strong></p>
        <ul class="feature-list">
            <li>View your real-time balance</li>
            <li>Send money to other users instantly</li>
            <li>Track all your transactions</li>
            <li>Manage your account securely</li>
        </ul>
        
        <center>
            <a href="${data.loginUrl}" class="cta-button">
                Login Now
            </a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            If you have any questions or need assistance, our support team is here to help.
        </p>
    </div>
    <div class="footer">
        <p>© 2024 ${data.appName || 'Bank App'}. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Transaction Notification Email Template
 */
export const TRANSACTION_EMAIL = {
    getSubject: (data) => {
        const isIncoming = data.direction === 'T_IN';
        return isIncoming 
            ? `You received $${data.amount.toFixed(2)}` 
            : `You sent $${data.amount.toFixed(2)}`;
    },
    
    getText: (data) => {
        const isIncoming = data.direction === 'T_IN';
        return `
Transaction Notification

${isIncoming ? 'You received' : 'You sent'} $${data.amount.toFixed(2)}
${isIncoming ? 'From' : 'To'}: ${data.peerEmail}
New Balance: $${data.balance.toFixed(2)}

Transaction Date: ${new Date().toLocaleString()}

For security, if you did not authorize this transaction, please contact support immediately.

Best regards,
${data.appName || 'Bank App'} Team
        `.trim();
    },
    
    getHTML: (data) => {
        const isIncoming = data.direction === 'T_IN';
        const headerColor = isIncoming ? '#059669' : '#dc2626';
        const icon = isIncoming ? '💰' : '💸';
        const title = isIncoming ? 'Money Received' : 'Money Sent';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background-color: ${headerColor}; 
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
        .amount { 
            font-size: 32px; 
            font-weight: bold; 
            color: ${headerColor}; 
            margin: 20px 0; 
            text-align: center;
        }
        .detail-row {
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${icon} ${title}</h1>
    </div>
    <div class="content">
        <p class="amount">${isIncoming ? '+' : '-'}$${data.amount.toFixed(2)}</p>
        
        <div class="detail-row">
            <strong>${isIncoming ? 'From' : 'To'}:</strong> ${data.peerEmail}
        </div>
        <div class="detail-row">
            <strong>New Balance:</strong> $${data.balance.toFixed(2)}
        </div>
        <div class="detail-row">
            <strong>Date:</strong> ${new Date().toLocaleString()}
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
            ⚠️ If you did not authorize this transaction, please contact support immediately.
        </p>
    </div>
</body>
</html>
        `.trim();
    }
};

/**
 * Password Reset Email Template
 */
export const PASSWORD_RESET_EMAIL = {
    subject: 'Password Reset Request',
    
    getText: (data) => `
Password Reset Request

You requested to reset your password. Use this code to reset it:

${data.otp}

This code will expire in ${data.expiryMinutes || 10} minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background-color: #dc2626; 
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
        .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 5px; 
            color: #dc2626; 
            text-align: center; 
            margin: 20px 0; 
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Password Reset</h1>
    </div>
    <div class="content">
        <p>You requested to reset your password.</p>
        <p>Use this code to reset it:</p>
        <p class="otp-code">${data.otp}</p>
        <p style="color: #dc2626; text-align: center;">
            ⚠️ This code expires in ${data.expiryMinutes || 10} minutes.
        </p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
            If you didn't request this, please ignore this email.
        </p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Account Locked Email Template
 */
export const ACCOUNT_LOCKED_EMAIL = {
    subject: 'Account Security Alert - Account Locked',
    
    getText: (data) => `
Security Alert

Your account has been temporarily locked due to multiple failed login attempts.

Account will be unlocked: ${data.unlockTime}

If this wasn't you, please contact support immediately.

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
        .header { background-color: #dc2626; }
        .alert-box {
            background-color: #fef2f2;
            border: 2px solid #dc2626;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Security Alert</h1>
    </div>
    <div class="content">
        <div class="alert-box">
            <p><strong>Your account has been temporarily locked</strong></p>
            <p>Reason: Multiple failed login attempts</p>
            <p>Account will be unlocked: <strong>${data.unlockTime}</strong></p>
        </div>
        <p>If this wasn't you, please contact support immediately.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Transaction Failed Email Template
 */
export const TRANSACTION_FAILED_EMAIL = {
    getSubject: (data) => `Transaction Failed - ${data.reason}`,
    
    getText: (data) => `
Transaction Failed

We were unable to process your transaction.

Reason: ${data.reason}
Amount: ${data.amount.toFixed(2)}
To: ${data.toEmail}
Time: ${new Date().toLocaleString()}

${data.balanceCheck ? `Your current balance: ${data.currentBalance.toFixed(2)}` : ''}

Please try again or contact support if the problem persists.

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
        .header { background-color: #dc2626; }
        .error-box {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .detail-row {
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>❌ Transaction Failed</h1>
    </div>
    <div class="content">
        <div class="error-box">
            <p><strong>We were unable to process your transaction</strong></p>
            <p style="color: #dc2626;">Reason: ${data.reason}</p>
        </div>
        
        <h3>Transaction Details:</h3>
        <div class="detail-row">
            <strong>Amount:</strong> ${data.amount.toFixed(2)}
        </div>
        <div class="detail-row">
            <strong>To:</strong> ${data.toEmail}
        </div>
        <div class="detail-row">
            <strong>Time:</strong> ${new Date().toLocaleString()}
        </div>
        ${data.balanceCheck ? `
        <div class="detail-row">
            <strong>Your Balance:</strong> ${data.currentBalance.toFixed(2)}
        </div>
        ` : ''}
        
        <p style="margin-top: 20px;">
            Please try again or contact our support team if the problem persists.
        </p>
    </div>
    <div class="footer">
        <p>© 2024 ${data.appName || 'Bank App'}. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Account Verified Email Template
 */
export const ACCOUNT_VERIFIED_EMAIL = {
    subject: (data) => `Account Verified - Welcome to ${data.appName || 'Bank App'}! 🎉`,
    
    getText: (data) => `
Great News!

Hello ${data.userName},

Your account has been successfully verified! You now have full access to all features.

What you can do:
✅ Send and receive money instantly
✅ View transaction history
✅ Manage your account settings
✅ Contact customer support

Your account details:
- Email: ${data.email}
- Account Status: Verified ✅

Start using your account: ${data.loginUrl}

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
        .header {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }
        .success-badge {
            background-color: #d1fae5;
            color: #065f46;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .feature-card {
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .cta-button {
            display: inline-block;
            background-color: #059669;
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
        <h1>🎉 Account Verified!</h1>
    </div>
    <div class="content">
        <p>Hello ${data.userName},</p>
        
        <center>
            <div class="success-badge">
                ✅ Your Account is Verified
            </div>
        </center>
        
        <p>Congratulations! Your account verification is complete. You now have full access to all features.</p>
        
        <h3>What You Can Do Now:</h3>
        <div class="feature-grid">
            <div class="feature-card">
                <strong>💸 Send Money</strong>
                <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Transfer funds instantly to other users</p>
            </div>
            <div class="feature-card">
                <strong>💰 Receive Money</strong>
                <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Get paid from anyone, anytime</p>
            </div>
            <div class="feature-card">
                <strong>📊 Track Transactions</strong>
                <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">View your complete transaction history</p>
            </div>
            <div class="feature-card">
                <strong>⚙️ Manage Account</strong>
                <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Update settings and preferences</p>
            </div>
        </div>
        
        <center>
            <a href="${data.loginUrl}" class="cta-button">
                Start Banking Now
            </a>
        </center>
    </div>
    <div class="footer">
        <p>© 2024 ${data.appName || 'Bank App'}. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Low Balance Alert Email Template
 */
export const LOW_BALANCE_EMAIL = {
    subject: 'Low Balance Alert',
    
    getText: (data) => `
Low Balance Alert

Hello ${data.userName},

Your account balance is running low.

Current Balance: ${data.balance.toFixed(2)}
Alert Threshold: ${data.threshold.toFixed(2)}

Consider adding funds to avoid transaction failures.

View your account: ${data.loginUrl}

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
        .header { background-color: #f59e0b; }
        .warning-box {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .balance-display {
            font-size: 32px;
            font-weight: bold;
            color: #f59e0b;
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚠️ Low Balance Alert</h1>
    </div>
    <div class="content">
        <p>Hello ${data.userName},</p>
        
        <div class="warning-box">
            <p><strong>Your account balance is running low</strong></p>
        </div>
        
        <p class="balance-display">${data.balance.toFixed(2)}</p>
        
        <p style="text-align: center; color: #6b7280;">
            Alert Threshold: ${data.threshold.toFixed(2)}
        </p>
        
        <p>Consider adding funds to avoid transaction failures and ensure uninterrupted service.</p>
    </div>
    <div class="footer">
        <p>© 2024 ${data.appName || 'Bank App'}. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Password Changed Confirmation Email Template
 */
export const PASSWORD_CHANGED_EMAIL = {
    subject: 'Password Changed Successfully',
    
    getText: (data) => `
Password Changed

Hello ${data.userName},

Your password was changed successfully on ${new Date().toLocaleString()}.

If you made this change, no action is needed.

If you didn't change your password, please contact support immediately and secure your account.

Best regards,
${data.appName || 'Bank App'} Team
    `.trim(),
    
    getHTML: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${COMMON_STYLES}
        .header { background-color: #059669; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Password Changed</h1>
    </div>
    <div class="content">
        <p>Hello ${data.userName},</p>
        
        <p>Your password was changed successfully on <strong>${new Date().toLocaleString()}</strong>.</p>
        
        <p style="color: #059669;">✅ If you made this change, no action is needed.</p>
        
        <p style="color: #dc2626;">❌ If you didn't change your password, please contact support immediately to secure your account.</p>
    </div>
    <div class="footer">
        <p>© 2024 ${data.appName || 'Bank App'}. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
};

/**
 * Helper function to get app-specific data
 */
export function getAppDefaults() {
    return {
        appName: process.env.APP_NAME || 'Bank App',
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        expiryMinutes: VERIFICATION.OTP_EXPIRY_MINUTES || 10
    };
}

export default {
    OTP_EMAIL,
    WELCOME_EMAIL,
    TRANSACTION_EMAIL,
    PASSWORD_RESET_EMAIL,
    ACCOUNT_LOCKED_EMAIL,
    TRANSACTION_FAILED_EMAIL,
    ACCOUNT_VERIFIED_EMAIL,
    LOW_BALANCE_EMAIL,
    PASSWORD_CHANGED_EMAIL,
    getAppDefaults
};