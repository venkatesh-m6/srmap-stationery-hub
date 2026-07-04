const express = require('express');
const checkAuth = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');

/**
 * Factory function that creates order routes.
 * Receives the controller object (already bound with dependencies).
 */
module.exports = function (controller) {
    const router = express.Router();

    // Public routes
    router.post('/', uploadMiddleware, controller.createOrder);
    router.post('/verify', controller.verifyPayment);

    // Protected routes (admin only)
    router.get('/', checkAuth, controller.getOrders);
    router.get('/stats', checkAuth, controller.getStats);
    router.get('/chart-data', checkAuth, controller.getChartData);
    router.patch('/:id/status', checkAuth, controller.updateOrderStatus);

    return router;
};
