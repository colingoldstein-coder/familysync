import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">⟐</span>
            <span className="brand-text">FamilySync</span>
          </Link>

          {user ? (
            <>
              <div className="navbar-links navbar-links-desktop">
                {user.isSuperAdmin ? (
                  <>
                    <Link to="/admin" className="nav-link">Admin</Link>
                    <Link to="/about" className="nav-link">About</Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                    {user.role === 'parent' && <Link to="/family" className="nav-link">Family</Link>}
                    <Link to="/about" className="nav-link">About</Link>
                    <Link to="/contact" className="nav-link">Contact</Link>
                  </>
                )}
              </div>

              <div className="navbar-user">
                <Link to={user.isSuperAdmin ? '/admin' : '/account'} className="user-badge-link" data-role={user.isSuperAdmin ? 'admin' : user.role}>
                  {user.isSuperAdmin ? '⚙' : user.isAdmin ? '★' : user.role === 'parent' ? '☆' : '●'} {user.name}
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary btn-small">
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="navbar-links navbar-links-desktop">
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

      {/* Mobile bottom tab bar */}
      {user && !user.isSuperAdmin && (
        <nav className="mobile-tab-bar" aria-label="Mobile navigation">
          <Link to="/dashboard" className={`mobile-tab${isActive('/dashboard') ? ' active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </Link>
          {user.role === 'parent' && (
            <Link to="/family" className={`mobile-tab${isActive('/family') ? ' active' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Family</span>
            </Link>
          )}
          <Link to="/about" className={`mobile-tab${isActive('/about') ? ' active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>About</span>
          </Link>
          <Link to="/account" className={`mobile-tab${isActive('/account') ? ' active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </Link>
        </nav>
      )}
    </>
  );
}
