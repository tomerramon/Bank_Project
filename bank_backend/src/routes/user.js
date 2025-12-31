const express = require('express');

const router = express.Router();

router.get("/me", (req,res) => {
    res.json({
        msg:"Dashboard/me endpoint (stub)"
    });
});


module.exports = router;