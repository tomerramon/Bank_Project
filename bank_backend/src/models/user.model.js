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
				},
				createdAt: {
					type: Date,
					default: Date.now,
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
userSchema.index({ "refreshTokens.token": 1 }); // Fast logout lookups
userSchema.index({ phone: 1, accountStatus: 1 }); // Filter active users by phone

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

export default mongoose.model("Users", userSchema);
