// --- IMPORTS ---
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const Razorpay = require('razorpay');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');

// Simple JSON Database (LowDB)
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

// Initialize database
db.defaults({ 
    orders: [],
    prices: {
        bw: 2, color: 10, firstPageColor: 8,
        singleSided: 0, doubleSided: -0.5,
        spiral: 30, photo_4x6: 15, passport: 50, rush: 20
    }
}).write();

// --- CONFIGURATION ---
const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


const RAZORPAY_KEY_ID = 'rzp_test_RhfXQ1B5kKWNSt'; 
const RAZORPAY_KEY_SECRET = 'lrynvwb3Xaq4BRxsa53BoYaX';


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: 'srmap_stationery_secret_key', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// --- FILE UPLOAD SETUP ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir;
        if (req.path.startsWith('/api/count-pages')) {
            dir = 'uploads/temp/'; 
        } else {
            dir = 'uploads/orders/'; 
        }
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
        cb(null, uniqueSuffix + '-' + safeOriginalName);
    }
});
const upload = multer({ storage: storage });

// --- RAZORPAY INSTANCE ---
let razorpay;
let isDummyMode = true;
if (RAZORPAY_KEY_ID !== 'rzp_test_RhfXQ1B5kKWNSt' && RAZORPAY_KEY_SECRET !== 'lrynvwb3Xaq4BRxsa53BoYaX') {
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    });
    isDummyMode = false;
}

// --- PRICE CALCULATION LOGIC ---
function calculatePrice(options, prices) {
    let copyPrice = 0;
    const copies = parseInt(options.copies, 10) || 1;

    if (options.service) { // Image
        copyPrice = prices[options.service] || 0;
    } else { // Document
        const pages = parseInt(options.pages, 10) || 1;
        let pageCost = (prices[options.printType] || 0) + (prices[options.layout] || 0);
        copyPrice = pages * pageCost;
        if (options.firstPageColor && options.printType === 'bw' && pages >= 1) {
            copyPrice += (prices.firstPageColor || 8);
        }
        if (options.binding === 'spiral') copyPrice += (prices.spiral || 30);
    }
    if (options.rush) copyPrice += (prices.rush || 20);
    
    return Math.max(0, copyPrice) * copies; // Total price
}

// --- WebSocket Logic ---
wss.on('connection', ws => {
    console.log('Admin client connected to WebSocket.');
    ws.on('close', () => console.log('Admin client disconnected.'));
});

