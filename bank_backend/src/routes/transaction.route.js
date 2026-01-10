// ==========================================
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
    transferController,
    getTransactionsController,
    getRecentTransactionsController,
    getTransactionByReferenceController,
    getBalanceController,
    getTransactionStatsController
} from '../controllers/transaction.controller.js';

const router = Router();

// All transaction routes require authentication
router.use(authMiddleware);

// Transfer money
router.post('/transfer', transferController);

// Get user's transaction history
router.get('/', getTransactionsController);

// Get recent transactions
router.get('/recent', getRecentTransactionsController);

// Get user's balance
router.get('/balance', getBalanceController);

// Get transaction statistics
router.get('/stats', getTransactionStatsController);

// Get transaction by reference
router.get('/:reference', getTransactionByReferenceController);

export default router;