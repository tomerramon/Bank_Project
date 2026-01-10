import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "./jwt.service.js";
import Users from '../models/user.model.js';

/**
 * Authenticate user with email and password
 * Implements security features:
 * - Account locking after failed attempts
 * - Account status validation
 * - Email verification requirement
 * 
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} - Access token, refresh token, and user info
 */
export async function AuthenticateUser(email, password) {
    // Find user by email and include passwordHash (normally excluded by select: false)
    const user = await Users.findOne({ email }).select('+passwordHash');

    // Security: Use same error message for "user not found" and "wrong password"
    // This prevents attackers from discovering which emails are registered
    const authError = new Error("Authentication failed: Invalid email or password.");

    if (!user) {
        throw authError;
    }

    // Check if account is suspended or closed
    if (user.accountStatus !== 'active') {
        const statusMessages = {
            suspended: 'Your account has been suspended. Please contact support.',
            closed: 'This account has been closed.'
        };
        throw new Error(statusMessages[user.accountStatus] || 'Account is not active');
    }

    // Check if account is locked due to failed login attempts
    if (await user.isAccountLocked()) {
        const lockTimeRemaining = Math.ceil(
            (user.accountLockedUntil - Date.now()) / (60 * 1000)
        );
        throw new Error(
            `Account is locked due to too many failed login attempts. ` +
            `Please try again in ${lockTimeRemaining} minutes.`
        );
    }

    // Verify password using bcrypt
    // bcrypt.compare is secure against timing attacks
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordMatch) {
        // Increment failed login attempts
        await user.incrementLoginAttempts();

        // Check if account should now be locked (after increment)
        if (user.failedLoginAttempts >= 5) {
            throw new Error(
                'Too many failed login attempts. ' +
                'Your account has been locked for 30 minutes.'
            );
        }
        
        throw authError;
    }

    // Require email verification before allowing login
    if (!user.isVerified) {
        throw new Error(
            'Please verify your email address before logging in. ' +
            'Check your inbox for the verification code.'
        );
    }

    // Successful login - reset failed attempts counter
    await user.resetLoginAttempts();

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in database for validation and revocation
    user.refreshTokens.push({
        token: refreshToken,
        createdAt: new Date(),
    });

    await user.save();

    return {
        token: accessToken,
        refreshToken: refreshToken,
        user: {
            id: user._id,
            email: user.email,
            balance: user.balance,
            isVerified: user.isVerified,
            accountStatus: user.accountStatus
        }
    };
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password 
 * @returns {string[]} - Array of error messages (empty if valid)
 */
function validatePassword(password) {
    const errors = [];

    if (!password) {
        errors.push('Password is required');
        return errors; 
    }
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return errors;
}

/**
 * Register a new user (validation only)
 * More detailed validation happens in user.service.js
 * This provides early validation before database operations
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {string} phone 
 * @returns {boolean} - true if validation passes
 * @throws {Error} - If validation fails with details
 */
export async function validateInfo(email, password, phone) {
    const errors = [];

    // Email validation using regex
    // Matches: local-part@domain.tld
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push("Invalid email format");
    }

    const passwordErrors = validatePassword(password);
    errors.push(...passwordErrors);

    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phone || !phoneRegex.test(phone)) {
        errors.push('Invalid phone number format. Must be 9-15 digits, optionally starting with +');
    }

    // If any validation errors, throw with all messages
    if (errors.length > 0) {
        const error = new Error('Validation failed');
        error.errors = errors;
        throw error;
    }

    return true;
}

/**
 * Change user password (requires old password verification)
 * This is more secure than password reset which might use email
 * 
 * @param {string} userId 
 * @param {string} oldPassword 
 * @param {string} newPassword 
 * @returns {Promise<Object>} - Success message
 */
export async function changePassword(userId, oldPassword, newPassword) {
    const user = await Users.findById(userId).select('+passwordHash');

    if (!user) {
        throw new Error("User not found");
    }

    // Verify old password matches the current password
    const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordMatch) {
        throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    await validateInfo(user.email, newPassword, user.phone);

    // Hash new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);

    // Security: Invalidate all existing refresh tokens
    // This forces re-login on all devices
    user.refreshTokens = [];

    await user.save();

    return { message: 'Password changed successfully. Please log in again.' };
}