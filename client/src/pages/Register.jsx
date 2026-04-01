import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import '../styles/shared.css';
import './Auth.css';

export default function Register() {
  const [familyName, setFamilyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleIdToken, setGoogleIdToken] = useState(null);
  const { registerFamily, googleRegisterFamily } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = useCallback((idToken) => {
    setError('');
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      setGoogleIdToken(idToken);
      setName(payload.name || '');
      setEmail(payload.email || '');
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
        await googleRegisterFamily(googleIdToken, familyName, name);
      } else {
        await registerFamily(familyName, name, email, password);
      }
      navigate('/welcome');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="brand-icon-large">&#x27D0;</span>
          <h1>FamilySync</h1>
          <p>Create a new family</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {!googleIdToken && (
          <>
            <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            <div className="social-divider">
              <span>or use email</span>
            </div>
          </>
        )}

        {googleIdToken && (
          <div className="invite-details" style={{ marginBottom: 16 }}>
            <div className="invite-detail-row">
              <span>Google Account</span>
              <strong>{email}</strong>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: '0.8125rem' }}
              onClick={() => { setGoogleIdToken(null); setEmail(''); setName(''); }}
            >
              Use a different account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Family Name</label>
            <input
              type="text"
              placeholder="e.g. The Smiths"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
          </div>

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
            <>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <PasswordInput
                  placeholder="Min 10 chars, upper + lower + number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  showStrength
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary auth-btn">
            Create Family
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account?</p>
          <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
