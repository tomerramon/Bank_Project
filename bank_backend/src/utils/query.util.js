/**
 * Query Utilities - THE ONLY PLACE FOR DATABASE QUERIES
 * 
 * All database operations go here.
 * Services call these functions - they never query directly.
 * 
 * Removed unused functions:
 * - getTransactionsByUserEmail (never used)
 * - updateMultBalances (never used)
 * - findUsersByIds (never used)
 */

import Users from '../models/user.model.js';
import Transactions from '../models/transaction.model.js';
import { validateUserForOperation } from './validation.util.js';

// ==========================================
// USER QUERIES
// ==========================================

export async function findUserById(userId, session = null) {
    const query = Users.findById(userId)
        .select('email balance isVerified accountStatus phone profile createdAt');
    
    if (session) query.session(session);
    
    return await query;
}

export async function findUserByIdWithPassword(userId) {
    return await Users.findById(userId)
        .select('+passwordHash email isVerified accountStatus refreshTokens');
}

export async function findUserByEmail(email, session = null) {
    const query = Users.findOne({ email })
        .select('email balance isVerified accountStatus phone profile createdAt');
    
    if (session) query.session(session);
    
    return await query;
}

export async function findUserByEmailWithPassword(email) {
    return await Users.findOne({ email })
        .select('+passwordHash email isVerified accountStatus failedLoginAttempts accountLockedUntil refreshTokens profile phone');
}

export async function findUserByPhone(phone) {
    return await Users.findOne({ phone })
        .select('email phone isVerified accountStatus');
}

/**
 * Find and validate user is ready for operations
 */
export async function findActiveUser(userId, session = null) {
    const user = await findUserById(userId, session);
    return validateUserForOperation(user);
}

export async function checkEmailExists(email) {
    const count = await Users.countDocuments({ email });
    return count > 0;
}

export async function checkPhoneExists(phone) {
    const count = await Users.countDocuments({ phone });
    return count > 0;
}

export async function updateUserBalance(userId, amountInCents, session = null) {
    return await Users.updateOne(
        { _id: userId },
        { $inc: { balance: amountInCents } },
        { session }
    );
}

export async function setUserVerified(userId) {
    return await Users.findByIdAndUpdate(
        userId,
        { $set: { isVerified: true } },
        { new: true, runValidators: true }
    );
}

// ==========================================
// TRANSACTION QUERIES
// ==========================================

export async function createTransactionPair(fromUserId, toUserId, amountInCents, reference, session) {
    return await Transactions.create([
        {
            userId: fromUserId,
            peerUserId: toUserId,
            amount: amountInCents,
            direction: 'T_OUT',
            reference,
        },
        {
            userId: toUserId,
            peerUserId: fromUserId,
            amount: amountInCents,
            direction: 'T_IN',
            reference,
        }
    ], { session });
}

export async function findTransactionsByUser(userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        direction = null,
        startDate = null,
        endDate = null
    } = options;
    
    const query = { userId };
    
    if (direction) query.direction = direction;
    
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

export async function findRecentTransactions(userId, limit = 10) {
    return await Transactions.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('peerUserId', 'email')
        .lean();
}

export async function findTransactionByReference(reference) {
    return await Transactions.find({ reference })
        .populate('userId', 'email')
        .populate('peerUserId', 'email')
        .lean();
}

export async function getTransactionStats(userId) {
    return await Transactions.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: '$direction',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function buildPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    
    return { page, limit };
}

export default {
    // User queries
    findUserById,
    findUserByIdWithPassword,
    findUserByEmail,
    findUserByEmailWithPassword,
    findUserByPhone,
    findActiveUser,
    checkEmailExists,
    checkPhoneExists,
    updateUserBalance,
    setUserVerified,
    
    // Transaction queries
    createTransactionPair,
    findTransactionsByUser,
    findRecentTransactions,
    findTransactionByReference,
    getTransactionStats,
    
    // Helpers
    buildPaginationParams
};