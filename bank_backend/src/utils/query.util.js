/**
 * Query Helper Utilities
 * 
 * Centralizes common database queries to eliminate duplication.
 * Each query that's used in 2+ places should have a helper here.
 */

import Users from '../models/user.model.js';
import Transactions from '../models/transaction.model.js';
import { UserNotFoundError } from './errors.util.js';
import { validateUserForOperation } from './userValidation.util.js';

// ==========================================
// USER QUERIES
// ==========================================

/**
 * Find user by ID with standard fields
 * Most common query pattern
 * 
 * @param {string} userId - User's MongoDB ObjectId
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object>} - User document
 */
export async function findUserById(userId, session = null) {
    const query = Users.findById(userId)
        .select('email balance isVerified accountStatus phone profile createdAt');
    
    if (session) {
        query.session(session);
    }
    
    return await query;
}

/**
 * Find verified, active user by ID
 * Used in transaction and protected operations
 * 
 * @param {string} userId - User's MongoDB ObjectId
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object>} - Validated user document
 * @throws {UserNotFoundError|UnverifiedAccountError|InactiveAccountError}
 */
export async function findActiveVerifiedUser(userId, session = null) {
    const user = await findUserById(userId, session);
    return validateUserForOperation(user);
}

/**
 * Find user by email
 * 
 * @param {string} email - User's email
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object|null>} - User document or null
 */
export async function findUserByEmail(email, session = null) {
    const query = Users.findOne({ email })
        .select('email balance isVerified accountStatus phone');
    
    if (session) {
        query.session(session);
    }
    
    return await query;
}

/**
 * Find user by email with password
 * Used for authentication
 * 
 * @param {string} email - User's email
 * @returns {Promise<Object|null>} - User with passwordHash or null
 */
export async function findUserByEmailWithPassword(email) {
    return await Users.findOne({ email })
        .select('+passwordHash email isVerified accountStatus failedLoginAttempts accountLockedUntil refreshTokens');
}

/**
 * Find user by phone
 * 
 * @param {string} phone - User's phone number
 * @returns {Promise<Object|null>} - User document or null
 */
export async function findUserByPhone(phone) {
    return await Users.findOne({ phone })
        .select('email phone isVerified accountStatus');
}

/**
 * Check if email exists
 * More efficient than finding full user when only checking existence
 * 
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - true if exists
 */
export async function isEmailExists(email) {
    const count = await Users.countDocuments({ email });
    return count > 0;
}

/**
 * Check if phone exists
 * 
 * @param {string} phone - Phone to check
 * @returns {Promise<boolean>} - true if exists
 */
export async function isPhoneExists(phone) {
    const count = await Users.countDocuments({ phone });
    return count > 0;
}

// ==========================================
// TRANSACTION QUERIES
// ==========================================

/**
 * Get user's transactions with pagination
 * 
 * @param {string} userId - User's ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Transactions with pagination
 */
export async function getUserTransactions(userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        direction = null,
        startDate = null,
        endDate = null
    } = options;
    
    const query = { userId };
    
    if (direction) {
        query.direction = direction;
    }
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [transactions, total] = await Promise.all([
        Transactions.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('peerUserId', 'email')
            .lean(),
        Transactions.countDocuments(query)
    ]);
    
    return {
        transactions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1
        }
    };
}

/**
 * Get transaction by reference
 * Returns both sides of transfer (sender and receiver)
 * 
 * @param {string} reference - Transaction reference
 * @returns {Promise<Array>} - Array with both transaction documents
 */
export async function getTransactionByReference(reference) {
    return await Transactions.find({ reference })
        .populate('userId', 'email')
        .populate('peerUserId', 'email')
        .lean();
}

/**
 * Get user's recent transactions
 * Quick query for dashboard display
 * 
 * @param {string} userId - User's ID
 * @param {number} limit - Number of transactions (default: 10)
 * @returns {Promise<Array>} - Recent transactions
 */
export async function getRecentTransactions(userId, limit = 10) {
    return await Transactions.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('peerUserId', 'email')
        .lean();
}

// ==========================================
// AGGREGATION QUERIES
// ==========================================

/**
 * Get user's transaction statistics
 * Aggregates sent/received amounts and counts
 * 
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} - Transaction statistics
 */
export async function getUserTransactionStats(userId) {
    const stats = await Transactions.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: '$direction',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
    
    const result = {
        sent: { count: 0, total: 0 },
        received: { count: 0, total: 0 }
    };
    
    stats.forEach(stat => {
        if (stat._id === 'T_OUT') {
            result.sent = {
                count: stat.count,
                total: centsToDollars(stat.totalAmount)
            };
        } else if (stat._id === 'T_IN') {
            result.received = {
                count: stat.count,
                total: centsToDollars(stat.totalAmount)
            };
        }
    });
    
    return result;
}

// ==========================================
// BULK OPERATIONS
// ==========================================

/**
 * Get multiple users by IDs
 * More efficient than multiple findById calls
 * 
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Array>} - Array of user documents
 */
export async function findUsersByIds(userIds) {
    return await Users.find({ _id: { $in: userIds } })
        .select('email balance isVerified accountStatus')
        .lean();
}

/**
 * Update multiple users' balances atomically
 * Used in batch transactions
 * 
 * @param {Array<Object>} updates - Array of {userId, amount}
 * @param {Object} session - MongoDB session
 * @returns {Promise<Array>} - Update results
 */
export async function updateMultBalances(updates, session) {
    const operations = updates.map(({ userId, amount }) => ({
        updateOne: {
            filter: { _id: userId },
            update: { $inc: { balance: amount } }
        }
    }));
    
    return await Users.bulkWrite(operations, { session });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Build pagination params from request query
 * Validates and applies defaults
 * 
 * @param {Object} query - Request query params
 * @returns {Object} - Validated pagination params
 */
export function buildPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    
    return { page, limit };
}

/**
 * Build date range filter from request query
 * 
 * @param {Object} query - Request query params
 * @returns {Object|null} - Date range filter or null
 */
export function buildDateRangeFilter(query) {
    const { startDate, endDate } = query;
    
    if (!startDate && !endDate) {
        return null;
    }
    
    const filter = {};
    
    if (startDate) {
        filter.$gte = new Date(startDate);
    }
    
    if (endDate) {
        filter.$lte = new Date(endDate);
    }
    
    return filter;
}

// Export all functions
export default {
    findUserById,
    findActiveVerifiedUser,
    findUserByEmail,
    findUserByEmailWithPassword,
    findUserByPhone,
    isEmailExists,
    isPhoneExists,
    getUserTransactions,
    getTransactionByReference,
    getRecentTransactions,
    getUserTransactionStats,
    findUsersByIds,
    updateMultBalances,
    buildPaginationParams,
    buildDateRangeFilter
};