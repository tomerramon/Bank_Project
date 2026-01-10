import { Router } from 'express';
import {authMiddleware} from "../middlewares/auth.middleware.js";
import { getUserProfile } from '../services/user.service.js';
import { getUserProfile } from '../services/user.service.js';

const router = Router();

router.get("/me", authMiddleware, async (req, res) => {
    try {
        const profile = await getUserProfile(req.user.id);
        res.json(profile);
    } catch (error) {
        res.status(500).json({ 
            message: "Failed to get profile", 
            error: error.message 
        });
    }
});

router.get("/all", async (req, res) => {
    try {
        // WARNING: In production, this should be admin-only
        const users = await Users.find({})
            .select('email balance isVerified accountStatus createdAt');
        res.json({ users });
    } catch (error) {
        res.status(500).json({ 
            message: "Failed to get users", 
            error: error.message 
        });
    }
});

export default router;