import { Router } from 'express';
import auth from '../middlewares/auth.middleware.js';
import { CreateTransaction } from '../services/transaction.service.js';

const router = Router();

router.post('/', (req, res) => {
  res.json({ message: 'transaction create/post (stub)' });
});

router.get('/', (req, res) => {
  res.json({ message: 'transaction get method (stub)' });
});

router.post('/transfer', auth, (req, res) => {
  try {
    const result = CreateTransaction(req.user.id, req.body.toUserId, req.body.amount);
    res.json({ message: 'Transaction successful', transaction: result });
  } catch (error) {
    res.status(400).json({ message: 'Transaction failed', error: error.message });
  }
});

export default router;
