import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import '../styles/shared.css';

export default function EmailPreferences() {
  const { token } = useParams();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getEmailPreferences(token)
      .then(setPrefs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleToggle = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.updateEmailPreferences(token, !prefs.optedOut);
      setPrefs(p => ({ ...p, optedOut: res.optedOut }));
      setSuccess(res.optedOut ? 'You have been unsubscribed from marketing emails.' : 'You have been resubscribed to emails.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading preferences...</p>
      </div>
    );
  }

  if (error && !prefs) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Invalid Link</h2>
        <p style={{ color: 'var(--text-secondary)' }}>This email preferences link is invalid or has expired.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Go to Homepage</Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 480, margin: '0 auto', paddingTop: 48 }}>
      <div className="page-header">
        <h1>Email Preferences</h1>
        <p>Manage email settings for {prefs.name} ({prefs.email})</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Marketing Emails</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          {prefs.optedOut
            ? 'You are currently unsubscribed from marketing emails.'
            : 'You are currently subscribed to marketing emails from FamilySync.'}
        </p>

        <button
          className={prefs.optedOut ? 'btn btn-primary' : 'btn btn-danger'}
          onClick={handleToggle}
          disabled={saving}
        >
          {saving ? 'Saving...' : prefs.optedOut ? 'Resubscribe' : 'Unsubscribe'}
        </button>

        {success && <div className="success-msg" style={{ marginTop: 16 }}>{success}</div>}
        {error && <div className="error-msg" style={{ marginTop: 16 }}>{error}</div>}
      </div>

      <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-subdued)', fontSize: '0.8rem' }}>
        This will not affect important account notifications like invitations or password resets.
      </p>
    </div>
  );
}
