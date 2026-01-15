/**
 * Transaction Service
 * 
 * Handles all transaction-related business logic:
 * - Money transfers (atomic operations)
 * - Transaction history
 * - Balance queries
 * - Transaction statistics
 * 
 */
import mongoose from 'mongoose';
import Users from '../models/user.model.js';
import Transactions from '../models/transaction.model.js';
import { dollarsToCents, centsToDollars } from '../utils/currency.util.js';
import {
    findActiveVerifiedUser,
    findUserByEmail,
    getRecentTransactions,
    getUserTransactions as queryGetUserTransactions,
} from '../utils/query.util.js'
import { validateUserCanReceiveMoney, requireDifferentUsers } from '../utils/userValidation.util.js'
import {
    InsufficientFundsError,
    UserNotFoundError,
} from '../utils/errors.util.js';
import {
    sendTransactionNotification,
    sendTransactionFailedNotification,
    sendLargeTransactionAlert
} from '../services/notification.service.js';
import { checkAndAlertLowBalance } from './user.service.js';
import {
    validateTransferAmount,
    buildTransactionData,
    createTransactionRecords
} from '../utils/transaction.util.js';
 import {getTransactionByReference as queryGetTransactionByReference} from "../utils/query.util.js"
// ============================================
// MONEY TRANSFER
// ============================================
/**
 * Transfer money between two users (atomic transaction)
 * 
 * This function implements a two-phase commit pattern using MongoDB transactions
 * to ensure that money is never lost or duplicated.
 *  
 * @param {string} fromUserId - Sender's user ID
 * @param {string} toEmail - Receiver's email address
 * @param {number} amount - Amount in dollars
 * @returns {Promise<Object>} - Transaction result with details
 * @throws {InvalidAmountError|InsufficientFundsError|UserNotFoundError|SelfTransferError}
 */
export const transferMoney = async (fromUserId, toEmail, amount) => {
    const validatedAmount = validateTransferAmount(amount);
    const amountInCents = dollarsToCents(validatedAmount);

    // Start MongoDB transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get sender and receiver
        const sender = await findActiveVerifiedUser(fromUserId, session);
        const receiver = await Users.findOne({ email: toEmail })
            .session(session)
            .select('_id email isVerified accountStatus balance phone');

        if (!receiver) {
            throw new UserNotFoundError(toEmail);
        }
        validateUserCanReceiveMoney(receiver);
        requireDifferentUsers(sender._id, receiver._id, 'transfer');


        // Check sufficient balance
        if (amountInCents > sender.balance) {
            const senderBalanceDollars = centsToDollars(sender.balance);

            // Notify sender of failure (async)
            setTimeout(() => {
                sendTransactionFailedNotification(sender, {
                    reason: 'Insufficient funds',
                    amount: validatedAmount,
                    toEmail: receiver.email,
                    currentBalance: senderBalanceDollars
                });
            }, 100);

            throw new InsufficientFundsError(
                senderBalanceDollars.toFixed(2),
                validatedAmount.toFixed(2)
            );
        }

        // Atomic balance updates
        const senderResult = await Users.updateOne(
            { _id: fromUserId, balance: { $gte: amountInCents } },
            { $inc: { balance: -amountInCents } },
            { session }
        );

        if (senderResult.matchedCount !== 1) {
            throw new InsufficientFundsError(
                centsToDollars(sender.balance).toFixed(2),
                validatedAmount.toFixed(2)
            );
        }

        await Users.updateOne(
            { _id: receiver._id },
            { $inc: { balance: amountInCents } },
            { session }
        );

        // Generate unique reference ID for this transfer
        // Both transaction records share the same reference to link them
        const reference = new mongoose.Types.ObjectId().toString();

        // Create transaction records for both users

        const transactions = await createTransactionRecords(
            fromUserId,
            receiver._id,
            amountInCents,
            reference,
            session
        );

        // Commit transaction, If we reach here, all operations succeeded
        await session.commitTransaction();

        console.log(`✅ Transfer: ${sender.email} → ${receiver.email} ($${validatedAmount})`);

        // Send notifications (async)
        const senderBalance = centsToDollars(sender.balance - amountInCents);
        const receiverBalance = centsToDollars(receiver.balance + amountInCents);

        sendTransactionNotification(sender, {
            direction: 'T_OUT',
            amount: validatedAmount,
            peerEmail: receiver.email,
            balance: senderBalance
        });

        sendTransactionNotification(receiver, {
            direction: 'T_IN',
            amount: validatedAmount,
            peerEmail: sender.email,
            balance: receiverBalance
        });

        // Check for large transaction alerts
        if (validatedAmount >= 1000) {
            sendLargeTransactionAlert(sender, validatedAmount, 'T_OUT');
            sendLargeTransactionAlert(receiver, validatedAmount, 'T_IN');
        }

        // Check for low balance alert (sender only)
        checkAndAlertLowBalance(fromUserId, 10).catch(err =>
            console.error('Low balance check failed:', err)
        );

        // Return success response with all details
        return buildTransactionData(
            transactions,
            sender,
            receiver,
            validatedAmount,
            reference,
            senderBalance,
            receiverBalance
        );
    }
    catch (err) {
        await session.abortTransaction();
        console.error(`❌ Transfer failed: ${err.message}`);
        throw err;
    } finally {
        session.endSession();
    }
};


// ============================================
// TRANSACTION QUERIES
// ============================================
/**
 * Get all transactions for a user with pagination and filters
 * 
 * @param {string} userId - User's ID
 * @param {Object} options - Query options (page, limit, direction, dates)
 * @returns {Promise<Object>} - Transactions with pagination info
 */
