import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import '../styles/shared.css';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>

        {sent ? (
          <div>
            <p className="auth-subtitle">
              If an account exists with <strong>{email}</strong>, we've sent a password reset link. Check your email and follow the instructions.
            </p>
            <p className="auth-subtitle">
              The link expires in 1 hour.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="auth-link">
              <Link to="/login">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
