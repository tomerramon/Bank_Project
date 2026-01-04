// const express = require('press');
import { Router } from 'express';
const router = Router();

router.post('/', (req, res) => {
  res.json({ message: 'transaction create/post (stub)' });
});

router.get('/', (req, res) => {
  res.json({ message: 'transaction get method (stub)' });
});

export default router; // <--- ADD THIS LINE

// module.exports = router;
