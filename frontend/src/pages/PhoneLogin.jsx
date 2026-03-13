import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../api/api.js';

/**
 * Phone-based login using OTP.
 * 1. User enters their Zimbabwe phone number → we send OTP via sms.localhost.co.zw
 * 2. User enters the 6-digit code → we issue a JWT
 */
export default function PhoneLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);
  const phoneInputRef = useRef(null);

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (step === 'otp') inputRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  // ─── Step 1: send OTP ───────────────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    setLoading(true);
    try {
      await api.sendOtp(phone.trim());
      setStep('otp');
      setResendCooldown(60);
      setInfo(`Code sent to ${phone.trim()} via sms.localhost.co.zw`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 2: verify OTP ─────────────────────────────────────────────────────
  async function submitOtp(code) {
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone.trim(), code);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(idx, value) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError('');
    if (char && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (char && idx === 5) {
      const code = [...next.slice(0, 5), char].join('');
      if (code.length === 6) submitOtp(code);
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setDigits(next);
    setError('');
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) submitOtp(pasted);
  }

  async function handleResend() {
    setError('');
    setLoading(true);
    try {
      await api.sendOtp(phone.trim());
      setResendCooldown(60);
      setInfo('A new code has been sent.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card otp-card">
        <div className="auth-header">
          <span className="otp-icon">📱</span>
          <h1>Login with phone</h1>
          <p>
            {step === 'phone'
              ? 'Enter your Zimbabwe phone number to receive a one-time code'
              : <>Enter the 6-digit code sent to <strong>{phone}</strong></>}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && !error && <div className="alert alert-info">{info}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="form-group">
              <label>Phone number</label>
              <input
                ref={phoneInputRef}
                type="tel"
                placeholder="+263 77 123 4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
              <span className="field-hint">Include country code (+263) or local format (077…)</span>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Sending code…' : 'Send Code via SMS'}
            </button>
          </form>
        ) : (
          <>
            <div className="otp-inputs" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  className={`otp-box${d ? ' otp-box-filled' : ''}`}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={loading}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={() => submitOtp(digits.join(''))}
              disabled={digits.join('').length < 6 || loading}
            >
              {loading ? 'Verifying…' : 'Verify & Login'}
            </button>

            <div className="otp-resend">
              {resendCooldown > 0 ? (
                <span className="resend-timer">Resend in {resendCooldown}s</span>
              ) : (
                <button className="btn-link" onClick={handleResend} disabled={loading}>
                  Resend code
                </button>
              )}
              <span className="resend-sep">·</span>
              <button className="btn-link" onClick={() => { setStep('phone'); setError(''); setInfo(''); }}>
                Change number
              </button>
            </div>
          </>
        )}

        <p className="auth-footer">
          <Link to="/login">← Login with email & password</Link>
        </p>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
