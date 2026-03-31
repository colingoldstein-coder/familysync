import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PasswordInput from '../components/PasswordInput';
import CalendarSync from '../components/CalendarSync';
import { usePushNotifications } from '../hooks/usePushNotifications';
import '../styles/shared.css';
import './Account.css';

export default function Account() {
  const { user, updateToken, refreshUser } = useAuth();

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
      const data = await api.updateName({ name });
      updateToken(data.token);
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
      const data = await api.updateEmail({ newEmail, password: emailPassword });
      updateToken(data.token);
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
      const data = await api.updatePassword({ currentPassword, newPassword });
      if (data.token) updateToken(data.token);
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
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1>Account Settings</h1>
      </div>

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

      {/* Notifications */}
      <NotificationSettings />

      {/* Calendar Sync */}
      <CalendarSync />
    </div>
  );
}

function NotificationSettings() {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  if (!isSupported) return null;

  const handleToggle = async () => {
    setLoading(true);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
    setLoading(false);
  };

  return (
    <div className="account-section">
      <h2>Notifications</h2>
      <p className="account-current">
        {permission === 'denied'
          ? 'Notifications are blocked in your browser settings.'
          : 'Get notified when tasks are assigned, requests are made, or events are created.'}
      </p>
      {permission !== 'denied' && (
        <button
          onClick={handleToggle}
          className={`btn btn-small ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
          disabled={loading}
        >
          {loading ? 'Updating...' : isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
        </button>
      )}
    </div>
  );
}
