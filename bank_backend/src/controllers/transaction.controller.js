/**
 * Transaction Controller - Handles transaction-related HTTP requests
 *
 */

import {
	transferMoney,
	getUserTransactions,
	getRecentTransactions,
	getTransactionByReference,
	getUserBalance,
	getTransactionStats,
} from "../services/transaction.service.js";
import { validateTransferInputs } from "../utils/validations.util.js";
import { buildPaginationParams } from "../utils/query.util.js";
import {
	formatErrorResponse,
	formatSuccessResponse,
	formatPaginatedResponse,
} from "../utils/response.util.js";
import { ForbiddenError } from "../utils/errors.util.js";
import { SUCCESS_MESSAGES } from "../config/constants.config.js";

/**
 * Transfer money to another user
 * POST /transactions/transfer
 *
 * Body: { toEmail, amount }
 * Headers: Authorization: Bearer <token>
 */
export async function transferController(req, res) {
	try {
		const { toEmail, amount } = req.body;
		const fromUserId = req.user.id;

		validateTransferInputs({ toEmail, amount });

		const result = await transferMoney(fromUserId, toEmail, amount);

		res.status(200).json(
			formatSuccessResponse(SUCCESS_MESSAGES.TRANSFER_SUCCESS, result),
		);
	} catch (error) {
		const statusCode = error.statusCode || 400;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

/**
 * Get user's transaction history
 * GET /transactions
 *
 * Query params: page, limit, direction, startDate, endDate
 * Headers: Authorization: Bearer <token>
 */
export async function getTransactionsController(req, res) {
	try {
		const userId = req.user.id;

		const { page, limit } = buildPaginationParams(req.query);
		const { direction, startDate, endDate } = req.query;

		const options = {
			page,
			limit,
			...(direction && { direction }),
			...(startDate && { startDate }),
			...(endDate && { endDate }),
		};

		const result = await getUserTransactions(userId, options);

		res.status(200).json(
			formatPaginatedResponse(result.transactions, result.pagination),
		);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

/**
 * Get recent transactions for dashboard
 * GET /transactions/recent
 *
 * Query params: limit (default: 10)
 * Headers: Authorization: Bearer <token>
 */
export async function getRecentTransactionsController(req, res) {
	try {
		const userId = req.user.id;
		const limit = Math.min(50, parseInt(req.query.limit) || 10);

		const transactions = await getRecentTransactions(userId, limit);

		res.status(200).json(
			formatSuccessResponse(
				"Recent transactions retrieved successfully",
				transactions,
			),
		);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

/**
 * Get transaction by reference ID
 * GET /transactions/:reference
 *
 * Headers: Authorization: Bearer <token>
 */
export async function getTransactionByReferenceController(req, res) {
	try {
		const { reference } = req.params;
		const userId = req.user.id;

		const transactions = await getTransactionByReference(reference);

		// Security: Only return if user is involved
		const userTransaction = transactions.find(
			(t) => t.userId._id.toString() === userId,
		);

		if (!userTransaction) {
			return res
				.status(403)
				.json(
					formatErrorResponse(
						new ForbiddenError(
							"You are not authorized to view this transaction",
						),
					),
				);
		}

		res.status(200).json(
			formatSuccessResponse(
				"Transaction retrieved successfully",
				transactions,
			),
		);
	} catch (error) {
		const statusCode = error.statusCode || 404;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

/**
 * Get user's balance
 * GET /transactions/balance
 *
 * Headers: Authorization: Bearer <token>
 */
export async function getBalanceController(req, res) {
	try {
		const userId = req.user.id;
		const balance = await getUserBalance(userId);

		res.status(200).json(
			formatSuccessResponse("Balance retrieved successfully", {
				balance,
			}),
		);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

/**
 * Get transaction statistics
 * GET /transactions/stats
 *
 * Headers: Authorization: Bearer <token>
 */
export async function getTransactionStatsController(req, res) {
	try {
		const userId = req.user.id;
		const stats = await getTransactionStats(userId);

		res.status(200).json(
			formatSuccessResponse("Statistics retrieved successfully", stats),
		);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json(formatErrorResponse(error));
	}
}

export default {
	transferController,
	getTransactionsController,
	getRecentTransactionsController,
	getTransactionByReferenceController,
	getBalanceController,
	getTransactionStatsController,
};