export async function getUserTransactions(userId, options = {}) {
    const result = await queryGetUserTransactions(userId, options);

    // Convert amounts to dollars
    result.transactions = result.transactions.map(t => ({
        ...t,
        amountInDollars: centsToDollars(t.amount),
        formattedAmount: t.direction === 'T_IN'
            ? `+$${centsToDollars(t.amount).toFixed(2)}`
            : `-$${centsToDollars(t.amount).toFixed(2)}`
    }));

    return result;
}

/**
 * Get recent transactions for dashboard
 * 
 * @param {string} userId - User's ID
 * @param {number} limit - Number of transactions (default: 10)
 * @returns {Promise<Array>} - Recent transactions
 */
export async function getUserRecentTransactions(userId, limit = 10) {
    const transactions = await getRecentTransactions(userId, limit);

    // Convert amounts to dollars
    return transactions.map(t => ({
        ...t,
        amountInDollars: centsToDollars(t.amount),
        formattedAmount: t.direction === 'T_IN'
            ? `+$${centsToDollars(t.amount).toFixed(2)}`
            : `-$${centsToDollars(t.amount).toFixed(2)}`
    }));
}

/**
 * Get transactions by user email
 * 
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Transactions with pagination
 * @throws {UserNotFoundError}
 */
export async function getTransactionsByUserEmail(email) {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new UserNotFoundError(email);
    }
    return getUserTransactions(user._id);
}

/**
 * Get transaction by reference ID
 * Returns both sides of the transfer (sender and receiver)
 * 
 * @param {string} reference - Unique transaction reference
 * @returns {Promise<Array>} - Both transaction records
 * @throws {UserNotFoundError}
 */
export async function getTransactionByReference(reference) {
    const transactions = await queryGetTransactionByReference(reference);

    if (!transactions || transactions.length === 0) {
        throw new UserNotFoundError('Transaction not found');
    }

    // Convert amounts to dollars
    return transactions.map(t => ({
        ...t,
        amountInDollars: centsToDollars(t.amount),
        formattedAmount: t.direction === 'T_IN'
            ? `+$${centsToDollars(t.amount).toFixed(2)}`
            : `-$${centsToDollars(t.amount).toFixed(2)}`
    }));
}


// ============================================
// BALANCE QUERIES
// ============================================
/**
 * Get user's balance in dollars
 * 
 * @param {string} userId - User's ID
 * @returns {Promise<number>} - Balance in dollars
 * @throws {UserNotFoundError}
 */
export async function getUserBalance(userId) {
    const user = await Users.findById(userId).select('balance');

    if (!user) {
        throw new UserNotFoundError();
    }

    return centsToDollars(user.balance);
}

// ============================================
// TRANSACTION STATISTICS
// ============================================
/**
 * Get user's transaction statistics
 * Aggregates sent/received amounts and counts
 * 
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} - Transaction statistics
 */
export async function getUserTransactionStats(userId) {
    const stats = await Transactions.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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

/**
 * Get transaction summary for date range
 * 
 * @param {string} userId - User's ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} - Transaction summary
 */
export async function getTransactionSummary(userId, startDate, endDate) {
    const query = {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
    };

    const summary = await Transactions.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$direction',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                avgAmount: { $avg: '$amount' }
            }
        }
    ]);

    const result = {
        period: { start: startDate, end: endDate },
        sent: { count: 0, total: 0, average: 0 },
        received: { count: 0, total: 0, average: 0 }
    };

    summary.forEach(stat => {
        if (stat._id === 'T_OUT') {
            result.sent = {
                count: stat.count,
                total: centsToDollars(stat.totalAmount),
                average: centsToDollars(stat.avgAmount)
            };
        } else if (stat._id === 'T_IN') {
            result.received = {
                count: stat.count,
                total: centsToDollars(stat.totalAmount),
                average: centsToDollars(stat.avgAmount)
            };
        }
    });

    return result;
}


// ============================================
// VALIDATION HELPERS
// ============================================
/**
 * Validate transfer before executing
 * Used for pre-validation in UI
 * 
 * @param {string} fromUserId - Sender's ID
 * @param {string} toEmail - Receiver's email
 * @param {number} amount - Amount in dollars
 * @returns {Promise<Object>} - Validation result
 */
export async function validateTransfer(fromUserId, toEmail, amount) {
    try {
        const validatedAmount = validateTransferAmount(amount);
        const amountInCents = dollarsToCents(validatedAmount)

        const sender = await Users.findById(fromUserId)
            .select('email balance isVerified accountStatus');

        if (!sender) {
            return { valid: false, error: 'Sender not found' };
        }

        const receiver = await Users.findOne({ email: toEmail })
            .select('email isVerified accountStatus');

        if (!receiver) {
            return { valid: false, error: 'Receiver not found' };
        }

        if (sender._id.equals(receiver._id)) {
            return { valid: false, error: 'Cannot transfer to yourself' };
        }

        if (!sender.isVerified) {
            return { valid: false, error: 'Sender account not verified' };
        }

        if (!receiver.isVerified) {
            return { valid: false, error: 'Receiver account not verified' };
        }

        if (amountInCents > sender.balance) {
            return {
                valid: false,
                error: 'Insufficient funds',
                balance: centsToDollars(sender.balance),
                required: validatedAmount
            };
        }

        return {
            valid: true,
            sender: {
                email: sender.email,
                currentBalance: centsToDollars(sender.balance),
                balanceAfter: centsToDollars(sender.balance - amountInCents)
            },
            receiver: { email: receiver.email },
            amount: validatedAmount
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

export default {
    transferMoney,
    validateTransfer,
    getUserTransactions,
    getUserRecentTransactions,
    getTransactionsByUserEmail,
    getTransactionByReference,
    getUserBalance,
    getUserTransactionStats,
    getTransactionSummary
};