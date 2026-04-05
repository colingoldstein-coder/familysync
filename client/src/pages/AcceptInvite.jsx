import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PasswordInput from '../components/PasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import '../styles/shared.css';
import './Auth.css';

export default function AcceptInvite() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [googleIdToken, setGoogleIdToken] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const { acceptInvite, googleAcceptInvite } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getInvite(token)
      .then(data => setInvite(data))
      .catch(err => setError(err.message))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  const handleGoogleSuccess = useCallback((idToken) => {
    setError('');
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload || typeof payload !== 'object') throw new Error('Invalid token payload');
      setGoogleIdToken(idToken);
      setName(String(payload.name || ''));
    } catch {
      setError('Failed to read Google account info');
    }
  }, []);

  const handleGoogleError = useCallback((err) => {
    setError(err.message || 'Google sign-in failed');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (googleIdToken) {
        await googleAcceptInvite(googleIdToken, token, name);
      } else {
        await acceptInvite(token, name, password);
      }
      navigate('/welcome');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loadingInvite) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="brand-icon-large">&#x27D0;</span>
            <p>Loading invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="brand-icon-large">&#x27D0;</span>
            <h1>Invitation Declined</h1>
            <p>You have declined this invitation. The family admin has been notified.</p>
          </div>
          <div className="auth-footer">
            <Link to="/login">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="brand-icon-large">&#x27D0;</span>
            <h1>Invalid Invitation</h1>
            <p>{error || 'This invitation link is invalid or has expired.'}</p>
          </div>
          <div className="auth-footer">
            <p>Already have an account?</p>
            <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="brand-icon-large">&#x27D0;</span>
          <h1>FamilySync</h1>
          <p>You've been invited to join <strong>{invite.familyName}</strong></p>
        </div>

        <div className="invite-details">
          <div className="invite-detail-row">
            <span>Email</span>
            <strong>{invite.email}</strong>
          </div>
          <div className="invite-detail-row">
            <span>Role</span>
            <strong style={{ textTransform: 'capitalize' }}>{invite.role}</strong>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {!googleIdToken && (
          <>
            <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            <div className="social-divider">
              <span>or use password</span>
            </div>
          </>
        )}

        {googleIdToken && (
          <div className="invite-details" style={{ marginBottom: 16 }}>
            <div className="invite-detail-row">
              <span>Signing in with Google</span>
              <strong>{invite.email}</strong>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: '0.8125rem' }}
              onClick={() => { setGoogleIdToken(null); setName(''); }}
            >
              Use password instead
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {!googleIdToken && (
            <div className="form-group">
              <label>Password</label>
              <PasswordInput
                placeholder="Min 10 chars, upper + lower + number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showStrength
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-btn">
            Join Family
          </button>
        </form>

        <div className="auth-footer">
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: 12, color: 'var(--text-secondary)' }}
            disabled={declining}
            onClick={async () => {
              if (!window.confirm('Are you sure you want to decline this invitation?')) return;
              setDeclining(true);
              try {
                await api.declineInvite(token);
                setError('');
                setDeclined(true);
              } catch (err) {
                setError(err.message);
              } finally {
                setDeclining(false);
              }
            }}
          >
            {declining ? 'Declining...' : 'Decline Invitation'}
          </button>
          <p>Already have an account?</p>
          <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
