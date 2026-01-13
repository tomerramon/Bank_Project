/**
 * User Service
 * 
 * Handles all user-related business logic:
 * - User creation and management
 * - Profile updates
 * - Balance checks
 * - User statistics
 */

import bcrypt from "bcryptjs";
import Users from '../models/user.model.js';
import Transactions from '../models/transaction.model.js';
import { centsToDollars } from '../utils/currency.util.js';
import {
    EmailExistsError, PhoneExistsError,
    ValidationError, UserNotFoundError,
} from "../utils/errors.util.js";
import { sendAccountVerifiedEmail, sendLowBalanceEmail, } from "../services/email.service.js";
import { sendAccountVerifiedSMS, sendLowBalanceSMS, } from "../services/sms.service.js";
import { sanitizeUser, sanitizeUserForToken } from "../utils/userValidation.util.js";
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Check if user exists by email or phone
 * Throws appropriate error if exists
 * 
 * @param {string} email - User email
 * @param {string} phone - User phone
 * @throws {EmailExistsError|PhoneExistsError}
 */
async function checkUserExists(email, phone) {
        // Check email
        const existingEmail = await Users.findOne({ email });
        if (existingEmail) {
            throw new EmailExistsError();
        }

        // Check phone
        const existingPhone = await Users.findOne({ phone });
        if (existingPhone) {
            throw new PhoneExistsError();
        }
    }


/**
 * Send notification asynchronously (fire and forget)
 * 
 * @param {Function} sendFunction - Notification function
 * @param {Array} args - Arguments for function
 * @param {string} description - Description for logging
 */
function sendNotification(sendFunction, args, description) {
    sendFunction(...args)
        .then(() => console.log(`✅ ${description} sent`))
        .catch(err => console.error(`❌ ${description} failed:`, err.message));
}


// ============================================
// USER FIND OPERATIONS
// ============================================
/**
 * Find user by email
 * 
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User document or null
 */
export async function FindUserByEmail(email) {
    return await Users.findOne({ email });
}

/**
 * Find user by ID
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User document or null
 */
export async function findUserById(userId) {
    return await Users.findById(userId)
        .select('email phone balance isVerified profile accountStatus createdAt');
}

/**
 * Find user by phone number
 * 
 * @param {string} phone - Phone number
 * @returns {Promise<Object|null>} - User document or null
 */
export async function findUserByPhone(phone) {
    return await Users.findOne({ phone });
}

// ============================================
// USER CREATION
// ============================================
/**
 * Create a new user
 * 
 * @param {string} email - User email
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} phone - User phone number
 * @returns {Promise<Object>} - Created user (sanitized)
 * @throws {ValidationError|EmailExistsError|PhoneExistsError}
 */
export async function createUser(email, password, phone) {
    // Validate required fields
    if (!email || !password || !phone) {
        throw new ValidationError("Email, password, and phone are required");
    }
    // Check if user already exists
    await checkUserExists(email, phone);

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = await Users.create({
            email,
            passwordHash: hashedPassword,
            phone,
        });
        console.log(`✅ User created: ${email} (ID: ${newUser._id})`);

        return {
            id: newUser._id,
            email: newUser.email,
            phone: newUser.phone,
            balance: newUser.balance,
            isVerified: newUser.isVerified,
            accountStatus: newUser.accountStatus,
            createdAt: newUser.createdAt
        };
    }
    catch (error) {
        // Handle MongoDB duplicate key errors (race condition)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            if (field === 'email') {
                throw new EmailExistsError();
            } else if (field === 'phone') {
                throw new PhoneExistsError();
            }
            throw new Error(`${field} is already in use`);
        }

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            throw new ValidationError(messages);
        }

        // Re-throw unknown errors
        throw error;
    }
}

// ============================================
// USER VERIFICATION
// ============================================
/**
 * Mark user as verified
 * Called after successful OTP verification
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user
 * @throws {UserNotFoundError}
 */
export async function setVerifyUser(userId) {
    const user = await Users.findByIdAndUpdate(
        userId,
        { $set: { isVerified: true } },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new UserNotFoundError();
    }

    console.log(`✅ User verified: ${user.email}`);

    const userName = user.profile?.firstName || 'there';

    // Send verified notifications (async)
    sendNotification(
        sendAccountVerifiedEmail,
        [user.email, userName],
        'Account verified email'
    );

    sendNotification(
        sendAccountVerifiedSMS,
        [user.phone, userName],
        'Account verified SMS'
    );

    return user;
}


