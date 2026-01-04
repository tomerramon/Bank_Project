import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
        unique: true
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    type: {
        type: String,
        enum: ['debit', 'credit'],
        required: true
    }
}, { timestamps: true ,indexes: [{ fromUser: 1 }, { toUser: 1 }]});

export default mongoose.model('Transaction', transactionSchema);