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
    otp: {
        type: String,
        required: true,
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

export default mongoose.model('Verifications', verificationSchema);

    

