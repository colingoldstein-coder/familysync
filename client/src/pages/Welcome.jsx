import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CalendarSync from '../components/CalendarSync';
import '../styles/shared.css';
import './Auth.css';
import './Welcome.css';

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="welcome-card">
        <div className="auth-logo">
          <span className="brand-icon-large">⟐</span>
          <h1>Welcome to FamilySync{user ? `, ${user.name}` : ''}!</h1>
          <p>Your account is all set. Connect your calendar to stay on top of tasks and events.</p>
        </div>

        <CalendarSync />

        <div className="welcome-actions">
          <button className="btn btn-primary auth-btn" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
          <button className="btn btn-secondary welcome-skip" onClick={() => navigate('/dashboard')}>
            Skip for now — you can set this up later in Account settings
          </button>
        </div>
      </div>
    </div>
  );
}
