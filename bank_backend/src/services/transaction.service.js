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
import { CURRENCY } from '../config/constants.config.js';
import {
    findActiveVerifiedUser,
    findUserByEmail,
    getRecentTransactions,
    getUserTransactions as queryGetUserTransactions,
} from '../utils/query.util.js'
import { validateUserCanReceiveMoney, requireDifferentUsers } from '../utils/userValidation.util.js'
import {
    InsufficientFundsError,
    SelfTransferError,
    UserNotFoundError,
    InvalidAmountError
} from '../utils/errors.util.js';
import {
    sendTransactionEmail,
    sendTransactionFailedEmail
} from './email.service.js';
import {
    sendTransactionSMS,
    sendTransactionFailedSMS,
    sendLargeTransactionSMS
} from './sms.service.js';
import { checkAndAlertLowBalance } from './user.service.js';


// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Validate transfer amount
 * Centralized validation to avoid duplication
 * 
 * @param {number} amount - Amount in dollars
 * @returns {number} - Validated amount
 * @throws {InvalidAmountError}
 */
function validateTransferAmount(amount) {
    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new InvalidAmountError(amount, 'must be greater than zero');
    }

    if (amount < CURRENCY.MIN_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `minimum is $${CURRENCY.MIN_TRANSFER_AMOUNT}`
        );
    }

    if (amount > CURRENCY.MAX_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `maximum is $${CURRENCY.MAX_TRANSFER_AMOUNT}`
        );
    }

    return amount;
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

/**
 * Send transaction success notifications
 * Sends both email and SMS to user
 * 
 * @param {Object} user - User object
 * @param {Object} transactionData - Transaction details
 * @param {string} userType - 'sender' or 'receiver'
 */
function sendTransactionNotifications(user, transactionData, userType) {
    // Send email notification
    sendNotification(
        sendTransactionEmail,
        [user.email, transactionData],
        `Transaction email (${userType})`
    );

    // Send SMS notification
    sendNotification(
        sendTransactionSMS,
        [user.phone, transactionData],
        `Transaction SMS (${userType})`
    );
}


/**
 * Send transaction failure notifications
 * 
 * @param {Object} user - User object
 * @param {Object} failureData - Failure details
 */
function sendTransactionFailureNotifications(user, failureData) {
    // Send email notification
    sendNotification(
        sendTransactionFailedEmail,
        [user.email, failureData],
        'Transaction failed email'
    );

    // Send SMS notification
    sendNotification(
        sendTransactionFailedSMS,
        [user.phone, failureData.reason],
        'Transaction failed SMS'
    );
}

/**
 * Check if transaction is large and send alert
 * 
 * @param {Object} user - User object
 * @param {number} amount - Transaction amount in dollars
 * @param {string} direction - 'T_IN' or 'T_OUT'
 * @param {number} threshold - Threshold in dollars (default: 1000)
 */
function checkLargeTransactionAlert(user, amount, direction, threshold = 1000) {
    if (amount >= threshold) {
        console.log(`⚠️  Large transaction alert: ${user.email} - $${amount}`);

        sendNotification(
            sendLargeTransactionSMS,
            [user.phone, amount, direction],
            `Large transaction alert (${direction})`
        );
    }
}

// ============================================
// MONEY TRANSFER
// ============================================
/**
 * Transfer money between two users (atomic transaction)
 * 
 * This function implements a two-phase commit pattern using MongoDB transactions
 * to ensure that money is never lost or duplicated.
 * 
 * 
 * @param {string} fromUserId - Sender's user ID
 * @param {string} toEmail - Receiver's email address
 * @param {number} amount - Amount in dollars
 * @returns {Promise<Object>} - Transaction result with details
 * @throws {InvalidAmountError|InsufficientFundsError|UserNotFoundError|SelfTransferError}
 */
