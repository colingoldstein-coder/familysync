import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import '../styles/shared.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.sendContactMessage(form);
      setSuccess(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <span className="brand-icon-large">⟐</span>
          <h1>Contact Us</h1>
          <p>Have an issue or suggestion? We'd love to hear from you.</p>
        </div>

        {success ? (
          <div>
            <div className="success-msg">Your message has been sent! We'll get back to you soon.</div>
            <button className="btn btn-primary auth-btn" onClick={() => setSuccess(false)}>
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                placeholder="Tell us what's on your mind..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                maxLength={2000}
                rows={5}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p><Link to="/">Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
}
