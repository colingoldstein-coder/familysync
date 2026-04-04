import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import './ProfileSetupReminder.css';

export default function ProfileSetupReminder() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [dismissing, setDismissing] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!user || user.profileSetupComplete || user.profileReminderDismissed || user.isSuperAdmin || hidden) {
    return null;
  }

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await api.dismissProfileReminder();
      await refreshUser();
      setHidden(true);
    } catch {
      setDismissing(false);
    }
  };

  return (
    <div className="profile-reminder">
      <div className="profile-reminder-content">
        <div className="profile-reminder-text">
          <strong>Finish setting up your profile</strong>
          <span>Add a photo and link your calendar to get the most out of FamilySync.</span>
        </div>
        <button className="btn btn-primary btn-small" onClick={() => navigate('/welcome')}>
          Complete Setup
        </button>
      </div>
      <label className="profile-reminder-dismiss">
        <input
          type="checkbox"
          onChange={handleDismiss}
          disabled={dismissing}
        />
        <span>Don't show this again</span>
      </label>
    </div>
  );
}
