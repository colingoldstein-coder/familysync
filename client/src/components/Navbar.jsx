import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">⟐</span>
          <span className="brand-text">FamilySync</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Dashboard</Link>
          {user.role === 'parent' && <Link to="/family" className="nav-link">Family</Link>}
        </div>

        <div className="navbar-user">
          <span className="user-badge" data-role={user.role}>
            {user.isAdmin ? '★' : user.role === 'parent' ? '☆' : '●'} {user.name}
          </span>
          <button onClick={handleLogout} className="btn btn-secondary btn-small">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
