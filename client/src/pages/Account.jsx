import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import PasswordInput from '../components/PasswordInput';
import CalendarSync from '../components/CalendarSync';
import AvatarCropModal from '../components/AvatarCropModal';
import { usePushNotifications } from '../hooks/usePushNotifications';
import '../styles/shared.css';
import './Account.css';

export default function Account() {
  const { user, refreshUser } = useAuth();

  // Scroll to hash section on mount (e.g. #email-preferences)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      if (/^[a-zA-Z0-9_-]+$/.test(id)) {
        const el = document.getElementById(id);
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, []);

  // Name form
  const [name, setName] = useState(user.name);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');
    setNameSaving(true);
    try {
      await api.updateName({ name });
      await refreshUser();
      setNameSuccess('Name updated');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err.message);
    } finally {
      setNameSaving(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    setEmailSaving(true);
    try {
      await api.updateEmail({ newEmail, password: emailPassword });
      await refreshUser();
      setNewEmail('');
      setEmailPassword('');
      setEmailSuccess('Email updated');
      setTimeout(() => setEmailSuccess(''), 3000);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess('Password updated');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header mb-16">
        <h1>Account Settings</h1>
      </div>

      {/* Profile Photo */}
      <ProfilePhotoSection />

      {/* Name */}
      <div className="account-section">
        <h2>Display Name</h2>
        {nameError && <div className="error-msg">{nameError}</div>}
        {nameSuccess && <div className="success-msg">{nameSuccess}</div>}
        <form onSubmit={handleUpdateName}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-small" disabled={nameSaving || name === user.name}>
            {nameSaving ? 'Saving...' : 'Update Name'}
          </button>
        </form>
      </div>

      {/* Email */}
      <div className="account-section">
        <h2>Email Address</h2>
        <p className="account-current">Current: <strong>{user.email}</strong></p>
        {emailError && <div className="error-msg">{emailError}</div>}
        {emailSuccess && <div className="success-msg">{emailSuccess}</div>}
        <form onSubmit={handleUpdateEmail}>
          <div className="form-group">
            <label>New Email</label>
            <input
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <PasswordInput
              placeholder="Enter your password to confirm"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-small" disabled={emailSaving}>
            {emailSaving ? 'Saving...' : 'Update Email'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="account-section">
        <h2>Change Password</h2>
        {pwError && <div className="error-msg">{pwError}</div>}
        {pwSuccess && <div className="success-msg">{pwSuccess}</div>}
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <PasswordInput
              placeholder="Your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <PasswordInput
              placeholder="Min 10 chars, upper + lower + number"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <PasswordInput
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-small" disabled={pwSaving}>
            {pwSaving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Email Preferences */}
      <EmailPreferencesSection />

      {/* Biometric Login */}
      <BiometricSettings />

      {/* Notifications */}
      <NotificationSettings />

      {/* Calendar Sync */}
      <CalendarSync />
    </div>
  );
}

function ProfilePhotoSection() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cropImage, setCropImage] = useState(null);

  const avatarUrl = user.avatarUrl || null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCropSave = async (croppedFile) => {
    setCropImage(null);
    setUploading(true);
    try {
      await api.uploadAvatar(croppedFile);
      await refreshUser();
      setSuccess('Profile photo updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRecrop = () => {
    setCropImage(avatarUrl);
  };

  const handleRemove = async () => {
    setError('');
    setSuccess('');
    setUploading(true);
    try {
      await api.removeAvatar();
      await refreshUser();
      setSuccess('Profile photo removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="account-section">
      <h2>Profile Photo</h2>
      <div className="avatar-section">
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.name} className="avatar-display" />
        ) : (
          <div className="avatar-display avatar-display-fallback" style={{ background: user.avatarColor || '#0097A7' }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="avatar-upload-actions">
          {avatarUrl ? (
            <>
              <button className="btn btn-primary btn-small" onClick={handleRecrop} disabled={uploading}>
                Edit Photo
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              <button className="btn btn-secondary btn-small" onClick={handleRemove} disabled={uploading}>
                Remove
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-small" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>
      </div>
      <p className="account-current mt-8">JPG, PNG, GIF or WebP. Max 5MB.</p>
      {success && <div className="success-msg mt-8">{success}</div>}
      {error && <div className="error-msg mt-8">{error}</div>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {cropImage && (
        <AvatarCropModal
          imageSrc={cropImage}
          onSave={handleCropSave}
          onCancel={() => setCropImage(null)}
        />
      )}
    </div>
  );
}

function EmailPreferencesSection() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [optedOut, setOptedOut] = useState(!!user.emailOptOut);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const sectionRef = useRef(null);

  useEffect(() => { setOptedOut(!!user.emailOptOut); }, [user.emailOptOut]);

  const handleToggle = async (e) => {
    const newOptOut = !e.target.checked;
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await api.updateEmailPrefs({ optOut: newOptOut });
      setOptedOut(newOptOut);
      refreshUser();
      setSuccess(newOptOut
        ? 'You have been unsubscribed from marketing emails.'
        : 'You have been resubscribed to marketing emails.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-section" id="email-preferences" ref={sectionRef}>
      <h2>Email Preferences</h2>
      <label className={`email-pref-label ${saving ? 'saving' : ''}`}>
        <input
          type="checkbox"
          className="email-pref-checkbox"
          checked={!optedOut}
          onChange={handleToggle}
          disabled={saving}
        />
        <div>
          <div className="email-pref-title">
            Receive marketing emails from FamilySync
          </div>
          <div className="email-pref-desc">
            Updates about new features, tips, and announcements. You can change this at any time.
          </div>
        </div>
      </label>
      {success && <div className="success-msg mt-12">{success}</div>}
      {error && <div className="error-msg mt-12">{error}</div>}
    </div>
  );
}

function NotificationSettings() {
  const { user, refreshUser } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isSupported) return null;

  const handleToggle = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (isSubscribed) {
        await unsubscribe();
        setSuccess('Notifications disabled');
      } else {
        await subscribe();
        setSuccess('Notifications enabled');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update notifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePrefChange = async (key, value) => {
    setPrefSaving(true);
    setError('');
    try {
      await api.updateNotificationPrefs({ [key]: value });
      await refreshUser();
    } catch (err) {
      setError(err.message || 'Failed to save preference');
    }
    setPrefSaving(false);
  };

  const prefsDisabled = prefSaving || !isSubscribed;

  return (
    <div className="account-section">
      <h2>Notifications</h2>
      {error && <div className="error-msg mb-12">{error}</div>}
      {success && <div className="success-msg mb-12">{success}</div>}
      {permission === 'denied' ? (
        <p className="account-current">
          Notifications are blocked in your browser settings. To enable notifications,
          update your browser permissions for this site and reload the page.
        </p>
      ) : (
        <>
          <p className="account-current">
            Get notified when tasks are assigned, requests are made, events are created, and more.
          </p>
          <button
            onClick={handleToggle}
            className={`btn btn-small mb-16 ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
            disabled={loading}
          >
            {loading ? 'Updating...' : isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
          </button>

          <div className={`notification-prefs ${!isSubscribed ? 'notification-prefs-disabled' : ''}`}>
            <p className="account-current mb-8" style={{ fontWeight: 600 }}>
              Real-time notifications
            </p>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyNewRequests !== false}
                onChange={(e) => handlePrefChange('newRequests', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>New help requests sent to me</span>
            </label>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyNewTasks !== false}
                onChange={(e) => handlePrefChange('newTasks', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>New tasks assigned to me</span>
            </label>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyNewEvents !== false}
                onChange={(e) => handlePrefChange('newEvents', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>New events sent to me</span>
            </label>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyResponses !== false}
                onChange={(e) => handlePrefChange('responses', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>Responses to my requests, events, tasks, and invitations</span>
            </label>

            <p className="account-current mb-8 mt-16" style={{ fontWeight: 600 }}>
              Daily summary reminders
            </p>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyPendingRequests !== false}
                onChange={(e) => handlePrefChange('pendingRequests', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>Pending help requests awaiting a response</span>
            </label>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyTasksDue !== false}
                onChange={(e) => handlePrefChange('tasksDue', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>Tasks due today</span>
            </label>
            <label className="notification-pref-item">
              <input
                type="checkbox"
                checked={user.notifyActiveEvents !== false}
                onChange={(e) => handlePrefChange('activeEvents', e.target.checked)}
                disabled={prefsDisabled}
              />
              <span>Events happening today</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function BiometricSettings() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supportsWebAuthn = browserSupportsWebAuthn();

  const loadCredentials = useCallback(async () => {
    try {
      const data = await api.webauthnCredentials();
      setCredentials(data.credentials);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (supportsWebAuthn) loadCredentials();
  }, [supportsWebAuthn, loadCredentials]);

  if (!supportsWebAuthn) return null;

  const handleSetup = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const options = await api.webauthnRegisterOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      await api.webauthnRegister(regResponse);
      // Save email so login page knows biometric is available
      localStorage.setItem('familysync_biometric_email', btoa(user.email));
      setSuccess('Biometric login enabled for this device');
      setTimeout(() => setSuccess(''), 3000);
      loadCredentials();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric setup was cancelled');
      } else {
        setError(err.message || 'Failed to set up biometric login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.webauthnDeleteCredential(id);
      const updated = credentials.filter(c => c.id !== id);
      setCredentials(updated);
      if (updated.length === 0) {
        localStorage.removeItem('familysync_biometric_email');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="account-section">
      <h2>Biometric Login</h2>
      <p className="account-current">
        Use fingerprint or face recognition to sign in on this device.
      </p>
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {credentials.length > 0 && (
        <div className="biometric-credentials">
          {credentials.map(c => (
            <div key={c.id} className="biometric-credential">
              <div>
                <strong>{c.device_name || 'Device'}</strong>
                <span className="biometric-date">Added {(() => { const s = String(c.created_at).slice(0, 10); return new Date(s + 'T00:00:00').toLocaleDateString(); })()}</span>
              </div>
              <button className="btn btn-secondary btn-small" onClick={() => handleRemove(c.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSetup}
        className="btn btn-primary btn-small"
        disabled={loading}
      >
        {loading ? 'Setting up...' : credentials.length > 0 ? 'Add Another Device' : 'Set Up Biometric Login'}
      </button>
    </div>
  );
}
