import { Router } from 'express';
import { createUser } from "../services/user.service.js";
import { validateInfo } from "../services/auth.service.js";
import { loginController, logoutController, refreshTokenController } from "../controllers/auth.controller.js";


const router = Router();


router.post("/signup", async (req, res) => {
    try {
        const { email, password, phone } = req.body;
        // Validate all required fields are present
        if (!email || !password || !phone) {
            return res.status(400).json({
                msg: "Missing required fields",
                required: ["email", "password", "phone"]
            });
        }

        // Validate email format, password strength, and phone format
        await validateInfo(email, password, phone);

        // Create the user (this also checks for duplicates)
        const user = await createUser(email, password, phone);

        // TODO: Send OTP for verification
        // const otp = await generateOTP(user.id, 'EMAIL_VERIFICATION');
        // await sendOTPEmail(email, otp);


        res.status(201).json({
            msg: "User created successfully. Please verify your email.",
            user: user,
            // In production, don't send this message - require verification first
            note: "In development mode - account created. OTP verification pending implementation."
        });
    }
    catch (error) {
        // Handle validation errors specifically
        if (error.errors && Array.isArray(error.errors)) {
            return res.status(400).json({
                msg: "Validation failed",
                errors: error.errors
            });
        }

        // Handle other errors
        res.status(400).json({
            msg: "Failed to create user",
            error: error.message
        });
    }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT tokens
 */
router.post("/login", loginController);

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 */
router.post("/refresh", refreshTokenController);

/**
 * POST /auth/logout
 * Invalidate refresh token
 */

router.post("/logout", logoutController);


/**
 * POST /auth/verify-otp
 * Verify OTP sent to email/phone during signup
 * 
 * Body: { userId, otp, type }
 * 
 * TODO: Implement full OTP verification
 */
router.post("/verify-otp", async (req, res) => {
    try {
        const { userId, otp, type } = req.body;
        
        // Validate inputs
        if (!userId || !otp || !type) {
            return res.status(400).json({
                msg: "Missing required fields",
                required: ["userId", "otp", "type"]
            });
        }
        
        // TODO: Implement actual OTP verification
        // const isValid = await verifyOTP(userId, otp, type);
        // if (isValid) {
        //     await setVerifyUser(userId);
        //     return res.status(200).json({
        //         msg: "OTP verified successfully",
        //         verified: true
        //     });
        // }
        
        // Temporary stub response
        res.status(200).json({
            msg: "OTP verification endpoint (implementation pending)",
            note: "This is a stub - implement OTP verification service"
        });
    } 
    catch (error) {
        res.status(400).json({
            msg: "OTP verification failed",
            error: error.message
        });
    }
});


/**
 * POST /auth/resend-otp
 * Resend OTP to user's email/phone
 * 
 * Body: { userId, type }
 * 
 * TODO: Implement OTP resend with rate limiting
 */
router.post("/resend-otp", async (req, res) => {
    try {
        const { userId, type } = req.body;
        
        if (!userId || !type) {
            return res.status(400).json({
                msg: "Missing required fields",
                required: ["userId", "type"]
            });
        }
        
        // TODO: Implement rate limiting (max 3 resends per 10 minutes)
        // TODO: Generate and send new OTP
        
        res.status(200).json({
            msg: "OTP resend endpoint (implementation pending)",
            note: "Implement with rate limiting"
        });
    } catch (error) {
        res.status(400).json({
            msg: "Failed to resend OTP",
            error: error.message
        });
    }
});


export default router;