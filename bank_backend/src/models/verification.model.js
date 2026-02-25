import mongoose from "mongoose";
import { VERIFICATION } from "../config/constants.config.js";

const verificationSchema = new mongoose.Schema(
	{
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			auto: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
			required: [true, "User ID is required"],
			index: true,
		},
		hashedOTP: {
			type: String,
			required: [true, "OTP hash is required"],
		},
		attempts: {
			type: Number,
			default: 0,
			max: [5, "Maximum attempts exceeded"],
		},
		type: {
			type: String,
			enum: {
				values: [
					VERIFICATION.TYPES.EMAIL_VERIFICATION,
					VERIFICATION.TYPES.SMS_VERIFICATION,
					VERIFICATION.TYPES.PASSWORD_RESET,
					VERIFICATION.TYPES.TWO_FACTOR,
				],
				message: "Invalid verification type",
			},
			required: [true, "Verification type is required"],
			index: true,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
		verifiedAt: {
			type: Date,
			default: null,
		},
		isUsed: {
			type: Boolean,
			default: false,
			index: true,
		},
	},
	{ timestamps: true },
);

// Compound index for finding active verifications
verificationSchema.index({
	userId: 1,
	type: 1,
	isUsed: 1,
	expiresAt: 1,
});

export default mongoose.model("Verifications", verificationSchema);
