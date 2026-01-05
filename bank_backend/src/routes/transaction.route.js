import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { transfer } from '../controllers/transaction.controller.js';

const router = Router();

router.post('/', (req, res) => {
  res.json({ message: 'transaction create/post (stub)' });
});

router.get('/', (req, res) => {
  res.json({ message: 'transaction get method (stub)' });
});

router.post('/transfer', authMiddleware, transfer);

export default router;
