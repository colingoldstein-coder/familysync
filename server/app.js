const dotenvPath = require('path').join(__dirname, '.env');
if (require('fs').existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pino = require('pino-http');
const logger = require('./logger');
const db = require('./db');

// Validate critical secrets on startup
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'change-me-to-a-long-random-string') {
    console.error('FATAL: JWT_SECRET must not be the default placeholder value');
    process.exit(1);
  }
}

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const requestRoutes = require('./routes/requests');
const contactRoutes = require('./routes/contact');
const eventRoutes = require('./routes/events');
const calendarRoutes = require('./routes/calendar');
const adminRoutes = require('./routes/admin');
const pushRoutes = require('./routes/push');
const webauthnRoutes = require('./routes/webauthn');
const siteRoutes = require('./routes/site');

const app = express();
app.set('trust proxy', 1);

// HTTPS redirect in production (skip health check for internal probes)
if (isProduction) {
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://accounts.google.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://oauth2.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ['https://accounts.google.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// Permissions-Policy: restrict access to sensitive browser APIs
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

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

app.use(cookieParser());

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

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many messages, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const tokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register-family', authLimiter);
  app.use('/api/auth/accept-invite', authLimiter);
  app.use('/api/auth/google-login', authLimiter);
  app.use('/api/auth/google-register-family', authLimiter);
  app.use('/api/auth/google-accept-invite', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
  app.use('/api/webauthn/login-options', authLimiter);
  app.use('/api/webauthn/login', authLimiter);
  app.use('/api/webauthn/register-options', tokenLimiter);
  app.use('/api/webauthn/register', tokenLimiter);
  app.use('/api/auth/invite', tokenLimiter);
  app.use('/api/calendar/feed', tokenLimiter);
  app.use('/api/contact', contactLimiter);
  app.use('/api', apiLimiter);
}

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/webauthn', webauthnRoutes);
app.use('/api', siteRoutes);

// Serve uploaded images publicly (for email content and site images)
const uploadsStatic = express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'");
  },
});
app.use('/api/uploads', uploadsStatic);
app.use('/api/admin/uploads', uploadsStatic);

// Serve static frontend when built files exist
const staticDir = path.join(__dirname, 'public');
const fallbackDir = path.join(__dirname, '../client/dist');
const fs = require('fs');
const distDir = fs.existsSync(staticDir) ? staticDir : fs.existsSync(fallbackDir) ? fallbackDir : null;
if (distDir) {
  // Service worker and manifest must not be cached by the browser
  app.get('/sw.js', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/');
    next();
  });
  app.get('/manifest.webmanifest', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });

  // PWA icons: short cache so updated icons propagate quickly
  app.get(/\/(pwa-|maskable-|apple-touch-icon|favicon).*\.(png|ico|svg)$/, (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
  });

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
