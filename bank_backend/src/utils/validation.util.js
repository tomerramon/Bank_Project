/**
 * User Validation Utilities
 * 
 * Centralizes all user-related validations that are repeated across services.
 * This eliminates duplication and ensures consistent behavior.
 */

import {
    UserNotFoundError,
    UnverifiedAccountError,
    InactiveAccountError,
    AccountLockedError
} from './errors.util.js';
import { ACCOUNT_STATUS } from '../config/constants.config.js';

/**
 * Ensure user exists
 * Throws UserNotFoundError if user is null/undefined
 * 
 * @param {Object|null} user - User object
 * @param {string} identifier - Optional identifier for error message
 * @throws {UserNotFoundError}
 * @returns {Object} - The same user object (for chaining)
 */
export function requireUserExists(user, identifier = '') {
    if (!user) {
        throw new UserNotFoundError(identifier);
    }
    return user;
}

/**
 * Ensure user account is verified
 * Throws UnverifiedAccountError if not verified
 * 
 * @param {Object} user - User object with isVerified field
 * @throws {UnverifiedAccountError}
 * @returns {Object} - The same user object (for chaining)
 */
export function requireVerifiedAccount(user) {
    if (!user.isVerified) {
        throw new UnverifiedAccountError();
    }
    return user;
}

/**
 * Ensure user account is active
 * Throws InactiveAccountError if account is suspended or closed
 * 
 * @param {Object} user - User object with accountStatus field
 * @throws {InactiveAccountError}
 * @returns {Object} - The same user object (for chaining)
 */
export function requireActiveAccount(user) {
    if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
        const messages = {
            [ACCOUNT_STATUS.SUSPENDED]: 'Your account has been suspended. Please contact support.',
            [ACCOUNT_STATUS.CLOSED]: 'This account has been closed.'
        };
        throw new InactiveAccountError(
            messages[user.accountStatus] || 'Account is not active'
        );
    }
    return user;
}

/**
 * Ensure account is not locked
 * Throws AccountLockedError if account is locked
 * 
 * @param {Object} user - User object with accountLockedUntil field
 * @throws {AccountLockedError}
 * @returns {Object} - The same user object (for chaining)
 */
export function requireUnlockedAccount(user) {
    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
        const lockTimeRemaining = Math.ceil(
            (user.accountLockedUntil - Date.now()) / (60 * 1000)
        );
        throw new AccountLockedError(lockTimeRemaining);
    }
    return user;
}

/**
 * Complete user validation for authenticated operations
 * Checks: exists, verified, active, not locked
 * 
 * This is the most commonly needed validation sequence.
 * Use this instead of calling individual checks.
 * 
 * @param {Object|null} user - User object
 * @param {string} identifier - Optional identifier for error message
 * @throws {UserNotFoundError|UnverifiedAccountError|InactiveAccountError|AccountLockedError}
 * @returns {Object} - The validated user object
 * 
 * @example
 * const user = await Users.findById(userId);
 * validateUserForOperation(user);  // All checks in one call!
 */
export function validateUserForOperation(user, identifier = '') {
    requireUserExists(user, identifier);
    requireVerifiedAccount(user);
    requireActiveAccount(user);
    requireUnlockedAccount(user);
    return user;
}

/**
 * Validate user can send money
 * Same as validateUserForOperation (all checks required)
 * 
 * @param {Object} user - User object
 * @throws {UserNotFoundError|UnverifiedAccountError|InactiveAccountError|AccountLockedError}
 * @returns {Object} - The validated user object
 */
export function validateUserCanSendMoney(user) {
    return validateUserForOperation(user, 'Sender');
}

/**
 * Validate user can receive money
 * Requires: exists, verified, active (no lock check needed for receiving)
 * 
 * @param {Object} user - User object
 * @throws {UserNotFoundError|UnverifiedAccountError|InactiveAccountError}
 * @returns {Object} - The validated user object
 */
export function validateUserCanReceiveMoney(user) {
    requireUserExists(user, 'Receiver');
    requireVerifiedAccount(user);
    requireActiveAccount(user);
    return user;
}

