import { AuthenticateUser } from '../services/auth.service.js';
import { updateRefreshToken } from '../services/token.service.js';
import Users from '../models/user.model.js';

export async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        const result = await AuthenticateUser(email, password);
        
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
        });

        res.status(200).json({
            msg: "User authenticated successfully",
            authData: result.token
                });
    } catch (error) {
        res.status(401).json({
            msg: "Authentication failed",
            error: error.message
        });
    }
}


export async function refreshTokenController(req, res) {
    try {
        const oldToken = req.body.refreshToken;
        if (!oldToken) {
            return res.status(401).json({
                msg: "Refresh token is missing."
            });
        }

        const tokens = await updateRefreshToken(oldToken);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
        });
        res.status(200).json({
            msg: "Token refreshed successfully.",
            accessToken: tokens.token,
        });
    } catch (error) {
        res.status(403).json({
            msg: error.message,
        });
    }
}

export async function logoutController(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.sendStatus(204);
    }

    const user = await Users.findOne({ 'refreshTokens.token': refreshToken });
    if (user) {
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
        await user.save();
    }

    res.clearCookie('refreshToken');
    res.sendStatus(204);
}