const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../middleware/upload');
const { countPages } = require('../controllers/pageCountController');

router.post('/', uploadMiddleware, countPages);

module.exports = router;