/**
 * Check if account is currently locked
 * Returns boolean instead of throwing (for conditional logic)
 * 
 * @param {Object} user - User object
 * @returns {boolean} - true if locked
 */
export function isAccountLocked(user) {
    return user.accountLockedUntil && user.accountLockedUntil > Date.now();
}

/**
 * Check if account needs verification
 * 
 * @param {Object} user - User object
 * @returns {boolean} - true if needs verification
 */
export function needsVerification(user) {
    return !user.isVerified;
}

/**
 * Check if account is active
 * 
 * @param {Object} user - User object
 * @returns {boolean} - true if active
 */
export function isAccountActive(user) {
    return user.accountStatus === ACCOUNT_STATUS.ACTIVE;
}

/**
 * Get account status message for display
 * 
 * @param {Object} user - User object
 * @returns {string} - Human-readable status message
 */
export function getAccountStatusMessage(user) {
    if (!user.isVerified) {
        return 'Account not verified';
    }
    
    if (isAccountLocked(user)) {
        const minutes = Math.ceil((user.accountLockedUntil - Date.now()) / 60000);
        return `Account locked for ${minutes} more minutes`;
    }
    
    switch (user.accountStatus) {
        case ACCOUNT_STATUS.ACTIVE:
            return 'Account active';
        case ACCOUNT_STATUS.SUSPENDED:
            return 'Account suspended';
        case ACCOUNT_STATUS.CLOSED:
            return 'Account closed';
        default:
            return 'Unknown status';
    }
}

/**
 * Sanitize user object for public display
 * Removes sensitive fields (passwordHash, refreshTokens, etc.)
 * 
 * @param {Object} user - User object from database
 * @returns {Object} - Sanitized user object
 */
export function sanitizeUser(user) {
    // Convert to plain object if it's a Mongoose document
    const plainUser = user.toObject ? user.toObject() : user;
    
    // Remove sensitive fields
    const {
        passwordHash,
        refreshTokens,
        __v,
        failedLoginAttempts,
        accountLockedUntil,
        ...safeUser
    } = plainUser;
    
    return safeUser;
}

/**
 * Sanitize user for token payload (minimal data)
 * Only includes data needed for authentication
 * 
 * @param {Object} user - User object
 * @returns {Object} - Minimal user data for JWT
 */
export function sanitizeUserForToken(user) {
    return {
        id: user._id || user.id,
        email: user.email
    };
}

/**
 * Sanitize user for public profile
 * Includes only safe, non-sensitive fields
 * 
 * @param {Object} user - User object
 * @returns {Object} - Public profile data
 */
export function sanitizeUserForPublicProfile(user) {
    return {
        id: user._id || user.id,
        email: user.email,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        profile: user.profile || {}
    };
}

/**
 * Check if two users are the same
 * 
 * @param {Object|string} user1 - User object or ID
 * @param {Object|string} user2 - User object or ID
 * @returns {boolean} - true if same user
 */
export function isSameUser(user1, user2) {
    const id1 = typeof user1 === 'string' ? user1 : (user1._id || user1.id).toString();
    const id2 = typeof user2 === 'string' ? user2 : (user2._id || user2.id).toString();
    return id1 === id2;
}

/**
 * Validate user IDs are different (prevent self-operations)
 * 
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {string} operation - Operation name for error message
 * @throws {BusinessRuleError} - If users are the same
 */
export function requireDifferentUsers(userId1, userId2, operation = 'operation') {
    if (isSameUser(userId1, userId2)) {
        throw new BusinessRuleError(`Cannot perform ${operation} with yourself`);
    }
}

// Export all functions
export default {
    requireUserExists,
    requireVerifiedAccount,
    requireActiveAccount,
    requireUnlockedAccount,
    validateUserForOperation,
    validateUserCanSendMoney,
    validateUserCanReceiveMoney,
    isAccountLocked,
    needsVerification,
    isAccountActive,
    getAccountStatusMessage,
    sanitizeUser,
    sanitizeUserForToken,
    sanitizeUserForPublicProfile,
    isSameUser,
    requireDifferentUsers
};