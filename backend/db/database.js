'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'zimride.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      phone_verified INTEGER DEFAULT 0,
      bio TEXT,
      avatar TEXT,
      rating REAL DEFAULT 0,
      total_ratings INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      available_seats INTEGER NOT NULL,
      price_per_seat REAL NOT NULL,
      description TEXT,
      amenities TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      seats_booked INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT 'pending',
      payment_method TEXT DEFAULT 'cash',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (passenger_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      reviewed_id INTEGER NOT NULL,
      ride_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_id) REFERENCES users(id),
      FOREIGN KEY (ride_id) REFERENCES rides(id)
    );

    CREATE TABLE IF NOT EXISTS otp_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate existing users table to add phone_verified if it doesn't exist yet
  const cols = db.prepare('PRAGMA table_info(users)').all();
  if (!cols.find(c => c.name === 'phone_verified')) {
    db.exec('ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0');
  }
}

initDatabase();

module.exports = db;
