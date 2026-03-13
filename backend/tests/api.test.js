'use strict';

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Use a test database
process.env.DB_PATH = path.join('/tmp', 'zimride-test.db');
process.env.JWT_SECRET = 'test_secret';

// Clean up test db before each test file
if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH);
}

const app = require('../server');

let token1, token2, userId1, userId2;
let rideId, bookingId;

describe('ZimRide API', () => {
  describe('Health Check', () => {
    test('GET /api/health returns ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('ZimRide API');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/register - creates a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Tinashe Moyo', email: 'tinashe@example.com', password: 'password123', phone: '+263771234567' });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Tinashe Moyo');
      token1 = res.body.token;
      userId1 = res.body.user.id;
    });

    test('POST /api/auth/register - second user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Chiedza Mutasa', email: 'chiedza@example.com', password: 'password456', phone: '+263773456789' });
      expect(res.status).toBe(201);
      token2 = res.body.token;
      userId2 = res.body.user.id;
    });

    test('POST /api/auth/register - duplicate email fails', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Duplicate', email: 'tinashe@example.com', password: 'password123' });
      expect(res.status).toBe(409);
    });

    test('POST /api/auth/register - missing fields fails', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'no@name.com' });
      expect(res.status).toBe(400);
    });

    test('POST /api/auth/login - returns token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'tinashe@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/login - wrong password fails', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'tinashe@example.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });
  });

  describe('Rides', () => {
    test('POST /api/rides - creates a ride', async () => {
      const res = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          from_city: 'Harare',
          to_city: 'Bulawayo',
          departure_date: '2026-04-01',
          departure_time: '06:00',
          available_seats: 3,
          price_per_seat: 15,
          description: 'Comfortable trip',
          amenities: ['music', 'aircon']
        });
      expect(res.status).toBe(201);
      expect(res.body.from_city).toBe('Harare');
      expect(res.body.to_city).toBe('Bulawayo');
      rideId = res.body.id;
    });

    test('POST /api/rides - requires auth', async () => {
      const res = await request(app).post('/api/rides').send({ from_city: 'Harare' });
      expect(res.status).toBe(401);
    });

    test('POST /api/rides - same city fails', async () => {
      const res = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${token1}`)
        .send({ from_city: 'Harare', to_city: 'Harare', departure_date: '2026-04-01', departure_time: '06:00', available_seats: 2, price_per_seat: 10 });
      expect(res.status).toBe(400);
    });

    test('GET /api/rides - lists rides', async () => {
      const res = await request(app).get('/api/rides');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/rides?from=Harare - filters by from city', async () => {
      const res = await request(app).get('/api/rides?from=Harare');
      expect(res.status).toBe(200);
      expect(res.body.every(r => r.from_city.toLowerCase().includes('harare'))).toBe(true);
    });

    test('GET /api/rides/:id - returns ride details', async () => {
      const res = await request(app).get(`/api/rides/${rideId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(rideId);
      expect(res.body.driver_name).toBe('Tinashe Moyo');
    });

    test('GET /api/rides/:id - 404 for missing ride', async () => {
      const res = await request(app).get('/api/rides/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('Bookings', () => {
    test('POST /api/bookings - books a ride', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token2}`)
        .send({ ride_id: rideId, seats_booked: 2, payment_method: 'ecocash' });
      expect(res.status).toBe(201);
      expect(res.body.from_city).toBe('Harare');
      bookingId = res.body.id;
    });

    test('POST /api/bookings - driver cannot book own ride', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token1}`)
        .send({ ride_id: rideId, seats_booked: 1 });
      expect(res.status).toBe(400);
    });

    test('POST /api/bookings - cannot double book', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token2}`)
        .send({ ride_id: rideId, seats_booked: 1 });
      expect(res.status).toBe(409);
    });

    test('GET /api/bookings/my - returns passenger bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/my')
        .set('Authorization', `Bearer ${token2}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('PUT /api/bookings/:id/status - passenger can cancel', async () => {
      const res = await request(app)
        .put(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ status: 'cancelled' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });
  });

  describe('Users', () => {
    test('GET /api/users/:id - returns user profile', async () => {
      const res = await request(app).get(`/api/users/${userId1}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Tinashe Moyo');
      expect(res.body.password).toBeUndefined();
    });

    test('GET /api/users/:id - 404 for missing user', async () => {
      const res = await request(app).get('/api/users/99999');
      expect(res.status).toBe(404);
    });

    test('PUT /api/users/me - updates profile', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({ bio: 'Friendly driver from Harare' });
      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('Friendly driver from Harare');
    });

    test('GET /api/users/me/rides - returns driver rides', async () => {
      const res = await request(app)
        .get('/api/users/me/rides')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
