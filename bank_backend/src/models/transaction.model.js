import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users', // Match the model name in user.model.js
        required: true,
        index: true // CRITICAL: most queries filter by userId

    },
    peerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Peer user ID is required'],
        index: true,
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [1, 'Amount must be at least 0.01 (Minimum 1 cent) '], // Minimum 1 cent
        get: v => v / 100,
        set: v => Math.floor(v * 100),
    },
    direction: {
        type: String,
        enum: {
            values: ['T_IN', 'T_OUT'],
            message: 'Direction must be either T_IN or T_OUT'
        },
        required: [true, 'Direction is required'],
        index: true,
    },
    reference: {
        type: String,
        required: [true, 'Reference is required'],

    },
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
        getters: true,
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});


// Compound indexes for common queries
transactionSchema.index({ userId: 1, direction: 1, createdAt: -1 }); // Filter by direction
transactionSchema.index({ reference: 1, userId: 1 }); // Find transaction by reference for specific user


// Virtual property: formatted amount with currency
transactionSchema.virtual('formattedAmount').get(function() {
    const amount = this.amount; // getter applied automatically
    const sign = this.direction === 'T_IN' ? '+' : '-';
    return `${sign}$${amount.toFixed(2)}`;
});



export default mongoose.model('Transactions', transactionSchema);