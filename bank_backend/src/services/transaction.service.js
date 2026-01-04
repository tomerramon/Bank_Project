import { createRef } from "react";
import { users, transactions } from "../config/local_users.config.js";

export function CreateTransaction(fromUserId, toUserId, amount) {
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0 || !amount) {
        throw new Error("Invalid transaction amount.");
    }
    
    const fromUser = users.find(user => user.id === fromUserId);
    if (!fromUser) {
        throw new Error("Sender user not found.");
    }

    const toUser = users.find(user => user.id === toUserId);
    if (!toUser) {
        throw new Error("Receiver  user not found.");
    }
    
    if (fromUser.id === toUser.id) {
        throw new Error("Cannot money transfer to the same account.");
    }

    if (fromUser.balance < amount) {
        throw new Error("Insufficient funds for the transaction.");
    }

    fromUser.balance -= amount;
    toUser.balance += amount;
    
    const newTransactionIn = {
        id: Date.now().toString(),
        userId: fromUser.id,
        otherUserId: toUser.id,
        amount: -amount,
        createAt: new Date().toString(),
    };

    const newTransactionOut = {
        id: Date.now().toString(),
        userId: toUser.id,
        otherUserId: fromUser.id,
        amount: amount,
        createAt: newTransactionIn.createAt,
    };

    transactions.push(newTransactionIn);
    transactions.push(newTransactionOut);
    
    return { newTransactionIn, newTransactionOut };
}

export function GetTransactionsByUserId(userId) {
    return transactions.filter(tx => tx.userId === userId);
}

export function GetTransactionsByUserEmail(email) {
    const user = users.find(u => u.email === email);
    if (!user) {
        throw new Error("User not found.");
    }
    return GetTransactionsByUserId(user.id);
}