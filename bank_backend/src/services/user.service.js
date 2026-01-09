import bcrypt from "bcryptjs";
import Users from '../models/user.model.js';

/**
 * Find user by email
 * @param {string} email 
 * @returns {Promise<Object|null>}
 */
export async function FindUserByEmail(email) {
    return await Users.findOne({ email });
}

/**
 * Find user by ID
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
export async function findUserById(userId) {
    return await Users.findById(userId);
}

/**
 * Find user by phone number
 * @param {string} phone 
 * @returns {Promise<Object|null>}
 */
export async function findUserByPhone(phone) {
    return await Users.findOne({ phone });
}

/**
 * Create a new user
 * @param {string} email 
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} phone 
 * @returns {Promise<Object>} - Created user
 */
export async function createUser(email, password, phone) {
    // Validate required fields not null
    if (!email || !password || !phone) {
        throw new Error("Missing required fields: email, password, and phone are required");
    }

    // Check if user already exists by email
    let userExists = await FindUserByEmail(email);
    if (userExists) {
        throw new Error("A user with this email already exists");
    }

    userExists = await findUserByPhone(phone);
    if (userExists) {
        throw new Error("A user with this phone already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = await Users.create({
            email,
            passwordHash: hashedPassword,
            phone,
        });

        return {
            id: newUser._id,
            email: newUser.email,
            phone: newUser.phone,
            balance: newUser.balance,
            isVerified: newUser.isVerified,
            accountStatus: newUser.accountStatus,
            createdAt: newUser.createdAt
        };
    }
    catch (error) {
        // Handle MongoDB duplicate key errors (race condition)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw new Error(`${field} is already in use`);
        }
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            throw new Error(`Validation failed: ${messages.join(', ')}`);
        }

        // Re-throw unknown errors
        throw error;
    }
}

/**
 * Get user profile with balance and recent transactions
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export async function getUserProfile(userId, lim = 10) {
    const user = await Users.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    // Get recent transactions (last 10 transactions)
    // Using dynamic import to avoid circular dependencies
    const Transactions = (await import('../models/transaction.model.js')).default;
    const recentTransactions = await Transactions.find({ userId })
        .sort({ createdAt: -1 })
        .limit(lim)
        .populate('peerUserId', 'email')
        .lean(); // Returns plain JavaScript objects instead of Mongoose documents

    return {
        id: user._id,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        profile: user.profile,
        createdAt: user.createdAt,
        recentTransactions
    };
}

/**
 * Update user balance (internal use only, not exposed to API)
 * This should only be called from transaction service
 * @param {string} userId 
 * @param {number} amount - Amount to add (negative to subtract) in dollars
 * @param {Object} session - MongoDB session for transactions
 */
export async function updateUserBalance(userId, amount, session = null) {
    // Convert dollars to cents for storage
    const amountInCent = Math.floor(amount * 100);

    const res = await Users.updateOne(
        { _id: userId },
        { $inc: { balance: amountInCent } },
        { session }
    );

    if (res.matchedCount === 0) {
        throw new Error("User not found");
    }

    return res;
}

/**
 * Update user profile information
 * Only allows updating safe fields (not balance, email, etc.)
 * @param {string} userId 
 * @param {Object} updates - Fields to update
 */
export async function updateUserProfile(userId, updates) {
    // Only allow updating certain fields to prevent unauthorized changes
    const allowedFields = ['profile.firstName', 'profile.lastName', 'profile.address'];
    const approvedUpdates = {};

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)){
            approvedUpdates[key] = updates[key];
        }
    });

    if (Object.keys(approvedUpdates).length === 0){
        throw new Error("No valid fields to update");
    }

    const user = await Users.findByIdAndUpdate(
        userId,
        { $set: approvedUpdates },
        { 
            new: true, // Return updated document
            runValidators: true // Run schema validators
        }
    );

    if (!user){
        throw new Error("User not found");
    }

    return {
        id: user._id,
        email: user.email,
        phone: user.phone,
        profile: user.profile
    };
}

/**
 * Verify user account
 * Called after successful OTP verification
 * @param {string} userId 
 */
export async function setVerifyUser(userId) {
    const user = await Users.findByIdAndUpdate(
        userId,
        { $set: { isVerified: true } },
        { new: true }
    );

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

/**
 * Suspend user account (admin function)
 * @param {string} userId 
 * @param {string} reason 
 */
export async function suspendUser(userId, reason) {
    const user = await Users.findByIdAndUpdate(
        userId,
        { 
            $set: { 
                accountStatus: 'suspended',
                'profile.suspensionReason': reason
            } 
        },
        { new: true }
    );

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

/**
 * Get user statistics
 * Aggregates transaction data for analytics
 * @param {string} userId 
 */
export async function getUserStatistics(userId) {
    const Transactions = (await import('../models/transaction.model.js')).default;
    
    // Run queries in parallel for better performance
    const [user, stats] = await Promise.all([
        Users.findById(userId),
        Transactions.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: '$direction',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ])
    ]);

    if (!user) {
        throw new Error("User not found");
    }

    // Convert aggregation results to readable format
    const statsMap = stats.reduce((acc, stat) => {
        acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount / 100 // Convert cents to dollars
        };
        return acc;
    }, {});

    return {
        userId: user._id,
        email: user.email,
        currentBalance: user.balance,
        statistics: {
            sent: statsMap.T_OUT || { count: 0, totalAmount: 0 },
            received: statsMap.T_IN || { count: 0, totalAmount: 0 }
        },
        accountCreated: user.createdAt
    };
}