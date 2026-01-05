import { transferMoney } from '../services/transaction.service.js';

export const transfer = async (req, res) => {
  try {
    const { toEmail, amount } = req.body;
    const fromUserId = req.user.id;
    
    await transferMoney(fromUserId, toEmail, amount);

    res.json({ message: 'Money transferred successfully' });

  } catch (error) {
    res.status(400).json({ message: 'Transaction failed', error: error.message });
  }
};