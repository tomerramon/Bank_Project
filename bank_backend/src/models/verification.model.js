import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
        unique: true,
        auto: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    hashedOTP: {
        type: String,
        required: true,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    type: {
        type: String,
        enum: ['EMAIL_VERIFICATION', 'SMS_VERIFICATION', 'PASSWORD_RESET'],
        required: true,
    },
    expiresAt: {    
        type: Date,
        required: true,
    }
}, { timestamps: true });

verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Verifications', verificationSchema);

    

