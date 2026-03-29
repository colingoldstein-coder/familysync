import { useState, useEffect } from 'react';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('familysync_install_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS detection
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

  if (dismissed) return null;
  if (!deferredPrompt && !showIosPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-inner">
        <span className="install-prompt-icon">⟐</span>
        <div className="install-prompt-text">
          {showIosPrompt ? (
            <p>Install FamilySync: tap <strong>Share</strong> then <strong>Add to Home Screen</strong></p>
          ) : (
            <p>Install FamilySync for the best experience</p>
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
