import { Link } from 'react-router-dom';
import './Install.css';

export default function Install() {
  return (
    <div className="install-page">
      <div className="install-header">
        <h1>Install <span className="text-green">FamilySync</span></h1>
        <p>Get FamilySync on your phone in under a minute. No app store needed.</p>
      </div>

      <div className="install-step install-step-shared">
        <div className="install-step-number">1</div>
        <div className="install-step-content">
          <h3>Visit FamilySync in your browser</h3>
          <p>On your phone, open your browser and go to:</p>
          <div className="install-url">www.myfamilysyncapp.com</div>
        </div>
      </div>

      <div className="install-section">
        <div className="install-section-header">
          <svg className="install-platform-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 16V8a7 7 0 0 1 14 0v8" />
            <path d="M3 16h18l-1.5 5H4.5L3 16Z" />
          </svg>
          <h2>Android</h2>
        </div>

        <div className="install-steps">
          <div className="install-step">
            <div className="install-step-number">2</div>
            <div className="install-step-content">
              <h3>Look for the install banner</h3>
              <p>If you see an <strong>"Install FamilySync"</strong> banner at the top of the page, tap <strong>Install</strong> and you're done.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="install-step-number">3</div>
            <div className="install-step-content">
              <h3>Or use the Chrome menu</h3>
              <p>If no banner appears, tap the <strong>three-dot menu</strong> in the top right corner of Chrome.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="install-step-number">4</div>
            <div className="install-step-content">
              <h3>Add to Home Screen</h3>
              <p>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install app"</strong>, then tap <strong>Install</strong> to confirm.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="install-section">
        <div className="install-section-header">
          <svg className="install-platform-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.5 2 6 5.5 6 9c0 2.5 1 4.5 2.5 6L7 22h10l-1.5-7C17 13.5 18 11.5 18 9c0-3.5-2.5-7-6-7Z" />
            <path d="M10 2.5C10.5 4 12 5 12 5s1.5-1 2-2.5" />
          </svg>
          <h2>iOS (iPhone / iPad)</h2>
        </div>

        <div className="install-steps">
          <div className="install-step">
            <div className="install-step-number">2</div>
            <div className="install-step-content">
              <h3>Open in Safari</h3>
              <p>You must use <strong>Safari</strong> — this won't work in Chrome or other browsers on iOS.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="install-step-number">3</div>
            <div className="install-step-content">
              <h3>Tap the Share button</h3>
              <p>Tap the <strong>Share</strong> button — the square with an arrow at the bottom of the screen.</p>
              <div className="install-icon-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M12 4V0M12 0L9 3M12 0L15 3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="install-step">
            <div className="install-step-number">4</div>
            <div className="install-step-content">
              <h3>Add to Home Screen</h3>
              <p>Scroll down in the share sheet and tap <strong>"Add to Home Screen"</strong>.</p>
              <div className="install-icon-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M12 9V15M9 12H15" />
                </svg>
              </div>
            </div>
          </div>

          <div className="install-step">
            <div className="install-step-number">5</div>
            <div className="install-step-content">
              <h3>Confirm</h3>
              <p>Tap <strong>Add</strong> in the top right corner. That's it!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="install-footer-note">
        <p>Once installed, FamilySync works offline and launches without the browser toolbar — just like a native app.</p>
        <Link to="/" className="btn btn-primary btn-large">Go to FamilySync</Link>
      </div>
    </div>
  );
}
