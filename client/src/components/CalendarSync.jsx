import { useState, useEffect } from 'react';
import { api } from '../api';
import '../styles/shared.css';

export default function CalendarSync() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    api.getCalendarToken()
      .then(data => {
        if (data.calendarToken) {
          setToken(data.calendarToken);
          setSynced(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const feedUrl = token
    ? `${window.location.origin}/api/calendar/feed/${token}`
    : '';

  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');

  const googleUrl = feedUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const handleEnable = async () => {
    try {
      const data = await api.enableCalendarSync();
      setToken(data.calendarToken);
      setSynced(true);
    } catch { /* ignore */ }
  };

  const handleRegenerate = async () => {
    try {
      const data = await api.regenerateCalendarToken();
      setToken(data.calendarToken);
    } catch { /* ignore */ }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink calendar sync? Your calendar app will stop receiving updates from FamilySync. You can re-enable it at any time.')) return;
    try {
      await api.unlinkCalendar();
      setToken(null);
      setSynced(false);
      setShowManual(false);
    } catch { /* ignore */ }
  };

  if (loading) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="calendar-sync">
      <div className="calendar-sync-header">
        <h3>Calendar Sync</h3>
        <p>Add your FamilySync events and task deadlines to your phone's calendar</p>
      </div>

      {!synced && (
        <div>
          <p className="calendar-sync-note" style={{ marginBottom: 16 }}>
            Calendar sync is not enabled. Enable it to subscribe to your FamilySync calendar from any calendar app.
          </p>
          <button className="btn btn-primary" onClick={handleEnable}>
            Enable Calendar Sync
          </button>
        </div>
      )}

      {synced && token && (
        <>
          <div className="calendar-sync-status">
            <span className="calendar-sync-badge">Linked</span>
            <button className="btn btn-danger btn-small" onClick={handleUnlink}>
              Unlink Calendar
            </button>
          </div>

          <div className="calendar-quick-actions">
            {isIOS ? (
              <>
                <a href={webcalUrl} className="btn btn-primary calendar-add-btn">
                  Add to Apple Calendar
                </a>
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary calendar-add-btn">
                  Add to Google Calendar
                </a>
              </>
            ) : isAndroid ? (
              <>
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary calendar-add-btn">
                  Add to Google Calendar
                </a>
                <a href={webcalUrl} className="btn btn-secondary calendar-add-btn">
                  Add to Other Calendar
                </a>
              </>
            ) : (
              <>
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary calendar-add-btn">
                  Google Calendar
                </a>
                <a href={webcalUrl} className="btn btn-secondary calendar-add-btn">
                  Apple Calendar
                </a>
                <button className="btn btn-secondary calendar-add-btn" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </>
            )}
          </div>

          <p className="calendar-sync-note">
            Your calendar updates automatically. Tasks with deadlines appear as all-day events. Events appear at their scheduled time.
          </p>

          <button
            className="calendar-manual-toggle"
            onClick={() => setShowManual(!showManual)}
          >
            {showManual ? 'Hide manual setup' : 'Manual setup & other apps'}
          </button>

          {showManual && (
            <div className="calendar-manual">
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

              <div className="calendar-instructions">
                <div className="instruction-block">
                  <h4>iPhone / iPad</h4>
                  <ol>
                    <li>Tap the <strong>"Add to Apple Calendar"</strong> button above, or:</li>
                    <li>Go to <strong>Settings &gt; Calendar &gt; Accounts</strong></li>
                    <li>Tap <strong>"Add Account" &gt; "Other"</strong></li>
                    <li>Tap <strong>"Add Subscribed Calendar"</strong></li>
                    <li>Paste the URL and tap <strong>"Next"</strong></li>
                  </ol>
                </div>

                <div className="instruction-block">
                  <h4>Android / Google Calendar</h4>
                  <ol>
                    <li>Tap the <strong>"Add to Google Calendar"</strong> button above, or:</li>
                    <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Google Calendar</a> in a browser</li>
                    <li>Click <strong>+</strong> next to "Other calendars"</li>
                    <li>Select <strong>"From URL"</strong>, paste the URL and click <strong>"Add"</strong></li>
                  </ol>
                </div>

                <div className="instruction-block">
                  <h4>Outlook</h4>
                  <ol>
                    <li>Open Outlook Calendar</li>
                    <li>Click <strong>"Add calendar" &gt; "Subscribe from web"</strong></li>
                    <li>Paste the URL and click <strong>"Import"</strong></li>
                  </ol>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-small"
                onClick={handleRegenerate}
                style={{ marginTop: 12 }}
                title="Generate a new URL (invalidates the old one)"
              >
                Reset Calendar URL
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