export const transferMoney = async (fromUserId, toEmail, amount) => {
    // Validate and normalize amount
    const validatedAmount = validateTransferAmount(amount);

    // Convert amount to cents for database storage
    const amountInCents = dollarsToCents(validatedAmount);

    // Start MongoDB transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sender = await findActiveVerifiedUser(fromUserId, session);

        const receiver = await Users.findOne({ email: toEmail })
            .session(session)
            .select('_id email isVerified accountStatus balance phone');

        if (!receiver) {
            throw new UserNotFoundError(toEmail);
        }

        validateUserCanReceiveMoney(receiver);

        requireDifferentUsers(sender._id, receiver._id, 'transfer');


        // Check sender has sufficient balance (balance is stored in cents)
        if (amountInCents > sender.balance) {
            const senderBalanceDollars = centsToDollars(sender.balance);

            // Notify sender of failure (before rollback)
            const failureData = {
                reason: 'Insufficient funds',
                amount: validatedAmount,
                toEmail: receiver.email,
                currentBalance: senderBalanceDollars
            };

            // Send failure notifications (async, after rollback)
            setTimeout(() => {
                sendTransactionFailureNotifications(sender, failureData);
            }, 100);

            throw new InsufficientFundsError(
                senderBalanceDollars.toFixed(2),
                validatedAmount.toFixed(2)
            );
        }

        // Perform atomic debit from sender
        // This query ensures we only deduct if balance >= amount
        const senderResult = await Users.updateOne(
            {
                _id: fromUserId,
                balance: { $gte: amountInCents } // Only update if balance sufficient
            },
            { $inc: { balance: -amountInCents } }, // Decrement balance
            { session }
        );

        // If no document matched, balance check failed (race condition)
        if (senderResult.matchedCount !== 1) {
            const senderBalanceDollars = centsToDollars(sender.balance);
            throw new InsufficientFundsError(
                senderBalanceDollars.toFixed(2),
                validatedAmount.toFixed(2)
            );
        }

        // Perform atomic credit to receiver
        await Users.updateOne(
            { _id: receiver._id },
            { $inc: { balance: amountInCents } }, // Increment balance
            { session }
        );

        // Generate unique reference ID for this transfer
        // Both transaction records share the same reference to link them
        const reference = new mongoose.Types.ObjectId().toString();

        // Create transaction records for both users
        const createdTransactions = await Transactions.create([
            {
                userId: fromUserId,
                peerUserId: receiver._id,
                amount: amountInCents,
                direction: 'T_OUT', // Outgoing transaction
                reference,
            },
            {
                userId: receiver._id,
                peerUserId: fromUserId,
                amount: amountInCents,
                direction: 'T_IN', // Incoming transaction
                reference,
            }
        ], { session });

        // Commit transaction, If we reach here, all operations succeeded
        await session.commitTransaction();

        console.log(`✅ Transfer completed: ${sender.email} → ${receiver.email} ($${validatedAmount})`);

        const senderNewBalance = centsToDollars(sender.balance - amountInCents);
        const receiverNewBalance = centsToDollars(receiver.balance + amountInCents);

        sendTransactionNotifications(sender, {
            direction: 'T_OUT',
            amount: validatedAmount,
            peerEmail: receiver.email,
            balance: senderNewBalance
        }, 'sender');

        // Receiver notifications
        sendTransactionNotifications(receiver, {
            direction: 'T_IN',
            amount: validatedAmount,
            peerEmail: sender.email,
            balance: receiverNewBalance
        }, 'receiver');

        // Check for large transaction alerts
        checkLargeTransactionAlert(sender, validatedAmount, 'T_OUT', 1000);
        checkLargeTransactionAlert(receiver, validatedAmount, 'T_IN', 1000);

        // Check for low balance alert (sender only)
        checkAndAlertLowBalance(fromUserId, 10)
            .catch(err => console.error('Low balance check failed:', err));


        // Return success response with all details
        return {
            success: true,
            reference,
            amount: validatedAmount,
            from: sender.email,
            to: receiver.email,
            timestamp: createdTransactions[0].createdAt,
            senderBalance: senderNewBalance,
            senderTransaction: {
                id: createdTransactions[0]._id,
                direction: 'T_OUT',
                amount: -validatedAmount // Negative for outgoing
            },
            receiverTransaction: {
                id: createdTransactions[1]._id,
                direction: 'T_IN',
                amount: validatedAmount // Positive for incoming
            }
        };
    }
    catch (err) {
        // If any error occurs, rollback the entire transaction
        // This ensures database consistency - no partial transfers
        await session.abortTransaction();
        console.error(`❌ Transfer failed: ${err.message}`);
        throw err; // Re-throw for controller to handle
    } finally {
        // Always end the session to free up resources
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
    // Reuse query helper
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
    const transactions = await Transactions.find({ reference })
        .populate('userId', 'email')
        .populate('peerUserId', 'email')
        .lean();

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

    // Convert cents to dollars
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
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
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
        period: {
            start: startDate,
            end: endDate
        },
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
// INTEGRATION HELPERS
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
        // Validate amount
        const validatedAmount = validateTransferAmount(amount);
        const amountInCents = dollarsToCents(validatedAmount);

        // Get sender
        const sender = await Users.findById(fromUserId)
            .select('email balance isVerified accountStatus');

        if (!sender) {
            return { valid: false, error: 'Sender not found' };
        }

        // Get receiver
        const receiver = await Users.findOne({ email: toEmail })
            .select('email isVerified accountStatus');

        if (!receiver) {
            return { valid: false, error: 'Receiver not found' };
        }

        // Check self-transfer
        if (sender._id.equals(receiver._id)) {
            return { valid: false, error: 'Cannot transfer to yourself' };
        }

        // Check sender verification
        if (!sender.isVerified) {
            return { valid: false, error: 'Sender account not verified' };
        }

        // Check receiver verification
        if (!receiver.isVerified) {
            return { valid: false, error: 'Receiver account not verified' };
        }

        // Check sender balance
        if (amountInCents > sender.balance) {
            return {
                valid: false,
                error: 'Insufficient funds',
                balance: centsToDollars(sender.balance),
                required: validatedAmount
            };
        }

        // All checks passed
        return {
            valid: true,
            sender: {
                email: sender.email,
                currentBalance: centsToDollars(sender.balance),
                balanceAfter: centsToDollars(sender.balance - amountInCents)
            },
            receiver: {
                email: receiver.email
            },
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