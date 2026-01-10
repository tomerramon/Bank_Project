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


// Static method: create new OTP
verificationSchema.statics.createOTP = async function(userId, type, otpHash, expirationMinutes = 10) {
    // Delete any existing unused OTPs of the same type for this user
    await this.deleteMany({ 
        userId, 
        type, 
        isUsed: false 
    });

    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    return this.create({
        userId,
        hashedOTP: otpHash,
        type,
        expiresAt
    });
};


// Static method: find valid OTP
verificationSchema.statics.findValidOTP = async function(userId, type) {
    return this.findOne({
        userId,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }); // Get the most recent one
};


// Instance method: mark as used
verificationSchema.methods.markAsUsed = async function() {
    this.isUsed = true;
    this.verifiedAt = new Date();
    return this.save();
};


// Instance method: increment attempts
verificationSchema.methods.incrementAttempts = async function() {
    this.attempts += 1;
    return this.save();
};


// Instance method: check if max attempts reached
verificationSchema.methods.hasReachedMaxAttempts = function() {
    return this.attempts >= 5;
};


// Static method: cleanup old used verifications (run periodically)
verificationSchema.statics.cleanupOldVerifications = async function() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    const result = await this.deleteMany({
        isUsed: true,
        verifiedAt: { $lt: threeDaysAgo }
    });

    return result.deletedCount;
};


export default mongoose.model('Verifications', verificationSchema);