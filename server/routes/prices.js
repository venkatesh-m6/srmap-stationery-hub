const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/auth');
const { getPrices, updatePrices } = require('../controllers/priceController');

// Public: get current prices
router.get('/', getPrices);

// Protected: update prices (admin only)
router.post('/', checkAuth, updatePrices);

module.exports = router;
