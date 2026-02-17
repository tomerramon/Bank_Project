import mongoose from "mongoose";

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
				values: ["T_IN", "T_OUT"],
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

// Virtual property: formatted amount with currency
transactionSchema.virtual("formattedAmount").get(function () {
	const amount = this.amount; // getter applied automatically
	const sign = this.direction === "T_IN" ? "+" : "-";
	return `${sign}$${amount.toFixed(2)}`;
});

// Static method: get transaction by reference
transactionSchema.statics.getByReference = async function (reference) {
	return this.find({ reference })
		.populate("userId", "email")
		.populate("peerUserId", "email")
		.lean();
};

// Virtual property: peer email (populated)
transactionSchema.virtual("peerEmail", {
	ref: "Users",
	localField: "peerUserId",
	foreignField: "_id",
	justOne: true,
	options: { select: "email" },
});

// Static method: get user's transaction history with pagination
transactionSchema.statics.getUserTransactions = async function (
	userId,
	options = {},
) {
	const {
		page = 1,
		limit = 20,
		direction = null,
		startDate = null,
		endDate = null,
	} = options;

	const query = { userId };

	if (direction) {
		query.direction = direction;
	}

	if (startDate || endDate) {
		query.createdAt = {};
		if (startDate) query.createdAt.$gte = new Date(startDate);
		if (endDate) query.createdAt.$lte = new Date(endDate);
	}

	const skip = (page - 1) * limit;

	const [transactions, total] = await Promise.all([
		this.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate("peerUserId", "email profile.firstName profile.lastName")
			.lean(),
		this.countDocuments(query),
	]);

	return {
		transactions,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			hasMore: skip + transactions.length < total,
		},
	};
};

export default mongoose.model("Transactions", transactionSchema);
