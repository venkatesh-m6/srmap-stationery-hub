/**
 * SRMAP Stationery Hub — Main Server Entry Point
 *
 * Express.js + MongoDB + Razorpay + WebSocket
 */
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const connectDB = require('./config/db');
const Price = require('./models/Price');

// ─── Initialize Express ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

// CORS: allow localhost in dev, Vercel frontend URL in production
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL, // e.g. https://srmap-stationery.vercel.app
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps) or matching origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,   // true on Render (HTTPS), false on localhost
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Razorpay Setup ─────────────────────────────────────────────────
// FIX: Always create the Razorpay instance with env keys.
// The original bug was checking `if (KEY !== 'test_key')` which prevented
// instance creation when actual test keys like 'rzp_test_...' were provided.
let razorpay = null;
let isDummyMode = false;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

try {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    });
    console.log(`✅ Razorpay initialized with key: ${RAZORPAY_KEY_ID}`);
} catch (error) {
    console.warn('⚠️  Razorpay initialization failed, using dummy mode:', error.message);
    isDummyMode = true;
}

// ─── WebSocket Setup ────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
    });
});

/**
 * Broadcast a message to all connected WebSocket clients.
 */
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
}

// ─── Routes ─────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/prices');
const pageCountRoutes = require('./routes/pageCount');

// Create order controller with injected dependencies
const createOrderController = require('./controllers/orderController');
const orderController = createOrderController(razorpay, isDummyMode, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, broadcast);
const createOrderRoutes = require('./routes/orders');

app.use('/api/auth', authRoutes);
app.use('/api/orders', createOrderRoutes(orderController));
app.use('/api/prices', priceRoutes);
app.use('/api/count-pages', pageCountRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        razorpay: isDummyMode ? 'dummy' : 'live',
        timestamp: new Date().toISOString()
    });
});

// ─── Start Server ───────────────────────────────────────────────────
async function start() {
    // Connect to MongoDB (non-fatal — server will start regardless)
    try {
        await connectDB();
        // Seed default prices only after successful DB connection
        await Price.getOrCreate();
        console.log('✅ Prices seeded / verified');
    } catch (error) {
        console.error(`⚠️  MongoDB unavailable: ${error.message}`);
        console.warn('   Server starting anyway — DB-dependent routes will fail until MongoDB is reachable.');
    }

    // Always start the HTTP server
    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════╗
║   SRMAP Stationery Hub Server               ║
║   Port: ${PORT}                                ║
║   Mode: ${isDummyMode ? 'DUMMY' : 'LIVE '}                              ║
║   WebSocket: ws://localhost:${PORT}             ║
╚══════════════════════════════════════════════╝
        `);
    });
}

start();