function broadcast(type, payload) {
    const message = JSON.stringify({ type, payload });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// --- AUTHENTICATION ---
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'password123';

function checkAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

app.get('/admin', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API ENDPOINTS ---

// GET Prices (for frontend and admin)
app.get('/api/prices', (req, res) => {
    const prices = db.get('prices').value();
    res.json(prices);
});

// POST Prices (for admin)
app.post('/api/prices', checkAuth, (req, res) => {
    try {
        db.set('prices', req.body).write();
        res.json({ success: true, prices: req.body });
    } catch (error) {
        console.error("Error saving prices:", error);
        res.status(500).json({ success: false, error: 'Failed to save prices.' });
    }
});

// Python Page Counter
app.post('/api/count-pages', upload.single('file'), (req, res) => {
    console.log("Attempting to count pages for:", req.file.path);
    const pythonProcess = spawn('python3', ['page_counter.py', req.file.path]);
    
    pythonProcess.stdout.on('data', (data) => {
        const pageCount = parseInt(data.toString(), 10);
        console.log("Page count success:", pageCount);
        fs.unlink(req.file.path, (err) => {
             if (err) console.error("Error deleting temp page count file:", err);
        });
        res.json({ pageCount: pageCount });
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr from page_counter.py: ${data}`);
        fs.unlink(req.file.path, (err) => {
             if (err) console.error("Error deleting temp page count file:", err);
        });
        res.status(500).json({ error: 'Failed to count pages.' });
    });
});

// Create Order
app.post('/create-order', upload.single('file'), async (req, res) => {
    try {
        const orderOptions = JSON.parse(req.body.options);
        const prices = db.get('prices').value(); 
        const finalAmount = calculatePrice(orderOptions, prices);

        if (finalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid order amount.' });
        }
        
        req.session.orderContext = {
            options: orderOptions,
            filePath: req.file.path, 
            fileName: req.file.originalname,
            finalAmount: finalAmount 
        };
        console.log("Order context saved to session:", req.session.orderContext.fileName);

        if (isDummyMode) {
            console.log("--- RUNNING IN DUMMY MODE ---");
            res.json({
                orderId: `dummy_ord_${Date.now()}`,
                amount: finalAmount * 100,
                keyId: 'dummy_key'
            });
            return;
        }

        console.log("--- RUNNING IN REAL PAYMENT MODE ---");
        const razorpayOrderOptions = {
            amount: finalAmount * 100, 
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(razorpayOrderOptions);
        console.log("Razorpay order created:", order.id);
        res.json({ orderId: order.id, amount: order.amount, keyId: RAZORPAY_KEY_ID });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Something went wrong while creating the order.' });
    }
});

// Helper function
function createOrderDetailsString(options) {
    const copies = parseInt(options.copies, 10) || 1;
    let details = "";
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

// Verify Payment
app.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        if (!req.session.orderContext) {
            console.error("Error: Order context is missing from session.");
            return res.status(400).json({ status: 'failure', message: 'Session expired. Please try again.' });
        }

        const { options, filePath, fileName, finalAmount } = req.session.orderContext;
        let isPaymentVerified = false;

        if (isDummyMode && razorpay_order_id.startsWith('dummy_ord_')) {
            console.log("--- Verifying DUMMY payment ---");
            isPaymentVerified = true;
        } else if (!isDummyMode) {
            console.log("--- Verifying REAL payment ---");
            const shasum = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
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
            let prefix = 'ORD';
            if (options.service) prefix = 'P';
            else if (options.printType === 'color') prefix = 'C';
            else if (options.printType === 'bw') prefix = 'B';
            
            const tokenNumber = db.get('orders').size().value() + 101;
            const finalToken = `${prefix}-${tokenNumber}`;

            const finalOrder = {
                id: Date.now().toString(),
                tokenId: finalToken,
                timestamp: new Date().toISOString(),
                details: createOrderDetailsString(options),
                phone: options.phone,
                filePath: filePath, 
                fileName: fileName,
                status: 'new',
                price: finalAmount 
            };

            db.get('orders').push(finalOrder).write();
            console.log(`Order ${finalToken} saved to database with price: ${finalAmount}`);
            
            broadcast('new_order', finalOrder);
            console.log(`Broadcasted new order ${finalToken} to admins.`);
            
            req.session.orderContext = null;
            res.json({ status: 'success', tokenId: finalToken });

        } else {
            fs.unlink(filePath, (err) => {
                if (err) console.error("Error deleting file after failed payment:", err);
            });
            res.status(400).json({ status: 'failure' });
        }
    } catch(error) {
        console.error("Error in /verify-payment:", error);
        res.status(500).json({ status: 'failure', message: 'An internal error occurred.'});
    }
});


// --- ADMIN API ENDPOINTS (PROTECTED) ---
app.get('/api/orders', checkAuth, (req, res) => {
    try {
        const orders = db.get('orders').orderBy('timestamp', 'desc').value();
        res.json(orders);
    } catch(error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: 'Could not fetch orders.' });
    }
});

// Get Daily Stats
app.get('/api/stats', checkAuth, (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        
        const todaysOrders = db.get('orders').filter(o => o.timestamp >= todayStart).value();
        
        const totalRevenue = todaysOrders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
        const totalOrders = todaysOrders.length;
        const pendingOrders = todaysOrders.filter(o => o.status === 'new' || o.status === 'processing').length;

        res.json({ totalRevenue, totalOrders, pendingOrders });

    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ error: 'Could not fetch stats.' });
    }
});

// **Chart Data API **
app.get('/api/chart-data', checkAuth, (req, res) => {
    try {
        const range = req.query.range || 'month-by-week'; 
        const allOrders = db.get('orders').value();
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
                    const monthIndex = orderDate.getMonth(); 
                    data[monthIndex] += order.price;
                }
            });

        } else if (range === 'all-years') {
            
            const yearlyData = {}; 
            allOrders.forEach(order => {
                const year = new Date(order.timestamp).getFullYear().toString();
                if (!yearlyData[year]) yearlyData[year] = 0;
                yearlyData[year] += order.price;
            });
            // Sort by year
            const sortedYears = Object.keys(yearlyData).sort();
            labels = sortedYears;
            data = sortedYears.map(year => yearlyData[year]);
        }
        
        res.json({ labels, data });

    } catch (error) {
        console.error(`Error fetching chart data: ${error}`);
        res.status(500).json({ error: 'Could not fetch chart data.' });
    }
});


app.patch('/api/orders/:id/status', checkAuth, (req, res) => {
    try {
        const order = db.get('orders').find({ id: req.params.id }).assign({ status: req.body.status }).write();
        broadcast('status_update', order); 
        res.json(order);
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ error: 'Could not update order.' });
    }
});

// --- START SERVER ---
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Admin Panel is available at http://localhost:${PORT}/admin`);
});