// ============================================
// USER PROFILE
// ============================================
/**
 * Get user profile with balance and recent transactions
 * 
 * @param {string} userId - User ID
 * @param {number} limit - Number of recent transactions (default: 10)
 * @returns {Promise<Object>} - User profile with transactions
 * @throws {UserNotFoundError}
 */
export async function getUserProfile(userId, lim = 10) {
    const user = await Users.findById(userId);

    if (!user) {
        throw new UserNotFoundError();
    }

    // Get recent transactions
    const recentTransactions = await Transactions.find({ userId })
        .sort({ createdAt: -1 })
        .limit(lim)
        .populate('peerUserId', 'email')
        .lean();

    // Convert transaction amounts to dollars
    const transactionsWithDollars = recentTransactions.map(t => ({
        ...t,
        amountInDollars: centsToDollars(t.amount),
        formattedAmount: t.direction === 'T_IN'
            ? `+$${centsToDollars(t.amount).toFixed(2)}`
            : `-$${centsToDollars(t.amount).toFixed(2)}`
    }));

    return {
        id: user._id,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        balanceInDollars: centsToDollars(user.balance),
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        profile: user.profile,
        createdAt: user.createdAt,
        recentTransactions: transactionsWithDollars
    };
}

/**
 * Update user profile information
 * Only allows updating safe fields (not balance, email, etc.)
 * 
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated user profile
 * @throws {UserNotFoundError|ValidationError}
 */
export async function updateUserProfile(userId, updates) {
    // Define allowed fields
    const allowedFields = [
        'profile.firstName',
        'profile.lastName',
        'profile.dateOfBirth',
        'profile.address.street',
        'profile.address.city',
        'profile.address.country',
        'profile.address.zipCode'
    ];

    // Filter to only allowed fields
    const approvedUpdates = {};
    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            approvedUpdates[key] = updates[key];
        }
    });

    // Check if any valid fields to update
    if (Object.keys(approvedUpdates).length === 0) {
        throw new ValidationError("No valid fields to update");
    }

    // Update user
    const user = await Users.findByIdAndUpdate(
        userId,
        { $set: approvedUpdates },
        {
            new: true, // Return updated document
            runValidators: true // Run schema validators
        }
    );

    if (!user) {
        throw new UserNotFoundError();
    }

    console.log(`✅ Profile updated for user: ${user.email}`);

    return {
        id: user._id,
        email: user.email,
        phone: user.phone,
        profile: user.profile
    };
}

// ============================================
// BALANCE OPERATIONS
// ============================================
/**
 * Update user balance (internal use only)
 * This should only be called from transaction service
 * 
 * @param {string} userId - User ID
 * @param {number} amountInCents - Amount to add/subtract in cents
 * @param {Object} session - MongoDB session for transactions
 * @returns {Promise<Object>} - Update result
 * @throws {UserNotFoundError}
 */
export async function updateUserBalance(userId, amountInCents, session = null) {

    const updateResult = await Users.updateOne(
        { _id: userId },
        { $inc: { balance: amountInCents } },
        { session }
    );

    if (updateResult.matchedCount === 0) {
        throw new UserNotFoundError();
    }

    return updateResult;
}

/**
 * Check if user balance is low and send alert
 * Call this after transactions or periodically
 * 
 * @param {string} userId - User ID
 * @param {number} thresholdDollars - Alert threshold in dollars (default: 10)
 * @returns {Promise<boolean>} - true if alert sent
 */
export async function checkAndAlertLowBalance(userId, thresholdDollars = 10) {
    const user = await Users.findById(userId)
        .select('email phone balance profile');

    if (!user) {
        return false;
    }

    const balanceInDollars = centsToDollars(user.balance);

    // If balance is below threshold, send alerts
    if (balanceInDollars < thresholdDollars) {
        const userName = user.profile?.firstName || 'there';

        console.log(`⚠️  Low balance alert for ${user.email}: $${balanceInDollars.toFixed(2)}`);

        // Send email alert
        sendNotification(
            sendLowBalanceEmail,
            [user.email, userName, balanceInDollars, thresholdDollars],
            'Low balance email'
        );

        // Send SMS alert
        sendNotification(
            sendLowBalanceSMS,
            [user.phone, balanceInDollars, thresholdDollars],
            'Low balance SMS'
        );

        return true;
    }

    return false;
}

// ============================================
// USER STATISTICS
// ============================================
/**
 * Get user statistics
 * Aggregates transaction data for analytics
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User statistics
 * @throws {UserNotFoundError}
 */
