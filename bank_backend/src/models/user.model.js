import mongoose from "mongoose";
import { generateInitialBalance } from "../config/constants.config.js";

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
 * - Notification preferences for email/SMS
 * - Profile information (name, DOB, address)
 */
const userSchema = new mongoose.Schema(
	{
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			auto: true,
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true, // Automatically convert to lowercase
			trim: true, // Remove whitespace
			match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
			index: true, // Index for faster lookups
		},
		passwordHash: {
			type: String,
			required: [true, "Password is required"],
			select: false, // Never include in queries by default (security)
		},
		// Use centsToDollars() in services when you need to display dollars
		balance: {
			type: Number,
			required: true,
			default: generateInitialBalance,
			min: [0, "Balance cannot be negative"],
		},
		phone: {
			type: String,
			required: [true, "Phone number is required"],
			unique: true,
			trim: true,
			match: [/^\+?[0-9]{9,15}$/, "Invalid phone number"],
			index: true,
		},
		isVerified: {
			type: Boolean,
			default: false,
			index: true, // Index for filtering verified users
		},
		// Refresh tokens array allows multiple devices to stay logged in
		refreshTokens: [
			{
				token: {
					type: String,
					required: true,
					index: true, // Index for fast logout lookups
				},
				createdAt: {
					type: Date,
					default: Date.now,
					expires: 604800, // TTL: 7 days in seconds (MongoDB auto-deletes)
				},
			},
		],
		accountStatus: {
			type: String,
			enum: {
				values: ["active", "closed", "suspended"],
				message: "Account status must be active, closed, or suspended",
			},
			default: "active",
			index: true,
		},
		// Security: Track failed login attempts to prevent brute force
		failedLoginAttempts: {
			type: Number,
			default: 0,
			min: 0,
		},
		accountLockedUntil: {
			type: Date,
			default: null,
		},
		notificationPreferences: {
			email: {
				type: Boolean,
				default: true, // Email notifications enabled by default
				required: true,
			},
			sms: {
				type: Boolean,
				default: false,
				required: true,
			},
		},
		profile: {
			firstName: {
				type: String,
				trim: true,
				maxlength: [50, "First name cannot exceed 50 characters"],
			},
			lastName: {
				type: String,
				trim: true,
				maxlength: [50, "Last name cannot exceed 50 characters"],
			},
			dateOfBirth: Date,
			address: {
				street: String,
				city: String,
				country: String,
				zipCode: String,
			},
			suspensionReason: String, // Only filled when account is suspended
		},
	},
	{
		timestamps: true, // Automatically add createdAt and updatedAt
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				// Remove sensitive fields from JSON output
				delete ret.passwordHash;
				delete ret.refreshTokens;
				delete ret.__v;
				return ret;
			},
		},
		toObject: {
			virtuals: true,
		},
	},
);

// Compound indexes for common query patterns
userSchema.index({ email: 1, accountStatus: 1 }); // Filter active users by email
userSchema.index({ createdAt: -1 }); // Sort by registration date
// userSchema.index({ 'refreshTokens.token': 1 }); // Fast logout lookups
userSchema.index({ phone: 1, accountStatus: 1 }); // Filter active users by phone

// ==========================================
// VIRTUALS
// ==========================================

/**
 * Virtual property: Get user's full name
 * Returns email if name is not set
 */
