import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    email: {
      type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    },
    balance: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0,
        min: 0
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^\+?[0-9]{9,15}$/, 'Invalid phone number'],
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model("Users", userSchema);