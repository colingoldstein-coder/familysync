import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PasswordInput from '../components/PasswordInput';
import '../styles/shared.css';
import './Auth.css';

export default function AcceptInvite() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getInvite(token)
      .then(data => setInvite(data))
      .catch(err => setError(err.message))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await acceptInvite(token, name, password);
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
            <span className="brand-icon-large">⟐</span>
            <p>Loading invitation...</p>
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
            <span className="brand-icon-large">⟐</span>
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
          <span className="brand-icon-large">⟐</span>
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

          <div className="form-group">
            <label>Password</label>
            <PasswordInput
              placeholder="Min 10 chars, upper + lower + number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-btn">
            Join Family
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
