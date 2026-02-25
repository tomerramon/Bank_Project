import mongoose from "mongoose";
import { TRANSACTION } from "../config/constants.config";

const transactionSchema = new mongoose.Schema(
	{
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			auto: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users", // Match the model name in user.model.js
			required: true,
			index: true, // CRITICAL: most queries filter by userId
		},
		peerUserId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
			required: [true, "Peer user ID is required"],
			index: true,
		},
		amount: {
			type: Number,
			required: [true, "Amount is required"],
			min: [1, "Amount must be at least 0.01 (Minimum 1 cent) "], // Minimum 1 cent
		},
		direction: {
			type: String,
			enum: {
				values: [TRANSACTION.DIRECTION.IN, TRANSACTION.DIRECTION.OUT],
				message: "Direction must be either T_IN or T_OUT",
			},
			required: [true, "Direction is required"],
			index: true,
		},
		reference: {
			type: String,
			required: [true, "Reference is required"],
		},
	},
	{
		timestamps: true, // Adds createdAt and updatedAt
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				delete ret.__v;
				return ret;
			},
		},
	},
);

// Compound indexes for common queries
transactionSchema.index({ userId: 1, direction: 1, createdAt: -1 }); // Filter by direction
transactionSchema.index({ reference: 1, userId: 1 }); // Find transaction by reference for specific user

export default mongoose.model("Transactions", transactionSchema);
