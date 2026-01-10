import { AuthenticateUser, validateInfo } from '../services/auth.service.js';
import { createUser, setVerifyUser } from '../services/user.service.js';
import { 
    updateRefreshToken, 
    invalidateRefreshToken 
} from '../services/token.service.js';
import { 
    generateOTP, 
    verifyOTP, 
    canRequestOTP 
} from '../services/otp.service.js';
import { sendOTPEmail } from '../services/email.service.js'; // TODO: Implement
import { sendOTPSMS } from '../services/sms.service.js'; // TODO: Implement
import { 
    validateSignupInputs, 
    validateLoginInputs,
    validateOTP as validateOTPFormat 
} from '../utils/validators.util.js';
import { ValidationError } from '../utils/errors.util.js';

/**
 * HELPER: Set refresh token cookie
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
 * Signup controller
 * POST /auth/signup
 * 
 * Body: { email, password, phone }
 */
export async function signupController(req, res) {
    try {
        const { email, password, phone } = req.body;

        // Validate inputs using reusable validator
        validateSignupInputs({ email, password, phone });

        // Create user
        const user = await createUser(email, password, phone);

        // Generate OTP for email verification
        const otp = await generateOTP(user.id, 'EMAIL_VERIFICATION');

        // Send OTP via email
        // TODO: Implement sendOTPEmail
        // await sendOTPEmail(email, otp);
        console.log(`📧 OTP for ${email}: ${otp} (In production, send via email)`);

        res.status(201).json({
            success: true,
            message: 'User created successfully. Please verify your email.',
            userId: user.id,
            // REMOVE IN PRODUCTION - only for development
            devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            success: false,
            message: error.message,
            ...(error.errors && { errors: error.errors })
        });
    }
}

/**
 * Verify OTP controller
 * POST /auth/verify-otp
 * 
 * Body: { userId, otp, type }
 */
export async function verifyOTPController(req, res) {
    try {
        const { userId, otp, type } = req.body;

        // Validate inputs
        if (!userId || !otp || !type) {
            throw new ValidationError('userId, otp, and type are required');
        }

        validateOTPFormat(otp);

        // Verify OTP
        const isValid = await verifyOTP(userId, otp, type);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Mark user as verified
        await setVerifyUser(userId);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Resend OTP controller
 * POST /auth/resend-otp
 * 
 * Body: { userId, type }
 */
export async function resendOTPController(req, res) {
    try {
        const { userId, type } = req.body;

        // Validate inputs
        if (!userId || !type) {
            throw new ValidationError('userId and type are required');
        }

        // Check rate limiting
        const canRequest = await canRequestOTP(userId, type);
        if (!canRequest) {
            return res.status(429).json({
                success: false,
                message: 'Too many OTP requests. Please wait before requesting again.'
            });
        }

        // Generate new OTP
        const otp = await generateOTP(userId, type);

        // Send OTP based on type
        if (type === 'EMAIL_VERIFICATION') {
            // await sendOTPEmail(email, otp);
            console.log(`📧 Resent OTP: ${otp}`);
        } else if (type === 'SMS_VERIFICATION') {
            // await sendOTPSMS(phone, otp);
            console.log(`📱 Resent OTP: ${otp}`);
        }

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            // REMOVE IN PRODUCTION
            devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Login controller
 * POST /auth/login
 * 
 * Body: { email, password }
 */
export async function loginController(req, res) {
    try {
        const { email, password } = req.body;

        // Validate inputs
        validateLoginInputs({ email, password });

        // Authenticate user
        const result = await AuthenticateUser(email, password);

        // Set refresh token cookie
        setRefreshTokenCookie(res, result.refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: result.token,
            user: result.user
        });
    } catch (error) {
        const statusCode = error.statusCode || 401;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Refresh token controller
 * POST /auth/refresh
 * 
 * Cookie: refreshToken OR Body: { refreshToken }
 */
export async function refreshTokenController(req, res) {
    try {
        const oldToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!oldToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is missing'
            });
        }

        const tokens = await updateRefreshToken(oldToken);
        setRefreshTokenCookie(res, tokens.refreshToken);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            token: tokens.token
        });
    } catch (error) {
        res.status(403).json({
            success: false,
            message: error.message || 'Token refresh failed'
        });
    }
}

/**
 * Logout controller
 * POST /auth/logout
 * 
 * Cookie: refreshToken
 */
export async function logoutController(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await invalidateRefreshToken(refreshToken);
        }

        res.clearCookie('refreshToken');
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        // Clear cookie even on error
        res.clearCookie('refreshToken');
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }
}