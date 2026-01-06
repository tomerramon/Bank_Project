import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    peerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    direction: {
        type: String,
        enum: ['T_IN', 'T_OUT'],
        required: true
    },
    reference: {
        type: String,
        required: true,
    },
}, { timestamps: true ,indexes: [{ peerUserId: 1 }, { reference: 1 }] });

export default mongoose.model('Transactions', transactionSchema);