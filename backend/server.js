/**
 * MusicNest Backend Server
 * Production-grade Express + Socket.io server
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Config
const connectDB = require('./config/db');
const { connectCloudinary } = require('./config/cloudinary');

// Routes
const authRoutes = require('./routes/authRoutes');
const songRoutes = require('./routes/songRoutes');
const albumRoutes = require('./routes/albumRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const userRoutes = require('./routes/userRoutes');
const searchRoutes = require('./routes/searchRoutes');
const adminRoutes = require('./routes/adminRoutes');
const musicBrainzRoutes = require('./routes/musicBrainzRoutes');
const jamendoRoutes = require('./routes/jamendoRoutes');
const spotifyRoutes = require('./routes/spotifyRoutes');

// Middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Socket
const { initSocket } = require('./socket/socketServer');

// ── App Setup ──────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

// ── Database & Services ───────────────────────────────────────────────────

connectDB();
connectCloudinary();
initSocket(io);

// ── Global Middleware ─────────────────────────────────────────────────────

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting — global limit per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // generous for dev; tighten in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
});
app.use('/api', globalLimiter);

// Higher limit for Jamendo proxy — just passes through to external API
const jamendoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 Jamendo proxy calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/jamendo', jamendoLimiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Make io accessible in routes/controllers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ── API Routes ────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/musicbrainz', musicBrainzRoutes);
app.use('/api/jamendo', jamendoRoutes);
app.use('/api/spotify', spotifyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎵 MusicNest API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── Error Handling ────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🎵 MusicNest Server Started         ║
  ║   Port:  ${PORT}                          ║
  ║   Mode:  ${process.env.NODE_ENV || 'development'}                 ║
  ║   URL:   http://localhost:${PORT}         ║
  ╚═══════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
