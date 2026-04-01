import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminSiteImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      const res = await api.getAdminSiteImages();
      setImages(res.images || []);
    } catch {
      setError('Failed to load site images');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(key, file) {
    setSaving(key);
    setError('');
    setSuccess('');
    try {
      const uploadRes = await api.adminUploadImage(file);
      await api.updateAdminSiteImage(key, { imageUrl: uploadRes.url });
      setSuccess(`Updated ${key}`);
      loadImages();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setSaving(null);
    }
  }

  async function handleAltText(key, altText) {
    try {
      await api.updateAdminSiteImage(key, { altText });
    } catch (err) {
      setError(err.message || 'Update failed');
    }
  }

  if (loading) return <div className="card" style={{ padding: 24 }}>Loading site images...</div>;

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 8px' }}>Site Images</h3>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px', fontSize: '0.875rem' }}>
        Manage images shown on the landing page. Upload a photo and it will appear in the matching section.
      </p>

      {error && <div className="msg msg-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="msg msg-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gap: 16 }}>
        {images.map(img => (
          <div key={img.key} style={{
            display: 'flex', gap: 16, alignItems: 'flex-start',
            padding: 16, background: 'var(--bg-highlight)', borderRadius: 'var(--card-radius)',
          }}>
            <div style={{
              width: 120, height: 80, borderRadius: 8, overflow: 'hidden',
              background: 'var(--border-color)', flexShrink: 0,
            }}>
              {img.image_url ? (
                <img src={img.image_url} alt={img.alt_text || img.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-subdued)', fontSize: '0.75rem',
                }}>No image</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{img.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subdued)', marginBottom: 8 }}>{img.key}</div>
              <input
                type="text"
                placeholder="Alt text"
                defaultValue={img.alt_text || ''}
                onBlur={(e) => handleAltText(img.key, e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: '0.8125rem',
                  border: '1px solid var(--border-color)', borderRadius: 6,
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  marginBottom: 8, boxSizing: 'border-box',
                }}
              />
              <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', display: 'inline-block' }}>
                {saving === img.key ? 'Uploading...' : 'Upload Photo'}
                <input type="file" accept="image/*" hidden
                  onChange={(e) => e.target.files[0] && handleUpload(img.key, e.target.files[0])} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
