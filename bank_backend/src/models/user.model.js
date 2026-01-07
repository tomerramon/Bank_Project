import mongoose, { get } from "mongoose";

const userSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        index: true // For faster lookups
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false,
    },
    balance: {
        type: Number,
        required: true,
        default: function () {
            return Math.floor(Math.random() * 9000) + 1000;
        },
        min: [0, 'Balance cannot be negative'],
        get: v => v / 100,
        set: v => v * 100,
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
        index: true,
    },
    refreshTokens: [{
        token: {
            type: String,
            required: true,
            index: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 604800 // TTL: 7 days in seconds (auto-delete)
        }
    }],
    accountStatus: {
        type: String,
        enum: ['active', 'closed', 'suspended'],
        defualt: 'active',
        index: true,
    },
    // Security: track failed login attempts
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    accountLockedUntil: {
        type: Date,
        default: null
    },
// Optional: user profile (for future features)
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
    timestamps: true,
    toJSON: {
        getters: true, // Apply getters when converting to JSON
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

// Indexes for performance
userSchema.index({ email: 1, accountStatus: 1 }); // Compound index
userSchema.index({ createdAt: -1 }); // For sorting by registration date

// Virtual property: get the users full name
userSchema.virtual('fullName').git(function(){
    if (this.profile && this.profile.firstName && this.profile.lastName)
    {
        return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.email;
});

// Instance method: check if account is locked
userSchema.methods.isAccountLocked = async function () {
    return this.accountLockedUntil && this.accountLockedUntil > Date.now();
}

// Instance method: increment failed login attempts
userSchema.methods.incrementLoginAttempts  = async () => {
    // If we have a previous lock that has expired, restart attempts to 1
    if(this.accountLockedUntil && this.accountLockedUntil < Date.now())
    {
        return this.updateOne({
            $set: {failedLoginAttempts: 1},
            $unset: {accountLockedUntil: 1}
        });
    }

    //else increment failed attempts
    const updates = { $inc: { failedLoginAttempts: 1 }};

    //if 5 faile attempts -> lock account for 30 min.
    const maxAttempts = 5;
    if (this.failedLoginAttempts + 1 >= maxAttempts){
        updates.$set = { accountLockedUntil: Date.now() + 30 * 60 * 1000 }; // lock for 30 min
    }
    return this.updateOne(updates);
}

// Instance method: reset failed login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { failedLoginAttempts: 0 },
        $unset: { accountLockedUntil: 1 }
    });
};

// Static method: clean up old refresh tokens (run periodically)
userSchema.statics.cleanRefreshTokens = async () => {
    const sevenDaysPassed = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.updatemany(
        {'refreshTokens.createdAt': {$lt: sevenDaysPassed}},
        {$pull: {refreshTokens: {createdAt: {$lt: sevenDaysPassed}}}}
    );
}


userSchema.pre('save', () => {
    if (this.refreshTokens && this.refreshTokens.length > 5 ){
        this.refreshTokens = this.refreshTokens.sort((a,b) => b.createdAt - a.createdAt).slice(0,5);
    }
    next();
});


export default mongoose.model("Users", userSchema);
