import {
    transferMoney,
    getUserTransactions,
    getUserRecentTransactions,
    getTransactionByReference,
    getUserBalance,
} from '../services/transaction.service.js';
import { validateTransferInputs } from '../utils/inputValidation.util.js';
import { buildPaginationParams ,getUserTransactionStats} from '../utils/query.util.js';

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

        // Validate inputs using reusable validator
        validateTransferInputs({ toEmail, amount });

        // Execute transfer
        const result = await transferMoney(fromUserId, toEmail, amount);

        res.status(200).json({
            success: true,
            message: 'Money transferred successfully',
            data: result
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            success: false,
            message: error.message,
            ...(error.details && { details: error.details })
        });
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
        
        // Build pagination and filter options
        const { page, limit } = buildPaginationParams(req.query);
        const { direction, startDate, endDate } = req.query;

        const options = {
            page,
            limit,
            ...(direction && { direction }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate })
        };

        const result = await getUserTransactions(userId, options);

        res.status(200).json({
            success: true,
            data: result.transactions,
            pagination: result.pagination
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
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

        const transactions = await getUserRecentTransactions(userId, limit);

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
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

        // Security: Only return transaction if user is involved
        const userTransaction = transactions.find(t => 
            t.userId._id.toString() === userId
        );

        if (!userTransaction) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this transaction'
            });
        }

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        const statusCode = error.statusCode || 404;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
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

        res.status(200).json({
            success: true,
            balance: balance
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
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
        const stats = await getUserTransactionStats(userId);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}