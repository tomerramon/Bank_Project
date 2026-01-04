import { Router } from 'express';
import { users } from "../config/local_users.config.js";
const router = Router();

router.get("/me", (req,res) => {
    res.json({
        msg:"Dashboard/me endpoint (stub)",
    });
});


export default router;