// import { users, transactions } from "../config/local_users.config.js";
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
import { validateUserCanReceiveMoney } from '../utils/validation.util.js'
import {
    InsufficientFundsError,
    SelfTransferError,
    UserNotFoundError,
    InvalidAmountError
} from '../utils/errors.util.js';

/**
 * Transfer money between two users (atomic transaction)
 * 
 * This function implements a two-phase commit pattern using MongoDB transactions
 * to ensure that money is never lost or duplicated.
 * 
 * Process:
 * 1. Validate inputs and convert amount to cents
 * 2. Start MongoDB transaction
 * 3. Fetch and validate both users (sender & receiver)
 * 4. Check sender has sufficient balance
 * 5. Atomically debit sender and credit receiver
 * 6. Create transaction records for both users
 * 7. Commit transaction (or rollback on any error)
 * 
 * @param {string} fromUserId - Sender's user ID
 * @param {string} toEmail - Receiver's email address
 * @param {number} amount - Amount in dollars
 * @returns {Promise<Object>} - Transaction result with details
 */
export const transferMoney = async (fromUserId, toEmail, amount) => {
    // Validate amount
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new InvalidAmountError(amount, 'must be greater than zero');
    }

    if (amount < MIN_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `minimum is $${CURRENCY.MIN_TRANSFER_AMOUNT}`
        );
    }

    if (amount > MAX_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `maximum is $${CURRENCY.MAX_TRANSFER_AMOUNT}`
        );
    }

    //Convert amount to transfer to cents, for correct calculation.
    const amountInCents = dollarsToCents(amount);

    // Start MongoDB transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sender = await findActiveVerifiedUser(fromUserId, session);

        const receiver = await Users.findOne({ email: toEmail })
            .session(session)
            .select('_id email isVerified accountStatus balance');

        if (!receiver) {
            throw new UserNotFoundError(toEmail);
        }

        validateUserCanReceiveMoney(receiver);

        // Prevent self-transfer
        if (sender._id.equals(receiver._id)) {
            throw new SelfTransferError();
        }

        // Check sender has sufficient balance (balance is stored in cents)
        if (amountInCents > sender.balance) {
            const senderBalanceDollars = centsToDollars(sender.balance);
            throw new InsufficientFundsError(
                senderBalanceDollars.toFixed(2),
                amountInDollars.toFixed(2)
            );
        }

        // Perform atomic debit from sender
        // This query ensures we only deduct if balance >= amount
        const senderResult = await Users.updateOne(
            {
                _id: fromUserId,
                balance: { $gte: amountInCents } // Only update if balance is sufficient
            },
            { $inc: { balance: -amountInCents } }, // Decrement balance
            { session }
        );

        // If no document was matched, balance check failed (race condition)
        if (senderResult.matchedCount !== 1) {
            throw new InsufficientFundsError(
                centsToDollars(sender.balance).toFixed(2),
                amountInDollars.toFixed(2)
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

        // Return success response with all details
        return {
            success: true,
            reference,
            amount: amount,
            from: sender.email,
            to: receiver.email,
            timestamp: createdTransactions[0].createdAt,
            senderTransaction: {
                id: createdTransactions[0]._id,
                direction: 'T_OUT',
                amount: -amount // Negative for outgoing
            },
            receiverTransaction: {
                id: createdTransactions[1]._id,
                direction: 'T_IN',
                amount: amount // Positive for incoming
            }
        };
    }
    catch (err) {
        // If any error occurs, rollback the entire transaction
        // This ensures database consistency - no partial transfers
        await session.abortTransaction();
        throw err; // Re-throw the error for the controller to handle
    }
    finally {
        // Always end the session to free up resources
        session.endSession();
    }
};


/**
 * Get all transactions for a user with pagination and filters
 * 
 * @param {string} userId - User's ID
 * @param {Object} options - Query options (page, limit, direction, dates)
 * @returns {Promise<Object>} - Transactions with pagination info
 */
export async function getUserTransactions(userId, options = {}) {
    // Reuse query helper
    return await queryGetUserTransactions(userId, options);
}

/**
 * Get recent transactions for dashboard
 * 
 * @param {string} userId - User's ID
 * @param {number} limit - Number of transactions (default: 10)
 * @returns {Promise<Array>} - Recent transactions
 */
export async function getUserRecentTransactions(userId, limit = 10) {
    return await getRecentTransactions(userId, limit);
}

/**
 * Get transactions by user email
 * @param {string} email - User's email address
 * @returns {Promise<Array>} - Array of transaction documents
 */
export async function GetTransactionsByUserEmail(email) {
    const user = await findUserByEmail(email)
    if (!user) {
        throw new Error("User not found.");
    }
    return getUserTransactions(user._id);
}

/**
 * Get transaction by reference ID
 * Returns both sides of the transfer (sender and receiver)
 * 
 * @param {string} reference - Unique transaction reference
 * @returns {Promise<Array>} - Both transaction records
 */
export async function getTransactionByReference(reference) {
    const transactions = await Transactions.find({ reference })
        .populate('userId', 'email')
        .populate('peerUserId', 'email');

    if (!transactions || transactions.length === 0) {
        throw new Error('Transaction not found');
    }

    return transactions;
}


/**
 * Get user's balance in dollars
 * 
 * @param {string} userId - User's ID
 * @returns {Promise<number>} - Balance in dollars
 */
export async function getUserBalance(userId) {
    const user = await Users.findById(userId).select('balance');
    
    if (!user) {
        throw new UserNotFoundError();
    }

    // Convert cents to dollars using utility
    return centsToDollars(user.balance);
}