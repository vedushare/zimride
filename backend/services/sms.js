'use strict';

/**
 * SMS Service for ZimRide
 *
 * Primary provider: sms.localhost.co.zw (Zimbabwean branded SMS platform)
 *   Endpoint: POST https://sms.localhost.co.zw/api/v1/sms/send/
 *   Auth:     X-API-KEY header
 *   Payload:  { to, sender, message }
 *
 * Set SMS_PROVIDER env var to choose a provider:
 *   "localhostzw"   — sms.localhost.co.zw  (DEFAULT — best for Zimbabwe)
 *   "africastalking" — Africa's Talking
 *   "twilio"         — Twilio
 *   "console"        — development/test (logs OTP to stdout, returns devOtp in response)
 *
 * If LOCALHOSTZW_API_KEY is not set, falls back to "console" automatically.
 *
 * Required env vars per provider:
 *
 *  localhostzw (default):
 *    LOCALHOSTZW_API_KEY   — API key from sms.localhost.co.zw dashboard
 *    LOCALHOSTZW_SENDER_ID — Sender name shown on phone (max 11 chars, default: "ZimRide")
 *
 *  africastalking:
 *    AT_USERNAME, AT_API_KEY, AT_SENDER_ID (optional, default: "ZimRide")
 *
 *  twilio:
 *    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 *  console:
 *    No config needed. OTP is printed to stdout. devOtp field returned in API
 *    response so tests and local development can read the code without real SMS.
 */

const https = require('https');

// Auto-select provider: prefer localhostzw if API key is configured, else console
const PROVIDER = process.env.SMS_PROVIDER
  || (process.env.LOCALHOSTZW_API_KEY ? 'localhostzw' : 'console');

/**
 * Send an SMS message.
 * @param {string} to   - Recipient phone in E.164 format, e.g. +263771234567
 * @param {string} body - SMS body text
 * @returns {Promise<{ success: boolean, devOtp?: string }>}
 *   In console/dev mode devOtp carries the OTP so tests can read it.
 */
async function sendSms(to, body) {
  switch (PROVIDER) {
    case 'localhostzw':
      return sendViaLocalhostZw(to, body);
    case 'africastalking':
      return sendViaAfricasTalking(to, body);
    case 'twilio':
      return sendViaTwilio(to, body);
    default:
      return sendViaConsole(to, body);
  }
}

// ─── localhost.co.zw ─────────────────────────────────────────────────────────

function sendViaLocalhostZw(to, body) {
  const apiKey = process.env.LOCALHOSTZW_API_KEY;
  const sender = process.env.LOCALHOSTZW_SENDER_ID || 'ZimRide';

  if (!apiKey) {
    throw new Error(
      'localhost.co.zw API key not configured. ' +
      'Set LOCALHOSTZW_API_KEY in your .env file. ' +
      'Get your key at https://sms.localhost.co.zw'
    );
  }

  const payload = JSON.stringify({ to, sender, message: body });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sms.localhost.co.zw',
      path: '/api/v1/sms/send/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
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
          reject(new Error(`localhost.co.zw API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Africa's Talking ────────────────────────────────────────────────────────

function sendViaAfricasTalking(to, body) {
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

function sendViaTwilio(to, body) {
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
  const otpMatch = body.match(/\b(\d{6})\b/);
  const otp = otpMatch ? otpMatch[1] : null;
  console.log(`[ZimRide SMS] To: ${to} | ${body}`);
  return Promise.resolve({
    success: true,
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
  });
}

module.exports = { sendSms };
