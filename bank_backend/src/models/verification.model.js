import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        auto: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'User ID is required'],
        index: true
    },
    hashedOTP: {
        type: String,
        required: [true, 'OTP hash is required']
    },
    attempts: {
        type: Number,
        default: 0,
        max: [5, 'Maximum attempts exceeded']
    },
    type: {
        type: String,
        enum: {
            values: ['EMAIL_VERIFICATION', 'SMS_VERIFICATION', 'PASSWORD_RESET', 'TWO_FACTOR'],
            message: 'Invalid verification type'
        },
        required: [true, 'Verification type is required'],
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    // Track when verification was completed
    verifiedAt: {
        type: Date,
        default: null
    },
    isUsed: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });


// TTL Index: MongoDB will automatically delete expired documents
// Documents will be deleted shortly after expiresAt date
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for finding active verifications
verificationSchema.index({
    userId: 1,
    type: 1,
    isUsed: 1,
    expiresAt: 1
});


export default mongoose.model('Verifications', verificationSchema);