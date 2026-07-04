const Order = require('../models/Order');
const Price = require('../models/Price');
const crypto = require('crypto');

/**
 * Calculate price based on selected options and current price configuration.
 * Matches the original server.js calculatePrice logic exactly.
 */
function calculatePrice(options, prices) {
    let copyPrice = 0;
    const copies = parseInt(options.copies, 10) || 1;

    if (options.service) {
        // Photo services (passport, 4x6)
        copyPrice = prices[options.service] || 0;
    } else {
        // Document printing
        const pages = parseInt(options.pages, 10) || 1;
        let pageCost = (prices[options.printType] || 0) + (prices[options.layout] || 0);
        copyPrice = pages * pageCost;

        // First page color surcharge for B&W prints
        if (options.firstPageColor && options.printType === 'bw' && pages >= 1) {
            copyPrice += (prices.firstPageColor || 8);
        }

        // Spiral binding surcharge
        if (options.binding === 'spiral') {
            copyPrice += (prices.spiral || 30);
        }
    }

    // Rush order surcharge
    if (options.rush) {
        copyPrice += (prices.rush || 20);
    }

    return Math.max(0, copyPrice) * copies;
}

/**
 * Build a human-readable order details string from options.
 * Matches the original createOrderDetailsString exactly.
 */
function createOrderDetailsString(options) {
    const copies = parseInt(options.copies, 10) || 1;
    let details = '';

    if (options.service) {
        details = options.service === 'passport' ? 'Passport Photos' : '4x6 Print';
    } else {
        details = `${options.pages} pages, `;
        if (options.firstPageColor) {
            details += 'B&W (First Page Color), ';
        } else {
            details += `${options.printType.toUpperCase()}, `;
        }
        details += `${options.layout === 'singleSided' ? 'Single-Sided' : 'Double-Sided'}`;
        if (options.binding === 'spiral') details += ', Spiral Binding';
    }

    details += ` (${copies} ${copies > 1 ? 'copies' : 'copy'})`;
    if (options.rush) details += ', RUSH ORDER';

    return details;
}

/**
 * Factory function that returns all order controller methods.
 * Receives dependencies from server.js.
 */
