import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('familysync_install_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isSafari = /safari/.test(navigator.userAgent.toLowerCase()) && !/chrome/.test(navigator.userAgent.toLowerCase());
    if (isIos && isSafari) {
      setShowIosPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('familysync_install_dismissed', String(Date.now()));
    setDismissed(true);
  };

  if (dismissed || !user) return null;
  if (!deferredPrompt && !showIosPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-inner">
        <img src="/pwa-64x64.png" alt="" className="install-prompt-app-icon" />
        <div className="install-prompt-text">
          {showIosPrompt ? (
            <>
              <p>
                Install FamilySync for instant access and offline support.{' '}
                <button className="install-guide-toggle" onClick={() => setShowGuide(!showGuide)}>
                  {showGuide ? 'Hide steps' : 'Show me how'}
                </button>
              </p>
              {showGuide && (
                <div className="ios-guide">
                  <div className="ios-guide-step">
                    <svg className="ios-guide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path d="M12 4V0M12 0L9 3M12 0L15 3" />
                    </svg>
                    <span>Tap the <strong>Share</strong> button in Safari</span>
                  </div>
                  <div className="ios-guide-step">
                    <svg className="ios-guide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path d="M12 9V15M9 12H15" />
                    </svg>
                    <span>Scroll down, tap <strong>Add to Home Screen</strong></span>
                  </div>
                  <div className="ios-guide-step">
                    <svg className="ios-guide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                    <span>Tap <strong>Add</strong> in the top right</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>Install FamilySync for instant access, offline support, and notifications</p>
          )}
        </div>
        <div className="install-prompt-actions">
          {deferredPrompt && (
            <button onClick={handleInstall} className="btn btn-primary btn-small">Install</button>
          )}
          <button onClick={handleDismiss} className="install-prompt-close" aria-label="Dismiss">&times;</button>
        </div>
      </div>
    </div>
  );
}
