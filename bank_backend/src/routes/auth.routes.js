const express = require('express');

const router = express.Router();

router.post("/signup", (req,res) => {
    res.json({
        msg:"Sign Up endpoint (stub)"
    });
});

router.post("/login", (req,res) => {
    res.json({
        msg:"Login endpoint (stub)"
    });
});

router.post("/logout", (req,res) => {
    res.json({
        msg:"Logout endpoint (stub)"
    });
});

router.post("/verify-otp", (req,res) => {
    res.json({
        msg:"Verify-Otp endpoint (stub)"
    });
});


module.exports = router;