export async function getUserStatistics(userId) {
    const user = await Users.findById(userId);

    if (!user) {
        throw new UserNotFoundError();
    }

    // Aggregate transaction statistics
    const stats = await Transactions.aggregate([
        { $match: { userId: user._id } },
        {
            $group: {
                _id: '$direction',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    // Convert aggregation results to readable format
    const statsMap = stats.reduce((acc, stat) => {
        acc[stat._id] = {
            count: stat.count,
            totalAmount: centsToDollars(stat.totalAmount)
        };
        return acc;
    }, {});

    return {
        userId: user._id,
        email: user.email,
        currentBalance: centsToDollars(user.balance),
        statistics: {
            sent: statsMap.T_OUT || { count: 0, totalAmount: 0 },
            received: statsMap.T_IN || { count: 0, totalAmount: 0 }
        },
        accountCreated: user.createdAt
    };
}

// ============================================
// USER MANAGEMENT (ADMIN)
// ============================================
/**
 * Suspend user account (admin function)
 * 
 * @param {string} userId - User ID
 * @param {string} reason - Suspension reason
 * @returns {Promise<Object>} - Updated user
 * @throws {UserNotFoundError}
 */
export async function suspendUser(userId, reason) {
    const user = await Users.findByIdAndUpdate(
        userId,
        {
            $set: {
                accountStatus: 'suspended',
                'profile.suspensionReason': reason
            }
        },
        { new: true }
    );

    if (!user) {
        throw new UserNotFoundError();
    }

    console.log(`⚠️  User suspended: ${user.email} - Reason: ${reason}`);

    // TODO: Send suspension notification
    // sendAccountSuspendedEmail(user.email, reason)
    // sendAccountSuspendedSMS(user.phone)

    return user;
}

/**
 * Reactivate suspended user account
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user
 * @throws {UserNotFoundError}
 */
export async function reactivateUser(userId) {
    const user = await Users.findByIdAndUpdate(
        userId,
        {
            $set: { accountStatus: 'active' },
            $unset: { 'profile.suspensionReason': '' }
        },
        { new: true }
    );

    if (!user) {
        throw new UserNotFoundError();
    }

    console.log(`✅ User reactivated: ${user.email}`);

    // TODO: Send re-acticate notification
    // sendAccountAEmail(user.email, reason)
    // sendAccountSuspendedSMS(user.phone)

    return user;
}

/**
 * Get all users (admin function)
 * Should be paginated in production
 * 
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - List of users
 */
export async function getAllUsers(options = {}) {
    const { page = 1, limit = 20, status = null } = options;

    const query = {};
    if (status) {
        query.accountStatus = status;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        Users.find(query)
            .select('email balance isVerified accountStatus createdAt')
            .skip(skip)
            .limit(limit)
            .lean(),
        Users.countDocuments(query)
    ]);

    // Convert balances to dollars
    const usersWithDollars = users.map(user => ({
        ...user,
        balance: centsToDollars(user.balance)
    }));

    return {
        users: usersWithDollars,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}


// ============================================
// INTEGRATION HELPERS
// ============================================
/**
 * Get user for transaction
 * Validates user is ready to transact
 * Used by transaction.service.js
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User document
 * @throws {UserNotFoundError}
 */
export async function getUserForTransaction(userId) {
    const user = await Users.findById(userId)
        .select('email phone balance isVerified accountStatus profile');

    if (!user) {
        throw new UserNotFoundError();
    }

    return user;
}

/**
 * Get sanitized user data for token
 * Used by auth.service.js
 * 
 * @param {Object} user - User document
 * @returns {Object} - Sanitized user data for JWT
 */
export function getUserForToken(user) {
    return sanitizeUserForToken(user);
}

/**
 * Get sanitized user data for response
 * Used by controllers
 * 
 * @param {Object} user - User document
 * @returns {Object} - Sanitized user data
 */
export function getSanitizedUser(user) {
    return sanitizeUser(user);
}

export default {
    FindUserByEmail,
    findUserById,
    findUserByPhone,
    createUser,
    
    setVerifyUser,
    
    getUserProfile,
    updateUserProfile,
    
    updateUserBalance,
    checkAndAlertLowBalance,
    
    getUserStatistics,
    
    suspendUser,
    reactivateUser,
    getAllUsers,
    
    getUserForTransaction,
    getUserForToken,
    getSanitizedUser
};