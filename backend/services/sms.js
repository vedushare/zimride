'use strict';

/**
 * SMS Service for ZimRide
 *
 * Supported providers (set SMS_PROVIDER env var):
 *   - "africastalking"  (default for production — best coverage in Zimbabwe)
 *   - "twilio"          (alternative international provider)
 *   - "console"         (development/test — logs OTP to stdout)
 *
 * Environment variables by provider:
 *
 *  Africa's Talking:
 *    AT_USERNAME, AT_API_KEY, AT_SENDER_ID (optional, defaults to 'ZimRide')
 *
 *  Twilio:
 *    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 *  Console (dev/test):
 *    No extra config needed. OTP is printed to stdout and also returned
 *    in the API response so tests can read it without real SMS.
 */

const https = require('https');

const PROVIDER = process.env.SMS_PROVIDER || 'console';

/**
 * Send an SMS message.
 * @param {string} to   - Recipient phone in international format e.g. +263771234567
 * @param {string} body - SMS body text
 * @returns {Promise<{ success: boolean, devOtp?: string }>}
 *   In console mode, devOtp carries the OTP so tests can inspect it.
 */
async function sendSms(to, body) {
  switch (PROVIDER) {
    case 'africastalking':
      return sendViaAfricasTalking(to, body);
    case 'twilio':
      return sendViaTwilio(to, body);
    default:
      return sendViaConsole(to, body);
  }
}

// ─── Africa's Talking ────────────────────────────────────────────────────────

async function sendViaAfricasTalking(to, body) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID || 'ZimRide';

  if (!username || !apiKey) {
    throw new Error('Africa\'s Talking credentials not configured (AT_USERNAME, AT_API_KEY)');
  }

  const payload = new URLSearchParams({
    username,
    to,
    message: body,
    from: senderId,
  }).toString();

  const isLive = username !== 'sandbox';
  const host = isLive ? 'api.africastalking.com' : 'api.sandbox.africastalking.com';

  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path: '/version1/messaging',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          reject(new Error(`Africa's Talking API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Twilio ──────────────────────────────────────────────────────────────────

async function sendViaTwilio(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  const payload = new URLSearchParams({ To: to, From: from, Body: body }).toString();
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          reject(new Error(`Twilio API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Console (dev/test) ──────────────────────────────────────────────────────

function sendViaConsole(to, body) {
  // Extract OTP from body for convenience in tests
  const otpMatch = body.match(/\b(\d{6})\b/);
  const otp = otpMatch ? otpMatch[1] : null;
  console.log(`[ZimRide SMS] To: ${to} | ${body}`);
  // Return devOtp only in non-production environments
  return Promise.resolve({ success: true, devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined });
}

module.exports = { sendSms };
