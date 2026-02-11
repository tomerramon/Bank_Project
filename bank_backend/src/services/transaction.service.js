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
import mongoose from "mongoose";
import Users from "../models/user.model.js";
import { dollarsToCents, centsToDollars } from "../utils/currency.util.js";
import {
	findActiveUser,
	createTransactionPair,
	findTransactionsByUser,
	findRecentTransactions,
	findTransactionByReference,
	getTransactionStats as getTransactionStatsQuery,
} from "../utils/query.util.js";
import {
	validateAmount,
	requireDifferentUsers,
	requireVerified,
	requireActive,
} from "../utils/validations.util.js";
import {
	InsufficientFundsError,
	NotFoundError,
	UserNotFoundError,
} from "../utils/errors.util.js";
import {
	sendTransactionNotification,
	sendTransactionFailedNotification,
	sendLargeTransactionAlert,
} from "./notification.service.js";
import { checkLowBalance } from "./user.service.js";

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
	validateAmount(amount);
	const amountInCents = dollarsToCents(amount);

	// Start MongoDB transaction session
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const sender = await findActiveUser(fromUserId, session);

		const receiver = await Users.findOne({ email: toEmail })
			.session(session)
			.select("_id email isVerified accountStatus balance phone");

		if (!receiver) {
			throw new UserNotFoundError(toEmail);
		}

		requireVerified(receiver);
		requireActive(receiver);
		requireDifferentUsers(sender._id, receiver._id);

		// Check sufficient balance
		if (amountInCents > sender.balance) {
			const senderBalance = centsToDollars(sender.balance);

			// Notify sender of failure (async)
			sendTransactionFailedNotification(sender, {
				reason: "Insufficient funds",
				amount,
				toEmail: receiver.email,
				currentBalance: senderBalance,
			});

			throw new InsufficientFundsError(
				senderBalance.toFixed(2),
				amount.toFixed(2),
			);
		}

		// Atomic balance updates
		const senderResult = await Users.updateOne(
			{ _id: fromUserId, balance: { $gte: amountInCents } },
			{ $inc: { balance: -amountInCents } },
			{ session },
		);

		if (senderResult.matchedCount !== 1) {
			throw new InsufficientFundsError(
				centsToDollars(sender.balance).toFixed(2),
				amount.toFixed(2),
			);
		}

		await Users.updateOne(
			{ _id: receiver._id },
			{ $inc: { balance: amountInCents } },
			{ session },
		);

		// Create transaction records
		const reference = new mongoose.Types.ObjectId().toString();
		const transactions = await createTransactionPair(
			fromUserId,
			receiver._id,
			amountInCents,
			reference,
			session,
		);

		// Commit transaction, If we reach here, all operations succeeded
		await session.commitTransaction();

		console.log(
			`✅ Transfer: ${sender.email} → ${receiver.email} ($${amount})`,
		);

		// Calculate new balances
		const senderBalance = centsToDollars(sender.balance - amountInCents);
		const receiverBalance = centsToDollars(
			receiver.balance + amountInCents,
		);

		// Send notifications (async)
		sendTransactionNotification(sender, {
			direction: "T_OUT",
			amount,
			peerEmail: receiver.email,
			balance: senderBalance,
		});

		sendTransactionNotification(receiver, {
			direction: "T_IN",
			amount,
			peerEmail: sender.email,
			balance: receiverBalance,
		});

		// Large transaction alerts (if >= $1000)
		if (amount >= 1000) {
			sendLargeTransactionAlert(sender, amount, "T_OUT");
			sendLargeTransactionAlert(receiver, amount, "T_IN");
		}

		// Low balance check
		checkLowBalance(fromUserId, 10).catch((err) =>
			console.error("Low balance check failed:", err),
		);

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
				direction: "T_OUT",
				amount: -amount,
			},
			receiverTransaction: {
				id: transactions[1]._id,
				direction: "T_IN",
				amount: amount,
			},
		};
	} catch (err) {
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
	const result = await findTransactionsByUser(userId, options);

	result.transactions = result.transactions.map((t) => ({
		...t,
		amountInDollars: centsToDollars(t.amount),
		formattedAmount:
			t.direction === "T_IN"
				? `+$${centsToDollars(t.amount).toFixed(2)}`
				: `-$${centsToDollars(t.amount).toFixed(2)}`,
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
export async function getRecentTransactions(userId, limit = 10) {
	const transactions = await findRecentTransactions(userId, limit);

	return transactions.map((t) => ({
		...t,
		amountInDollars: centsToDollars(t.amount),
		formattedAmount:
			t.direction === "T_IN"
				? `+$${centsToDollars(t.amount).toFixed(2)}`
				: `-$${centsToDollars(t.amount).toFixed(2)}`,
	}));
}

/**
 * Get transaction by reference ID
 * Returns both sides of the transfer (sender and receiver)
 *
 * @param {string} reference - Unique transaction reference
 * @returns {Promise<Array>} - Both transaction records
 * @throws {NotFoundError}
 */
export async function getTransactionByReference(reference) {
	const transactions = await findTransactionByReference(reference);

	if (!transactions || transactions.length === 0) {
		throw new NotFoundError("Transaction");
	}

	return transactions.map((t) => ({
		...t,
		amountInDollars: centsToDollars(t.amount),
		formattedAmount:
			t.direction === "T_IN"
				? `+$${centsToDollars(t.amount).toFixed(2)}`
				: `-$${centsToDollars(t.amount).toFixed(2)}`,
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
	const user = await Users.findById(userId).select("balance");

	if (!user) {
		throw new UserNotFoundError();
	}

	return centsToDollars(user.balance);
}

// ============================================
// STATISTICS
// ============================================
/**
 * Get user's transaction statistics
 * Aggregates sent/received amounts and counts
 *
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} - Transaction statistics
 */
export async function getTransactionStats(userId) {
	const stats = await getTransactionStatsQuery(userId);

	const result = {
		sent: { count: 0, total: 0 },
		received: { count: 0, total: 0 },
	};

	stats.forEach((stat) => {
		if (stat._id === "T_OUT") {
			result.sent = {
				count: stat.count,
				total: centsToDollars(stat.totalAmount),
			};
		} else if (stat._id === "T_IN") {
			result.received = {
				count: stat.count,
				total: centsToDollars(stat.totalAmount),
			};
		}
	});

	return result;
}
