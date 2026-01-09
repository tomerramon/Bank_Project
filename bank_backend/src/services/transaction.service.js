// import { users, transactions } from "../config/local_users.config.js";
import mongoose from 'mongoose';
import Users from '../models/user.model.js';
import Transactions from '../models/transaction.model.js';

// Configuration
const MAX_TRANSFER_AMOUNT = 10000; // $10,000
const MIN_TRANSFER_AMOUNT = 0.01;  // $0.01


/**
 * Get all transactions for a specific user
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<Array>} - Array of transaction documents
 */
export async function GetTransactionsByUserId(userId) {
    return await Transactions.find({ userId })
        .sort({ createdAt: -1 }) // Most recent first
        .populate('peerUserId', 'email'); // Include peer user email
}


/**
 * Get transactions by user email
 * @param {string} email - User's email address
 * @returns {Promise<Array>} - Array of transaction documents
 */
export async function GetTransactionsByUserEmail(email) {
    const user = await Users.findOne({ email });
    if (!user) {
        throw new Error("User not found.");
    }
    return GetTransactionsByUserId(user._id);
}


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
        throw new Error(`Invalid transfer amount: ${amount}`);
    }

    if (amount < MIN_TRANSFER_AMOUNT) {
        throw new Error(`Minimum transfer amount is $${MIN_TRANSFER_AMOUNT}`);
    }

    if (amount > MAX_TRANSFER_AMOUNT) {
        throw new Error(`Maximum transfer amount is $${MAX_TRANSFER_AMOUNT}`);
    }

    //Convert amount to transfer to cents, for correct calculation.
    const amountInCents = Math.floor(amount * 100);

    // Start MongoDB transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sender = await Users.findById(fromUserId)
            .session(session) // Include this operation in the transaction
            .select('_id email isVerified accountStatus balance');

        if (!sender) {
            throw new Error('Sender user not found');
        }

        // Business rules: Only verified users with active accounts can send money
        if (!sender.isVerified) {
            throw new Error('Your account must be verified before you can send money');
        }

        if (sender.accountStatus !== 'active') {
            throw new Error('Your account is not active. Please contact support.');
        }

        const receiver = await Users.findOne({ email: toEmail })
            .session(session)
            .select('_id email isVerified accountStatus balance');

        if (!receiver) {
            throw new Error('Receiver not found. Please check the email address.');
        }

        if (!receiver.isVerified) {
            throw new Error('Receiver account is not verified');
        }

        if (receiver.accountStatus !== 'active') {
            throw new Error('Receiver account is not active');
        }

        // Prevent self-transfer
        if (receiver._id.equals(fromUserId)) {
            throw new Error('Cannot transfer money to the same account');
        }

        // Check sender has sufficient balance (balance is stored in cents)
        if (amountInCents > sender.balance) {
            throw new Error(
                `Insufficient funds. Your balance: $${(sender.balance / 100).toFixed(2)}, ` +
                `Transfer amount: $${amount.toFixed(2)}`
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
            throw new Error('Insufficient funds (concurrent transaction detected)');
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
 * Get transaction by reference ID
 * @param {string} reference - Unique transaction reference
 * @returns {Promise<Array>} - Both transaction records (sender and receiver)
 */
export async function getTransactionByReference(reference) {
    return await Transactions.find({ reference })
        .populate('userId', 'email')
        .populate('peerUserId', 'email');
}


/**
 * Get user's balance
 * @param {string} userId - User's ID
 * @returns {Promise<number>} - Balance in dollars
 */
export async function getUserBalance(userId) {
    const user = await Users.findById(userId).select('balance');
    if (!user) {
        throw new Error('User not found');
    }
    return user.balance; // Getter converts cents to dollars automatically
}