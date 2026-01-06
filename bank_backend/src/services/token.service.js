import Users from '../models/user.model.js';
import { verifyRefreshToken,
         generateAccessToken,
         generateRefreshToken } from './jwt.service.js';

export async function updateRefreshToken(token){
    let payload;

    try {
        payload = verifyRefreshToken(token);
    } catch (error) {
        throw new Error("Invalid refresh token.");
    }
    
    const user = await Users.findById(payload.id);
    if (!user) {
        throw new Error("User not found.");
    }

    const tokenExists = user.refreshTokens.some(rt => rt.token === token);
    if (!tokenExists) {
        user.refreshTokens = [];
        await user.save();
        throw new Error("Invalid Refresh token reuse detected.");
    }

    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== token);
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    return {
        token: newAccessToken,
        refreshToken: newRefreshToken
    };
}