import { Router } from 'express';
import { CreateUser } from "../services/user.service.js";
import { loginController } from "../controllers/auth.controller.js";
const router = Router();

router.post("/signup", (req,res) => {
    try {
        const user = CreateUser(req.body.email, req.body.password);
        res.status(201).json({
            msg: "User created successfully",
            user: user
        });
    } 
    catch (error) {
        res.status(400).json({
            msg: "Failed to create user",
            error: error.message
        });
    }
});

router.post("/login", loginController);


router.post("/logout", (req,res) => {
    // For stateless JWT, logout can be handled on client side by deleting the token.
    res.status(200).json({
        msg: "User logged out successfully (stub)"
    });
});

router.post("/verify-otp", (req,res) => {
    try {
        // OTP verification logic would go here
        res.status(200).json({
            msg: "OTP verified successfully (stub)"
        });
    } 
    catch (error) {
        res.status(400).json({
            msg: "OTP verification failed (stub)",
            error: error.message
        });
    }
});


export default router;