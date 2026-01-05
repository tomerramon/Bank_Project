// import { users, transactions } from "../config/local_users.config.js";
import mongoose from 'mongoose';
import Users from '../models/user.model.js';
import Transactions from '../models/transaction.model.js';


export function GetTransactionsByUserId(userId) {
    return Transactions.filter(tx => tx.userId === userId);
}

export function GetTransactionsByUserEmail(email) {
    const user = Users.find(u => u.email === email);
    if (!user) {
        throw new Error("User not found.");
    }
    return GetTransactionsByUserId(user.id);
}

export const transferMoney = async (fromUserId, toEmail, amount) => {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid transfer amount: ' + amount);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const receiver = await Users.findOne({ email: toEmail }).session(session).select('_id');
    if (!receiver){
       throw new Error('Receiver not found');
    }

    if (receiver._id.equals(fromUserId)) {
      throw new Error('Cannot transfer money to the same account');
    }

    // Atomic guarded debit
    const senderResult = await Users.updateOne(
      { _id: fromUserId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { session }
    );

    if (senderResult.matchedCount !== 1) {
      throw new Error('Insufficient funds');
    }

    // Atomic credit
    await Users.updateOne(
      { _id: receiver._id },
      { $inc: { balance: amount } },
      { session }
    );

    const reference = new mongoose.Types.ObjectId().toString();

    await Transactions.create([
      {
        userId: fromUserId,
        peerUserId: receiver._id,
        amount,
        direction: 'T_OUT',
        reference
      },
      {
        userId: receiver._id,
        peerUserId: fromUserId,
        amount,
        direction: 'T_IN',
        reference
      }
    ], { session });

    await session.commitTransaction();
    return { reference };

  }
  catch (err) {
    await session.abortTransaction();
    throw err;
  }
   finally {
    session.endSession();
  }
};



// Mock functions for local testing:

// export default function CreateTransaction(fromUserId, toUserId, amount) {
//     amount = Number(amount);
//     if (isNaN(amount) || amount <= 0 || !amount) {
//         throw new Error("Invalid transaction amount.");
//     }
    
//     const fromUser = users.find(user => user.id === fromUserId);
//     if (!fromUser) {
//         throw new Error("Sender user not found.");
//     }

//     const toUser = users.find(user => user.id === toUserId);
//     if (!toUser) {
//         throw new Error("Receiver  user not found.");
//     }
    
//     if (fromUser.id === toUser.id) {
//         throw new Error("Cannot money transfer to the same account.");
//     }

//     if (fromUser.balance < amount) {
//         throw new Error("Insufficient funds for the transaction.");
//     }

//     fromUser.balance -= amount;
//     toUser.balance += amount;
    
//     const newTransactionIn = {
//         id: Date.now().toString(),
//         userId: fromUser.id,
//         otherUserId: toUser.id,
//         amount: -amount,
//         createAt: new Date().toString(),
//     };

//     const newTransactionOut = {
//         id: Date.now().toString(),
//         userId: toUser.id,
//         otherUserId: fromUser.id,
//         amount: amount,
//         createAt: newTransactionIn.createAt,
//     };

//     transactions.push(newTransactionIn);
//     transactions.push(newTransactionOut);
    
//     return { newTransactionIn, newTransactionOut };
// }
