/**
 * Transaction Utilities
 * 
 * Helper functions extracted from transaction.service.js
 * Benefits:
 * - Reduces service file size
 * - Makes functions testable in isolation
 * - Improves code reusability
 */

import Transactions from '../models/transaction.model.js';
import { CURRENCY } from '../config/constants.config.js';
import { InvalidAmountError } from './errors.util.js';

/**
 * Validate transfer amount
 * 
 * @param {number} amount - Amount in dollars
 * @returns {number} - Validated amount
 * @throws {InvalidAmountError}
 */
export function validateTransferAmount(amount) {
    amount = Number(amount);

    if (!Number.isFinite(amount) || amount < CURRENCY.MIN_TRANSFER_AMOUNT) {
        throw new InvalidAmountError(
            amount,
            `minimum amount is $${CURRENCY.MIN_TRANSFER_AMOUNT}`
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
 * Create transaction records for both users
 * 
 * @param {string} fromUserId - Sender's ID
 * @param {string} toUserId - Receiver's ID
 * @param {number} amountInCents - Amount in cents
 * @param {string} reference - Transaction reference
 * @param {Object} session - MongoDB session
 * @returns {Promise<Array>} - Created transactions
 */
export async function createTransactionRecords(fromUserId, toUserId, amountInCents, reference, session) {
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

/**
 * Build transaction response data
 * 
 * @param {Array} transactions - Transaction records
 * @param {Object} sender - Sender user
 * @param {Object} receiver - Receiver user
 * @param {number} amount - Amount in dollars
 * @param {string} reference - Transaction reference
 * @param {number} senderBalance - Sender's new balance
 * @param {number} receiverBalance - Receiver's new balance
 * @returns {Object} - Transaction response data
 */
export function buildTransactionData(
    transactions,
    sender,
    receiver,
    amount,
    reference,
    senderBalance,
    receiverBalance
) {
    return {
        success: true,
        reference,
        amount,
        from: sender.email,
        to: receiver.email,
        timestamp: transactions[0].createdAt,
        senderBalance,
        senderTransaction: {
            id: transactions[0]._id,
            direction: 'T_OUT',
            amount: -amount
        },
        receiverTransaction: {
            id: transactions[1]._id,
            direction: 'T_IN',
            amount: amount
        }
    };
}

export default {
    validateTransferAmount,
    createTransactionRecords,
    buildTransactionData
};