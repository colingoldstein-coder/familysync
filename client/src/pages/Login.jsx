import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import PasswordInput from '../components/PasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import '../styles/shared.css';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const { login, biometricLogin, googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('familysync_biometric_email');
    if (savedEmail && browserSupportsWebAuthn()) {
      setEmail(savedEmail);
      setBiometricAvailable(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setBiometricLoading(true);
    try {
      const options = await api.webauthnLoginOptions(email);
      const authResponse = await startAuthentication({ optionsJSON: options });
      await biometricLogin(email, authResponse);
      navigate('/dashboard');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled');
      } else {
        setError(err.message || 'Biometric login failed');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(async (idToken) => {
    setError('');
    try {
      await googleLogin(idToken);
      navigate('/dashboard');
    } catch (err) {
      if (err.message === 'no_account') {
        setError('No account found with this Google email. Please register first.');
      } else {
        setError(err.message);
      }
    }
  }, [googleLogin, navigate]);

  const handleGoogleError = useCallback((err) => {
    setError(err.message || 'Google sign-in failed');
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="brand-icon-large">&#x27D0;</span>
          <h1>FamilySync</h1>
          <p>Log in to continue</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

        {biometricAvailable && (
          <div className="biometric-section">
            <button
              type="button"
              className="btn btn-primary auth-btn biometric-btn"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10V14" />
                <path d="M7.5 7.5C7.5 5 9.5 3 12 3s4.5 2 4.5 4.5" />
                <path d="M5 9.5C5 5.5 8 2 12 2s7 3.5 7 7.5" />
                <path d="M12 14c1.5 0 3 1 3 3v2" />
                <path d="M9 17v-1c0-1 .5-2 1.5-2.5" />
                <path d="M3 11.5c0 4 2 7.5 5.5 9.5" />
                <path d="M21 11.5c0 4-2 7.5-5.5 9.5" />
              </svg>
              {biometricLoading ? 'Verifying...' : 'Sign in with Biometrics'}
            </button>
          </div>
        )}

        <div className="social-divider">
          <span>or use password</span>
        </div>

        <form onSubmit={handleSubmit}>
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
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-btn">
            Log In
          </button>

          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </form>

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <Link to="/register">Create a Family</Link>
        </div>
      </div>
    </div>
  );
}
