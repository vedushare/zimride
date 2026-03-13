'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const ridesRoutes = require('./routes/rides');
const bookingsRoutes = require('./routes/bookings');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Strict rate limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ZimRide API', version: '1.0.0' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ZimRide API running on port ${PORT}`);
  });
}

module.exports = app;