userSchema.virtual("fullName").get(function () {
	if (this.profile?.firstName && this.profile?.lastName) {
		return `${this.profile.firstName} ${this.profile.lastName}`;
	}
	return this.email;
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Check if account is currently locked
 *
 * @returns {boolean} - true if account is locked
 */
userSchema.methods.isAccountLocked = function () {
	return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

/**
 * Increment failed login attempts
 * Locks account for 30 minutes after 5 failed attempts
 *
 * @returns {Promise} - Update operation result
 */
userSchema.methods.incrementLoginAttempts = function () {
	// If we have a previous lock that has expired, restart attempts to 1
	if (this.accountLockedUntil && this.accountLockedUntil < Date.now()) {
		return this.updateOne({
			$set: { failedLoginAttempts: 1 },
			$unset: { accountLockedUntil: 1 },
		});
	}
	// Otherwise increment failed attempts
	const updates = { $inc: { failedLoginAttempts: 1 } };

	// Lock account for 30 minutes after 5 failed attempts
	const MAX_ATTEMPTS = 5;
	if (this.failedLoginAttempts + 1 >= MAX_ATTEMPTS) {
		updates.$set = {
			accountLockedUntil: new Date(Date.now() + 30 * 60 * 1000),
		};
	}

	return this.updateOne(updates);
};

/**
 * Reset failed login attempts on successful login
 *
 * @returns {Promise} - Update operation result
 */
userSchema.methods.resetLoginAttempts = function () {
	return this.updateOne({
		$set: { failedLoginAttempts: 0 },
		$unset: { accountLockedUntil: 1 },
	});
};

/**
 * Add a new refresh token to user's tokens array
 *
 * @param {string} token - Refresh token to add
 * @returns {Promise} - Save operation result
 */
userSchema.methods.addRefreshToken = async function (token) {
	this.refreshTokens.push({
		token,
		createdAt: new Date(),
	});
	return this.save();
};

/**
 * Remove a specific refresh token
 *
 * @param {string} token - Token to remove
 * @returns {Promise} - Update operation result
 */
userSchema.methods.removeRefreshToken = function (token) {
	return this.updateOne({
		$pull: { refreshTokens: { token } },
	});
};

/**
 * Remove all refresh tokens (logout from all devices)
 *
 * @returns {Promise} - Update operation result
 */
userSchema.methods.removeAllRefreshTokens = function () {
	return this.updateOne({
		$set: { refreshTokens: [] },
	});
};

/**
 * Check if user wants email notifications
 *
 * @returns {boolean} - true if email notifications are enabled
 */
userSchema.methods.wantsEmailNotifications = function () {
	return this.notificationPreferences?.email !== false; // Default true
};

/**
 * Check if user wants SMS notifications
 *
 * @returns {boolean} - true if SMS notifications are enabled
 */
userSchema.methods.wantsSMSNotifications = function () {
	return this.notificationPreferences?.sms !== false; // Default true
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Clean up old refresh tokens (run periodically via cron job)
 * This is a backup cleanup in case TTL index doesn't work
 *
 * @returns {Promise} - Update operation result
 */
userSchema.statics.cleanRefreshTokens = async function () {
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	return this.updateMany(
		{ "refreshTokens.createdAt": { $lt: sevenDaysAgo } },
		{ $pull: { refreshTokens: { createdAt: { $lt: sevenDaysAgo } } } },
	);
};

/**
 * Find user by email (case-insensitive)
 *
 * @param {string} email - User email
 * @returns {Promise} - User document or null
 */
userSchema.statics.findByEmail = function (email) {
	return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by phone
 *
 * @param {string} phone - User phone
 * @returns {Promise} - User document or null
 */
userSchema.statics.findByPhone = function (phone) {
	return this.findOne({ phone });
};

// ==========================================
// PRE-SAVE HOOKS
// ==========================================

/**
 * Pre-save hook: Ensure email is lowercase
 */
userSchema.pre("save", function (next) {
	if (this.email) {
		this.email = this.email.toLowerCase();
	}
});

/**
 * Pre-save hook: Limit refresh tokens to 5 per user
 * This prevents memory issues and forces re-login on old devices
 */
userSchema.pre("save", function (next) {
	if (this.refreshTokens && this.refreshTokens.length > 5) {
		// Keep only the 5 most recent tokens
		this.refreshTokens = this.refreshTokens
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, 5);
	}
});

export default mongoose.model("Users", userSchema);
