import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import PasswordInput from '../components/PasswordInput';
import '../styles/shared.css';
import './Auth.css';

export default function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Set New Password</h1>

        {success ? (
          <div>
            <p className="auth-subtitle">
              Your password has been reset successfully.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
              Log In
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <PasswordInput
                  placeholder="Min 10 chars, upper + lower + number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  showStrength
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <PasswordInput
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
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
