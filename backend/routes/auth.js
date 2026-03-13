'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const db = require('../db/database');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');
const { sendSms } = require('../services/sms');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP */
function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/** Normalise phone to E.164; accepts local ZW format e.g. 077... → +263 77... */
function normalisePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + digits;
  // Local Zimbabwe numbers: 07x or 08x → +2637x / +2638x
  if (digits.startsWith('0') && digits.length === 10) return '+263' + digits.slice(1);
  // Already has country code without +
  if (digits.startsWith('263') && digits.length === 12) return '+' + digits;
  return raw; // return as-is if format is unclear
}

/** Invalidate all previous unused OTPs for a phone number */
function invalidatePreviousOtps(phone) {
  db.prepare("UPDATE otp_tokens SET used = 1 WHERE phone = ? AND used = 0").run(phone);
}

/** Store a new OTP (5-minute expiry) */
function storeOtp(phone, code) {
  invalidatePreviousOtps(phone);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO otp_tokens (phone, otp_code, expires_at) VALUES (?, ?, ?)'
  ).run(phone, code, expiresAt);
}

/**
 * Validate an OTP.
 * Returns { valid: true } or { valid: false, error: string }
 */
function validateOtp(phone, code) {
  const record = db.prepare(
    "SELECT * FROM otp_tokens WHERE phone = ? AND used = 0 ORDER BY id DESC LIMIT 1"
  ).get(phone);

  if (!record) return { valid: false, error: 'No OTP found. Please request a new code.' };
  if (record.used) return { valid: false, error: 'OTP has already been used.' };
  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }
  if (record.attempts >= 3) {
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  if (record.otp_code !== String(code)) {
    db.prepare('UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ?').run(record.id);
    const remaining = 3 - (record.attempts + 1);
    return { valid: false, error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  // Mark as used
  db.prepare('UPDATE otp_tokens SET used = 1 WHERE id = ?').run(record.id);
  return { valid: true };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const normalisedPhone = normalisePhone(phone);

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)'
  ).run(name, email, hash, normalisedPhone || null);

  const token = jwt.sign({ id: result.lastInsertRowid, email, name }, JWT_SECRET, { expiresIn: '7d' });

  const response = {
    token,
    user: { id: result.lastInsertRowid, name, email, phone: normalisedPhone || null, phone_verified: false },
  };

  // If phone provided, auto-send a verification OTP
  if (normalisedPhone) {
    try {
      const otp = generateOtp();
      storeOtp(normalisedPhone, otp);
      const smsResult = await sendSms(
        normalisedPhone,
        `Your ZimRide verification code is ${otp}. It expires in 5 minutes.`
      );
      response.phoneVerification = true;
      // In non-production environments, expose devOtp so clients/tests can use it
      if (smsResult.devOtp) response.devOtp = smsResult.devOtp;
    } catch {
      // SMS failure is non-fatal at registration time
      response.phoneVerification = false;
    }
  }

  res.status(201).json(response);
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, phone_verified: !!user.phone_verified } });
});

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Send an OTP to a phone number (for phone-based login or re-sending verification)
router.post('/send-otp', async (req, res) => {
  const rawPhone = req.body.phone;
  if (!rawPhone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const phone = normalisePhone(rawPhone);
  if (!phone) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  // Check a user account exists for this phone (for phone login)
  // We send OTP regardless, to avoid phone enumeration, but we include
  // a hint in the response only when used for verification (not login)
  const otp = generateOtp();
  storeOtp(phone, otp);

  let smsResult;
  try {
    smsResult = await sendSms(phone, `Your ZimRide code is ${otp}. Valid for 5 minutes. Do not share this code.`);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
  }

  const response = { message: 'OTP sent successfully' };
  if (smsResult.devOtp) response.devOtp = smsResult.devOtp;
  res.json(response);
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Phone-based login: verify OTP → return JWT
router.post('/verify-otp', (req, res) => {
  const { phone: rawPhone, otp } = req.body;
  if (!rawPhone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  const phone = normalisePhone(rawPhone);
  const result = validateOtp(phone, otp);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  // Find user by phone
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    return res.status(404).json({ error: 'No account found with this phone number. Please register first.' });
  }

  // Mark phone as verified automatically when they log in via OTP
  if (!user.phone_verified) {
    db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(user.id);
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, phone_verified: true } });
});

// ─── POST /api/auth/verify-phone ─────────────────────────────────────────────
// Verify the OTP sent after registration (auth required)
router.post('/verify-phone', authMiddleware, (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ error: 'OTP is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.phone) {
    return res.status(400).json({ error: 'No phone number on your account. Please update your profile first.' });
  }
  if (user.phone_verified) {
    return res.status(400).json({ error: 'Phone number is already verified.' });
  }

  const result = validateOtp(user.phone, otp);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(user.id);
  res.json({ message: 'Phone number verified successfully', phone_verified: true });
});

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
// Resend the verification OTP for the logged-in user's phone
router.post('/resend-otp', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.phone) {
    return res.status(400).json({ error: 'No phone number on your account.' });
  }
  if (user.phone_verified) {
    return res.status(400).json({ error: 'Phone number is already verified.' });
  }

  const otp = generateOtp();
  storeOtp(user.phone, otp);

  let smsResult;
  try {
    smsResult = await sendSms(user.phone, `Your ZimRide verification code is ${otp}. It expires in 5 minutes.`);
  } catch {
    return res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
  }

  const response = { message: 'Verification code resent' };
  if (smsResult.devOtp) response.devOtp = smsResult.devOtp;
  res.json(response);
});

module.exports = router;
