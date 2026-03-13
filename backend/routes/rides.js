'use strict';

const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/rides - Search rides
router.get('/', (req, res) => {
  const { from, to, date, seats } = req.query;
  let query = `
    SELECT r.*, u.name as driver_name, u.rating as driver_rating, u.total_ratings as driver_total_ratings, u.avatar as driver_avatar
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    WHERE r.status = 'active'
  `;
  const params = [];

  if (from) {
    query += ' AND LOWER(r.from_city) LIKE LOWER(?)';
    params.push(`%${from}%`);
  }
  if (to) {
    query += ' AND LOWER(r.to_city) LIKE LOWER(?)';
    params.push(`%${to}%`);
  }
  if (date) {
    query += ' AND r.departure_date = ?';
    params.push(date);
  }
  if (seats) {
    query += ' AND r.available_seats >= ?';
    params.push(parseInt(seats, 10));
  }

  query += ' ORDER BY r.departure_date ASC, r.departure_time ASC';

  const rides = db.prepare(query).all(...params);
  res.json(rides);
});

// GET /api/rides/:id - Get single ride
router.get('/:id', (req, res) => {
  const ride = db.prepare(`
    SELECT r.*, u.name as driver_name, u.rating as driver_rating, u.total_ratings as driver_total_ratings,
           u.avatar as driver_avatar, u.phone as driver_phone, u.bio as driver_bio
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  const bookedSeats = db.prepare(
    "SELECT COALESCE(SUM(seats_booked), 0) as total FROM bookings WHERE ride_id = ? AND status != 'cancelled'"
  ).get(req.params.id);

  ride.booked_seats = bookedSeats.total;
  res.json(ride);
});

// POST /api/rides - Create a ride
router.post('/', authMiddleware, (req, res) => {
  const { from_city, to_city, departure_date, departure_time, available_seats, price_per_seat, description, amenities } = req.body;

  if (!from_city || !to_city || !departure_date || !departure_time || !available_seats || price_per_seat === undefined) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }
  if (from_city === to_city) {
    return res.status(400).json({ error: 'Departure and destination cities must be different' });
  }
  if (available_seats < 1 || available_seats > 8) {
    return res.status(400).json({ error: 'Available seats must be between 1 and 8' });
  }
  if (price_per_seat < 0) {
    return res.status(400).json({ error: 'Price cannot be negative' });
  }

  const amenitiesStr = Array.isArray(amenities) ? amenities.join(',') : (amenities || '');

  const result = db.prepare(
    'INSERT INTO rides (driver_id, from_city, to_city, departure_date, departure_time, available_seats, price_per_seat, description, amenities) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, from_city, to_city, departure_date, departure_time, available_seats, price_per_seat, description || null, amenitiesStr);

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(ride);
});

// PUT /api/rides/:id - Update a ride
router.put('/:id', authMiddleware, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  const from_city = req.body.from_city !== undefined ? req.body.from_city : null;
  const to_city = req.body.to_city !== undefined ? req.body.to_city : null;
  const departure_date = req.body.departure_date !== undefined ? req.body.departure_date : null;
  const departure_time = req.body.departure_time !== undefined ? req.body.departure_time : null;
  const available_seats = req.body.available_seats !== undefined ? req.body.available_seats : null;
  const price_per_seat = req.body.price_per_seat !== undefined ? req.body.price_per_seat : null;
  const description = req.body.description !== undefined ? req.body.description : null;
  const status = req.body.status !== undefined ? req.body.status : null;

  db.prepare(`
    UPDATE rides SET
      from_city = COALESCE(?, from_city),
      to_city = COALESCE(?, to_city),
      departure_date = COALESCE(?, departure_date),
      departure_time = COALESCE(?, departure_time),
      available_seats = COALESCE(?, available_seats),
      price_per_seat = COALESCE(?, price_per_seat),
      description = COALESCE(?, description),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(from_city, to_city, departure_date, departure_time, available_seats, price_per_seat, description, status, req.params.id);

  const updated = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/rides/:id - Cancel a ride
router.delete('/:id', authMiddleware, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Ride cancelled successfully' });
});

module.exports = router;
