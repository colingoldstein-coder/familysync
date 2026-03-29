import { useState, useEffect } from 'react';
import { api } from '../api';
import '../styles/shared.css';

export default function CalendarSync() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    api.getCalendarToken()
      .then(data => setToken(data.calendarToken))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const feedUrl = token
    ? `${window.location.origin}/api/calendar/feed/${token}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = feedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    try {
      const data = await api.regenerateCalendarToken();
      setToken(data.calendarToken);
    } catch {}
  };

  if (loading) return null;

  return (
    <div className="calendar-sync">
      <div className="calendar-sync-header">
        <h3>Calendar Sync</h3>
        <p>Subscribe to your FamilySync calendar in any calendar app</p>
      </div>

      {token && (
        <>
          <div className="feed-url-row">
            <input
              type="text"
              value={feedUrl}
              readOnly
              className="feed-url-input"
              onClick={(e) => e.target.select()}
            />
            <button className="btn btn-primary btn-small" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="calendar-actions">
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              {showInstructions ? 'Hide instructions' : 'How to add'}
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={handleRegenerate}
              title="Generate a new URL (invalidates the old one)"
            >
              Reset URL
            </button>
          </div>

          {showInstructions && (
            <div className="calendar-instructions">
              <div className="instruction-block">
                <h4>Google Calendar</h4>
                <ol>
                  <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Google Calendar</a></li>
                  <li>Click the <strong>+</strong> next to "Other calendars"</li>
                  <li>Select <strong>"From URL"</strong></li>
                  <li>Paste the URL above and click <strong>"Add calendar"</strong></li>
                </ol>
              </div>

              <div className="instruction-block">
                <h4>Apple Calendar (iPhone/Mac)</h4>
                <ol>
                  <li>Go to <strong>Settings &gt; Calendar &gt; Accounts</strong></li>
                  <li>Tap <strong>"Add Account" &gt; "Other"</strong></li>
                  <li>Tap <strong>"Add Subscribed Calendar"</strong></li>
                  <li>Paste the URL above and tap <strong>"Next"</strong></li>
                </ol>
              </div>

              <div className="instruction-block">
                <h4>Outlook</h4>
                <ol>
                  <li>Open Outlook Calendar</li>
                  <li>Click <strong>"Add calendar" &gt; "Subscribe from web"</strong></li>
                  <li>Paste the URL above and click <strong>"Import"</strong></li>
                </ol>
              </div>

              <p className="instruction-note">
                Your calendar will update automatically. Tasks with deadlines appear as all-day events.
                Events appear at their scheduled time (including travel time if accepted).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
