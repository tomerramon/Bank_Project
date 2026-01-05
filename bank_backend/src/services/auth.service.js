import bycrypt from "bcryptjs";
import { GenerateToken } from "./jwt.service.js";
import Users from '../models/user.model.js';

export async function AuthenticateUser(email, password) {

    const user = await Users.findOne({ email }).select('+hashedPassword');

    if (!user) {
        throw new Error("Authentication failed: Invalid email or password.");
    }

    const isPasswordMatch = await bycrypt.compare(password, user.hashedPassword);
    if (!isPasswordMatch) {
        throw new Error("Authentication failed: Invalid email or password.");
    }

    if (!user.isVerified) {
        throw new Error("Authentication failed: user is not verified.");
    }

    const token = GenerateToken(user);
    return {
        token,
        user: {
            id: user._id,
            email: user.email
        }
    };
}