module.exports = function (razorpay, isDummyMode, razorpayKeyId, razorpayKeySecret, broadcast) {

    /**
     * POST /api/orders
     * Create a new order: upload file, calculate price, initiate payment.
     */
    const createOrder = async (req, res) => {
        try {
            const options = JSON.parse(req.body.options || '{}');

            // Get current prices from database
            const priceDoc = await Price.getOrCreate();
            const prices = priceDoc.toObject();
            const finalAmount = calculatePrice(options, prices);

            if (finalAmount <= 0) {
                return res.status(400).json({ error: 'Invalid order amount.' });
            }

            // Store order context in session for verification step
            req.session.orderContext = {
                options,
                filePath: req.file ? req.file.path : null,
                fileName: req.file ? req.file.originalname : null,
                finalAmount
            };

            if (isDummyMode) {
                console.log('--- RUNNING IN DUMMY MODE ---');
                return res.json({
                    orderId: `dummy_ord_${Date.now()}`,
                    amount: finalAmount * 100,
                    keyId: 'dummy_key'
                });
            }

            console.log('--- RUNNING IN REAL PAYMENT MODE ---');
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(finalAmount * 100), // Convert to paise
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            });

            req.session.orderContext.razorpayOrderId = razorpayOrder.id;
            console.log('Razorpay order created:', razorpayOrder.id);

            res.json({
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                keyId: razorpayKeyId
            });
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({ error: 'Something went wrong while creating the order.' });
        }
    };

    /**
     * POST /api/orders/verify
     * Verify payment and finalize the order in MongoDB.
     */
    const verifyPayment = async (req, res) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

            if (!req.session.orderContext) {
                console.error('Error: Order context is missing from session.');
                return res.status(400).json({ status: 'failure', message: 'Session expired. Please try again.' });
            }

            const { options, filePath, fileName, finalAmount } = req.session.orderContext;
            let isPaymentVerified = false;

            if (isDummyMode && razorpay_order_id && razorpay_order_id.startsWith('dummy_ord_')) {
                console.log('--- Verifying DUMMY payment ---');
                isPaymentVerified = true;
            } else if (!isDummyMode) {
                console.log('--- Verifying REAL payment ---');
                const shasum = crypto.createHmac('sha256', razorpayKeySecret);
                shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
                const digest = shasum.digest('hex');

                if (digest === razorpay_signature) {
                    console.log('Payment verified successfully:', razorpay_payment_id);
                    isPaymentVerified = true;
                } else {
                    console.log('Payment verification failed: Signature mismatch.');
                }
            }

            if (isPaymentVerified) {
                // Generate token prefix based on order type (same as original)
                let prefix = 'ORD';
                if (options.service) prefix = 'P';
                else if (options.printType === 'color') prefix = 'C';
                else if (options.printType === 'bw') prefix = 'B';

                const orderCount = await Order.countDocuments();
                const tokenNumber = orderCount + 101;
                const finalToken = `${prefix}-${tokenNumber}`;

                // Save to MongoDB
                const order = new Order({
                    id: Date.now().toString(),
                    tokenId: finalToken,
                    timestamp: new Date(),
                    details: createOrderDetailsString(options),
                    phone: options.phone,
                    filePath: filePath,
                    fileName: fileName,
                    status: 'new',
                    price: finalAmount,
                    options: options
                });

                await order.save();
                console.log(`Order ${finalToken} saved to database with price: ${finalAmount}`);

                // Broadcast to admin via WebSocket
                broadcast({ type: 'new_order', payload: order.toObject() });
                console.log(`Broadcasted new order ${finalToken} to admins.`);

                // Clear session order context
                req.session.orderContext = null;

                res.json({ status: 'success', tokenId: finalToken });
            } else {
                res.status(400).json({ status: 'failure' });
            }
        } catch (error) {
            console.error('Verify payment error:', error);
            res.status(500).json({ status: 'failure', message: 'An internal error occurred.' });
        }
    };

    /**
     * GET /api/orders
     * Retrieve all orders, sorted by timestamp descending.
     */
    const getOrders = async (req, res) => {
        try {
            const orders = await Order.find().sort({ timestamp: -1 });
            res.json(orders);
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({ error: 'Could not fetch orders.' });
        }
    };

    /**
     * GET /api/orders/stats
     * Aggregate today's order statistics.
     * Response format matches what the frontend Dashboard expects.
     */
    const getStats = async (req, res) => {
        try {
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const todaysOrders = await Order.find({ timestamp: { $gte: todayStart } });

            const totalRevenue = todaysOrders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
            const totalOrders = todaysOrders.length;
            const pendingOrders = todaysOrders.filter(o => o.status === 'new' || o.status === 'processing').length;

            res.json({ totalRevenue, totalOrders, pendingOrders });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ error: 'Could not fetch stats.' });
        }
    };

    /**
     * GET /api/orders/chart-data
     * Revenue chart data — supports month-by-week, year-by-month, all-years.
     * Response format: { labels: [], data: [] } — matches frontend expectations.
     */
    const getChartData = async (req, res) => {
        try {
            const range = req.query.range || 'month-by-week';
            const allOrders = await Order.find();
            const now = new Date();
            let labels = [];
            let data = [];

            if (range === 'month-by-week') {
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = [0, 0, 0, 0];
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                allOrders.forEach(order => {
                    const orderDate = new Date(order.timestamp);
                    if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                        const dayOfMonth = orderDate.getDate();
                        if (dayOfMonth <= 7) data[0] += order.price;
                        else if (dayOfMonth <= 14) data[1] += order.price;
                        else if (dayOfMonth <= 21) data[2] += order.price;
                        else data[3] += order.price;
                    }
                });
            } else if (range === 'year-by-month') {
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                data = Array(12).fill(0);
                const currentYear = now.getFullYear();

                allOrders.forEach(order => {
                    const orderDate = new Date(order.timestamp);
                    if (orderDate.getFullYear() === currentYear) {
                        data[orderDate.getMonth()] += order.price;
                    }
                });
            } else if (range === 'all-years') {
                const yearlyData = {};
                allOrders.forEach(order => {
                    const year = new Date(order.timestamp).getFullYear().toString();
                    if (!yearlyData[year]) yearlyData[year] = 0;
                    yearlyData[year] += order.price;
                });
                const sortedYears = Object.keys(yearlyData).sort();
                labels = sortedYears;
                data = sortedYears.map(year => yearlyData[year]);
            }

            res.json({ labels, data });
        } catch (error) {
            console.error('Error fetching chart data:', error);
            res.status(500).json({ error: 'Could not fetch chart data.' });
        }
    };

    /**
     * PATCH /api/orders/:id/status
     * Update an order's status and broadcast the change via WebSocket.
     */
    const updateOrderStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['new', 'processing', 'ready'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const order = await Order.findByIdAndUpdate(
                id,
                { status },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Broadcast status change
            broadcast({ type: 'status_update', payload: order.toObject() });

            res.json(order);
        } catch (error) {
            console.error('Update order status error:', error);
            res.status(500).json({ error: 'Could not update order.' });
        }
    };

    return {
        createOrder,
        verifyPayment,
        getOrders,
        getStats,
        getChartData,
        updateOrderStatus
    };
};
