'use strict';

const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings - Book a ride
router.post('/', authMiddleware, (req, res) => {
  const { ride_id, seats_booked, payment_method } = req.body;

  if (!ride_id || !seats_booked) {
    return res.status(400).json({ error: 'ride_id and seats_booked are required' });
  }

  const ride = db.prepare("SELECT * FROM rides WHERE id = ? AND status = 'active'").get(ride_id);
  if (!ride) return res.status(404).json({ error: 'Ride not found or not available' });
  if (ride.driver_id === req.user.id) return res.status(400).json({ error: 'You cannot book your own ride' });

  const existing = db.prepare(
    "SELECT id FROM bookings WHERE ride_id = ? AND passenger_id = ? AND status != 'cancelled'"
  ).get(ride_id, req.user.id);
  if (existing) return res.status(409).json({ error: 'You have already booked this ride' });

  const bookedSeats = db.prepare(
    "SELECT COALESCE(SUM(seats_booked), 0) as total FROM bookings WHERE ride_id = ? AND status != 'cancelled'"
  ).get(ride_id);

  const remainingSeats = ride.available_seats - bookedSeats.total;
  if (seats_booked > remainingSeats) {
    return res.status(400).json({ error: `Only ${remainingSeats} seat(s) available` });
  }

  const validPayments = ['cash', 'ecocash', 'onemoney', 'zimswitch', 'bank_transfer'];
  const method = validPayments.includes(payment_method) ? payment_method : 'cash';

  const result = db.prepare(
    'INSERT INTO bookings (ride_id, passenger_id, seats_booked, payment_method) VALUES (?, ?, ?, ?)'
  ).run(ride_id, req.user.id, seats_booked, method);

  const booking = db.prepare(`
    SELECT b.*, r.from_city, r.to_city, r.departure_date, r.departure_time, r.price_per_seat,
           u.name as driver_name
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON r.driver_id = u.id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(booking);
});

// GET /api/bookings/my - Get current user's bookings
router.get('/my', authMiddleware, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, r.from_city, r.to_city, r.departure_date, r.departure_time,
           r.price_per_seat, u.name as driver_name, u.phone as driver_phone
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON r.driver_id = u.id
    WHERE b.passenger_id = ?
    ORDER BY r.departure_date DESC
  `).all(req.user.id);
  res.json(bookings);
});

// GET /api/bookings/ride/:rideId - Get bookings for a ride (driver only)
router.get('/ride/:rideId', authMiddleware, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.rideId);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  const bookings = db.prepare(`
    SELECT b.*, u.name as passenger_name, u.phone as passenger_phone, u.rating as passenger_rating
    FROM bookings b
    JOIN users u ON b.passenger_id = u.id
    WHERE b.ride_id = ?
    ORDER BY b.created_at ASC
  `).all(req.params.rideId);
  res.json(bookings);
});

// PUT /api/bookings/:id/status - Update booking status
router.put('/:id/status', authMiddleware, (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON b.ride_id = r.id WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Driver can confirm/cancel; passenger can cancel their own
  const isDriver = booking.driver_id === req.user.id;
  const isPassenger = booking.passenger_id === req.user.id;

  if (!isDriver && !isPassenger) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (isPassenger && status !== 'cancelled') {
    return res.status(403).json({ error: 'Passengers can only cancel bookings' });
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
