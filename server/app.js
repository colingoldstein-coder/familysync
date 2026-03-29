require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pino = require('pino-http');
const logger = require('./logger');
const db = require('./db');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const requestRoutes = require('./routes/requests');

const app = express();
app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production';

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Request logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(pino({ logger }));
}

// CORS
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Rate limiting (skip in test)
if (process.env.NODE_ENV !== 'test') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register-family', authLimiter);
  app.use('/api', apiLimiter);
}

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// TEMPORARY: database reset endpoint — remove after use
app.post('/api/reset-db-temp', async (req, res) => {
  try {
    await db('help_requests').del();
    await db('tasks').del();
    await db('invitations').del();
    await db('users').del();
    await db('families').del();
    res.json({ message: 'Database cleared' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/requests', requestRoutes);

// Serve static frontend when built files exist
const staticDir = path.join(__dirname, 'public');
const fallbackDir = path.join(__dirname, '../client/dist');
const fs = require('fs');
const distDir = fs.existsSync(staticDir) ? staticDir : fs.existsSync(fallbackDir) ? fallbackDir : null;
if (distDir) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, _next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
