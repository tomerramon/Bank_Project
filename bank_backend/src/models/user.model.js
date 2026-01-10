import mongoose from "mongoose";

/**
 * User Schema for Banking Application
 * 
 * Features:
 * - Email and phone validation with unique constraints
 * - Password hashing (stored in passwordHash, never exposed in JSON)
 * - Balance stored in cents for precise calculations
 * - Refresh token management with TTL
 * - Account status tracking (active/suspended/closed)
 * - Failed login attempt tracking for security
 * - Account locking after too many failed attempts
 */
const userSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true, // Automatically convert to lowercase
        trim: true, // Remove whitespace
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        index: true // Index for faster lookups
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false, // Never include in queries by default (security)
    },
    balance: {
        type: Number,
        required: true,
        // Generate random starting balance between $10.00 and $100.00
        default: function () {
            return Math.floor(Math.random() * 9000) + 1000;
        },
        min: [0, 'Balance cannot be negative'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^\+?[0-9]{9,15}$/, 'Invalid phone number'],
        index: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
        index: true, // Index for filtering verified users
    },
    // Refresh tokens array allows multiple devices to stay logged in
    refreshTokens: [{
        token: {
            type: String,
            required: true,
            index: true, // Index for fast logout lookups
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 604800 // TTL: 7 days in seconds (MongoDB auto-deletes)
        }
    }],
    accountStatus: {
        type: String,
        enum: ['active', 'closed', 'suspended'],
        default: 'active',
        index: true,
    },
    // Security: Track failed login attempts to prevent brute force
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    accountLockedUntil: {
        type: Date,
        default: null
    },
    // Optional: User profile for future features
    profile: {
        firstName: String,
        lastName: String,
        dateOfBirth: Date,
        address: {
            street: String,
            city: String,
            country: String,
            zipCode: String
        }
    }
}, {
    timestamps: true, // Automatically add createdAt and updatedAt
    toJSON: {
        getters: true, // Apply getters when converting to JSON (e.g., balance cents -> dollars)
        virtuals: true, // Include virtual properties
        transform: function(doc, ret) {
            // Remove sensitive fields from JSON output
            delete ret.passwordHash;
            delete ret.refreshTokens;
            delete ret.__v;
            return ret;
        }
    }
});

// Compound indexes for common query patterns
userSchema.index({ email: 1, accountStatus: 1 }); // Filter active users by email
userSchema.index({ createdAt: -1 }); // Sort by registration date
userSchema.index({ 'refreshTokens.token': 1 }); // Fast logout lookups

/**
 * Virtual property: Get user's full name
 * Returns email if name is not set
 */
userSchema.virtual('fullName').get(function(){ // Fixed: 'git' -> 'get'
    if (this.profile && this.profile.firstName && this.profile.lastName) {
        return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.email;
});

/**
 * Instance method: Check if account is currently locked
 * @returns {boolean} - true if account is locked
 */
userSchema.methods.isAccountLocked = async function () {
    return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

/**
 * Instance method: Increment failed login attempts
 * Locks account for 30 minutes after 5 failed attempts
 * 
 * Fixed: Changed from arrow function to regular function
 * Arrow functions don't have their own 'this' binding
 */
userSchema.methods.incrementLoginAttempts = async function() {
    // If we have a previous lock that has expired, restart attempts to 1
    if(this.accountLockedUntil && this.accountLockedUntil < Date.now()) {
        return this.updateOne({
            $set: {failedLoginAttempts: 1},
            $unset: {accountLockedUntil: 1}
        });
    }

    // Otherwise increment failed attempts
    const updates = { $inc: { failedLoginAttempts: 1 }};

    // If 5 failed attempts -> lock account for 30 minutes
    const maxAttempts = 5;
    if (this.failedLoginAttempts + 1 >= maxAttempts){
        updates.$set = { accountLockedUntil: Date.now() + 30 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

/**
 * Instance method: Reset failed login attempts on successful login
 * @returns {Promise} - Update operation result
 */
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { failedLoginAttempts: 0 },
        $unset: { accountLockedUntil: 1 }
    });
};

/**
 * Static method: Clean up old refresh tokens (run periodically via cron job)
 * This is a backup cleanup in case TTL index doesn't work
 * 
 * Fixed: 'updatemany' -> 'updateMany'
 */
userSchema.statics.cleanRefreshTokens = async function() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.updateMany(
        {'refreshTokens.createdAt': {$lt: sevenDaysAgo}},
        {$pull: {refreshTokens: {createdAt: {$lt: sevenDaysAgo}}}}
    );
};

/**
 * Pre-save hook: Limit refresh tokens to 5 per user
 * This prevents memory issues and forces re-login on old devices
 * 
 * Fixed: Added 'next' parameter
 */
userSchema.pre('save', function(next) {
    // Limit number of refresh tokens per user to prevent memory issues
    if (this.refreshTokens && this.refreshTokens.length > 5) {
        // Keep only the 5 most recent tokens
        this.refreshTokens = this.refreshTokens
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);
    }
    next();
});

export default mongoose.model("Users", userSchema);