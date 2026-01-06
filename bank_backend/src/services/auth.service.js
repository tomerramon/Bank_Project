import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "./jwt.service.js";
import Users from '../models/user.model.js';

export async function AuthenticateUser(email, password) {

    const user = await Users.findOne({ email })
                            .select('+hashedPassword');

    if (!user) {
        throw new Error("Authentication failed: Invalid email or password.");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
        throw new Error("Authentication failed: Invalid email or password.");
    }

    if (!user.isVerified) {
        throw new Error("Authentication failed: user is not verified.");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return {
        token: accessToken,
        refresToken: refreshToken,
        user: {
            id: user._id,
            email: user.email
        }
    };
}



