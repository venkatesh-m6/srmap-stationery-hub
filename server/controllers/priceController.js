const Price = require('../models/Price');

/**
 * GET /api/prices — Public. Returns the current price configuration.
 */
const getPrices = async (req, res) => {
    try {
        const prices = await Price.getOrCreate();
        res.json(prices);
    } catch (error) {
        console.error('Get prices error:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
};

/**
 * POST /api/prices — Protected. Updates the price configuration.
 */
const updatePrices = async (req, res) => {
    try {
        const prices = await Price.getOrCreate();

        // Update only the fields that are provided in the request body
        const updatableFields = [
            'bw', 'color', 'firstPageColor', 'singleSided', 'doubleSided',
            'spiral', 'photo_4x6', 'passport', 'rush'
        ];

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                prices[field] = Number(req.body[field]);
            }
        });

        await prices.save();
        res.json(prices);
    } catch (error) {
        console.error('Update prices error:', error);
        res.status(500).json({ error: 'Failed to update prices' });
    }
};

module.exports = { getPrices, updatePrices };
