import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">⟐</span>
          <span className="brand-text">FamilySync</span>
        </Link>

        {user ? (
          <>
            <div className="navbar-links">
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              {user.role === 'parent' && <Link to="/family" className="nav-link">Family</Link>}
              {user.isSuperAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
              <Link to="/about" className="nav-link">About</Link>
              <Link to="/contact" className="nav-link">Contact</Link>
            </div>

            <div className="navbar-user">
              <span className="user-badge" data-role={user.role}>
                {user.isAdmin ? '★' : user.role === 'parent' ? '☆' : '●'} {user.name}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-small">
                Log out
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="navbar-links">
              <Link to="/about" className="nav-link">About</Link>
              <Link to="/contact" className="nav-link">Contact</Link>
            </div>

            <div className="navbar-user">
              <Link to="/login" className="btn btn-secondary btn-small">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-small">Sign up</Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
