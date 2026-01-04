import { Router } from 'express';
import {authMiddleware} from "../middlewares/auth.middleware.js";
import {users, transactions} from "../config/local_users.config.js";

const router = Router();

router.get("/me", authMiddleware, (req,res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }
    const userTransactions = transactions.filter(tx => tx.userId === user.id);
    res.json({ 
        email: user.email,
        balance: user.balance,
        transactions: userTransactions
    });
});

router.get("/all", (req,res) => {
    res.json({ users });
});

export default router;