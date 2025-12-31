const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.json({ message: 'transaction create/post (stub)' });
});

router.get('/', (req, res) => {
  res.json({ message: 'transaction get method (stub)' });
});

module.exports = router;
