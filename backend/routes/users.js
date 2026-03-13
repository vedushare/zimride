'use strict';

const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id - Get user profile
router.get('/:id', (req, res) => {
  const user = db.prepare(
    'SELECT id, name, email, phone, bio, avatar, rating, total_ratings, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const ridesAsDriver = db.prepare(
    "SELECT COUNT(*) as count FROM rides WHERE driver_id = ? AND status = 'active'"
  ).get(req.params.id);

  user.rides_as_driver = ridesAsDriver.count;

  const reviews = db.prepare(`
    SELECT rv.*, u.name as reviewer_name
    FROM reviews rv
    JOIN users u ON rv.reviewer_id = u.id
    WHERE rv.reviewed_id = ?
    ORDER BY rv.created_at DESC
    LIMIT 5
  `).all(req.params.id);

  user.recent_reviews = reviews;
  res.json(user);
});

// PUT /api/users/me - Update own profile
router.put('/me', authMiddleware, (req, res) => {
  const name = req.body.name !== undefined ? req.body.name : null;
  const phone = req.body.phone !== undefined ? req.body.phone : null;
  const bio = req.body.bio !== undefined ? req.body.bio : null;

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      bio = COALESCE(?, bio)
    WHERE id = ?
  `).run(name, phone, bio, req.user.id);

  const updated = db.prepare(
    'SELECT id, name, email, phone, bio, avatar, rating, total_ratings, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(updated);
});

// GET /api/users/me/rides - Get current user's offered rides
router.get('/me/rides', authMiddleware, (req, res) => {
  const rides = db.prepare(`
    SELECT r.*,
      (SELECT COALESCE(SUM(seats_booked), 0) FROM bookings WHERE ride_id = r.id AND status != 'cancelled') as booked_seats
    FROM rides r
    WHERE r.driver_id = ?
    ORDER BY r.departure_date DESC
  `).all(req.user.id);
  res.json(rides);
});

// POST /api/users/:id/review - Leave a review
router.post('/:id/review', authMiddleware, (req, res) => {
  const { ride_id, rating, comment } = req.body;
  const reviewed_id = parseInt(req.params.id, 10);

  if (reviewed_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot review yourself' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const existingReview = db.prepare(
    'SELECT id FROM reviews WHERE reviewer_id = ? AND reviewed_id = ? AND ride_id = ?'
  ).get(req.user.id, reviewed_id, ride_id);
  if (existingReview) {
    return res.status(409).json({ error: 'You have already reviewed this user for this ride' });
  }

  db.prepare(
    'INSERT INTO reviews (reviewer_id, reviewed_id, ride_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, reviewed_id, ride_id, rating, comment || null);

  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE reviewed_id = ?').get(reviewed_id);
  db.prepare('UPDATE users SET rating = ?, total_ratings = ? WHERE id = ?').run(
    Math.round(stats.avg * 10) / 10,
    stats.cnt,
    reviewed_id
  );

  res.status(201).json({ message: 'Review submitted successfully' });
});

module.exports = router;
