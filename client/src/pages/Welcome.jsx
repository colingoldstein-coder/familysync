import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import CalendarSync from '../components/CalendarSync';
import AvatarCropModal from '../components/AvatarCropModal';
import '../styles/shared.css';
import './Auth.css';
import './Welcome.css';

export default function Welcome() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [photoError, setPhotoError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCropSave = async (croppedFile) => {
    setCropImage(null);
    setUploading(true);
    try {
      const data = await api.uploadAvatar(croppedFile);
      setAvatarUrl(data.avatarUrl);
      await refreshUser();
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
    try {
      await api.completeProfileSetup();
      await refreshUser();
    } catch { /* ignore */ }
    navigate('/dashboard');
  };

  const totalSteps = 3;

  return (
    <div className="auth-page">
      <div className="welcome-card">
        {/* Progress indicator */}
        <div className="welcome-progress">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`welcome-progress-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
              <div className="welcome-progress-dot">{step > s ? '\u2713' : s}</div>
              <span className="welcome-progress-label">
                {s === 1 ? 'Photo' : s === 2 ? 'Calendar' : 'Done'}
              </span>
            </div>
          ))}
          <div className="welcome-progress-line">
            <div className="welcome-progress-fill" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
          </div>
        </div>

        {/* Step 1: Profile Photo */}
        {step === 1 && (
          <div className="welcome-step">
            <div className="auth-logo">
              <h1>Add a profile photo</h1>
              <p>Help your family recognise you at a glance</p>
            </div>

            <div className="welcome-avatar-area">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name} className="welcome-avatar-preview" />
              ) : (
                <div className="welcome-avatar-preview welcome-avatar-placeholder" style={{ background: user?.avatarColor || '#0097A7' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="welcome-avatar-actions">
                {avatarUrl ? (
                  <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                )}
              </div>

              <p className="welcome-avatar-hint">JPG, PNG, GIF or WebP. Max 5MB.</p>
              {photoError && <div className="error-msg mt-8">{photoError}</div>}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {cropImage && (
              <AvatarCropModal
                imageSrc={cropImage}
                onSave={handleCropSave}
                onCancel={() => setCropImage(null)}
              />
            )}

            <div className="welcome-actions">
              <button className="btn btn-primary auth-btn" onClick={() => setStep(2)}>
                {avatarUrl ? 'Next' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Calendar Sync */}
        {step === 2 && (
          <div className="welcome-step">
            <div className="auth-logo">
              <h1>Link your calendar</h1>
              <p>Keep your tasks and family events in sync with your phone</p>
            </div>

            <CalendarSync />

            <div className="welcome-actions">
              <button className="btn btn-primary auth-btn" onClick={() => setStep(3)}>
                Next
              </button>
              <button className="btn btn-secondary welcome-back" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: All Done */}
        {step === 3 && (
          <div className="welcome-step">
            <div className="auth-logo">
              <span className="brand-icon-large">&#x27D0;</span>
              <h1>You're all set{user ? `, ${user.name}` : ''}!</h1>
              <p>Your profile is ready. Head to the dashboard to see your family's tasks and events.</p>
            </div>

            <div className="welcome-summary">
              <div className="welcome-summary-item">
                <span className={`welcome-check ${avatarUrl ? 'done' : ''}`}>
                  {avatarUrl ? '\u2713' : '\u2013'}
                </span>
                <span>Profile photo</span>
              </div>
              <div className="welcome-summary-item">
                <span className="welcome-check done">{'\u2713'}</span>
                <span>Calendar sync</span>
              </div>
            </div>

            <div className="welcome-actions">
              <button className="btn btn-primary auth-btn" onClick={handleFinish}>
                Go to Dashboard
              </button>
              <button className="btn btn-secondary welcome-back" onClick={() => setStep(2)}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
