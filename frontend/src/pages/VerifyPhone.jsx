import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../api/api.js';

/**
 * OTP verification page shown after registration when the user has a phone number.
 * Accepts a 6-digit code sent via SMS through sms.localhost.co.zw.
 */
export default function VerifyPhone() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  // digits[0..5] — each input holds exactly one character
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);

  // Phone shown in the subtitle — passed via router state or from auth context
  const phone = location.state?.phone || user?.phone || '';

  // Focus the first empty box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  function handleDigitChange(idx, value) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError('');

    // Auto-advance to next input
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    // Auto-submit when all 6 digits are filled
    if (char && idx === 5) {
      const code = [...next.slice(0, 5), char].join('');
      if (code.length === 6) submitCode(code);
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    // Allow pasting a 6-digit code into any box
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) return;
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
    if (pasted.length === 6) submitCode(pasted);
  }

  async function submitCode(code) {
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyPhone(code);
      if (res.data.phone_verified) {
        setSuccess('✅ Phone verified! Redirecting…');
        // Update the stored user object to reflect verified status
        const savedUser = JSON.parse(localStorage.getItem('zimride_user') || '{}');
        const updated = { ...savedUser, phone_verified: true };
        login(localStorage.getItem('zimride_token'), updated);
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.resendOtp();
      setResendCooldown(60);
      setSuccess('A new code has been sent to your phone.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  const otp = digits.join('');

  return (
    <div className="auth-page">
      <div className="auth-card otp-card">
        <div className="auth-header">
          <span className="otp-icon">📱</span>
          <h1>Verify your phone</h1>
          <p>
            We sent a 6-digit code via <strong>sms.localhost.co.zw</strong>
            {phone && <> to <strong>{phone}</strong></>}.
            <br />Enter it below to confirm your number.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

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
              disabled={loading || !!success}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={() => submitCode(otp)}
          disabled={otp.length < 6 || loading || !!success}
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>

        <div className="otp-resend">
          {resendCooldown > 0 ? (
            <span className="resend-timer">Resend code in {resendCooldown}s</span>
          ) : (
            <button
              className="btn-link"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending…' : "Didn't receive a code? Resend"}
            </button>
          )}
        </div>

        <button className="btn-link skip-link" onClick={() => navigate('/')}>
          Skip for now →
        </button>
      </div>
    </div>
  );
}
