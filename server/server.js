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

// ─── Root route — shows API status (visitors should use the frontend URL) ────
app.get('/', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SRMAP Stationery Hub — API Server</title>
            <style>
                body { font-family: -apple-system, sans-serif; background: #0c0a18; color: #f3f4f6;
                       display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                .card { background: #1f2937; border: 1px solid #374151; border-radius: 12px;
                        padding: 2.5rem; max-width: 420px; text-align: center; }
                h1 { color: #818cf8; font-size: 1.4rem; margin: 0 0 0.5rem; }
                p { color: #9ca3af; font-size: 0.9rem; margin: 0.5rem 0; }
                .badge { display: inline-block; background: #052e16; color: #4ade80;
                         border: 1px solid #166534; border-radius: 999px; padding: 0.25rem 0.85rem;
                         font-size: 0.8rem; font-weight: 600; margin: 1rem 0; }
                a { display: inline-block; margin-top: 1.5rem; padding: 0.7rem 1.5rem;
                    background: #4f46e5; color: white; border-radius: 8px; text-decoration: none;
                    font-weight: 600; font-size: 0.9rem; }
                a:hover { background: #4338ca; }
                .divider { border: none; border-top: 1px solid #374151; margin: 1.5rem 0; }
                .api-list { text-align: left; font-size: 0.78rem; color: #6b7280; }
                .api-list code { color: #a5b4fc; }
            </style>
        </head>
        <body>
            <div class="card">
                <div style="font-size:2rem;margin-bottom:0.5rem">🖨️</div>
                <h1>SRMAP Stationery Hub</h1>
                <p>Backend API Server</p>
                <div class="badge">✅ Server is running</div>
                <p>This is the API backend. The student-facing app is on the link below.</p>
                <a href="${frontendUrl}" target="_blank">Open Stationery Hub →</a>
                <hr class="divider">
                <div class="api-list">
                    <p><code>GET /api/health</code> — Server health check</p>
                    <p><code>POST /api/auth/login</code> — Admin login</p>
                    <p><code>GET /api/orders</code> — All orders</p>
                    <p><code>GET /api/prices</code> — Print prices</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Health check (JSON — for uptime monitors)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'SRMAP Stationery Hub API',
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
