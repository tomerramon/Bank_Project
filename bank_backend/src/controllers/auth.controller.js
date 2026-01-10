import { AuthenticateUser } from '../services/auth.service.js';
import { updateRefreshToken, invalidateRefreshToken } from '../services/token.service.js';
import Users from '../models/user.model.js';


/**
 * REUSABLE HELPER: Set refresh token cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

/**
 * REUSABLE HELPER: Validate required fields
 */
function validateRequiredFields(fields, fieldNames) {
    const missing = fieldNames.filter(name => !fields[name]);
    if (missing.length > 0) {
        const error = new Error('Missing required fields');
        error.statusCode = 400;
        error.missing = missing;
        throw error;
    }
}


/**
 * Login controller
 */
export async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        
        // Validate input using reusable helper
        validateRequiredFields({ email, password }, ['email', 'password']);

        const result = await AuthenticateUser(email, password);

        // Set cookie using reusable helper
        setRefreshTokenCookie(res, result.refreshToken);

        res.status(200).json({
            msg: "Login successful",
            token: result.token,
            user: result.user
        });
    } catch (error) {
        const statusCode = error.statusCode || 401;
        res.status(statusCode).json({
            msg: error.message || "Authentication failed"
        });
    }
}


/**
 * Refresh token controller
 */
export async function refreshTokenController(req, res) {
    try {
        const oldToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!oldToken) {
            return res.status(401).json({
                msg: "Refresh token is missing"
            });
        }

        const tokens = await updateRefreshToken(oldToken);
        setRefreshTokenCookie(res, tokens.refreshToken);

        res.status(200).json({
            msg: "Token refreshed successfully",
            token: tokens.token
        });
    } catch (error) {
        res.status(403).json({
            msg: error.message || "Token refresh failed"
        });
    }
}


/**
 * Logout controller
 */
export async function logoutController(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;
        
        if (refreshToken) {
            await invalidateRefreshToken(refreshToken);
        }

        res.clearCookie('refreshToken');
        res.status(200).json({ msg: "Logged out successfully" });
    } catch (error) {
        res.clearCookie('refreshToken');
        res.status(200).json({ msg: "Logged out successfully" });
    }
}