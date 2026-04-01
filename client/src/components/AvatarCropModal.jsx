import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import '../styles/shared.css';
import './AvatarCropModal.css';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function getCroppedBlob(imageSrc, crop) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, size, size
  );

  // Progressively reduce quality until under 5MB
  let quality = 0.92;
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  while (blob.size > MAX_SIZE && quality > 0.1) {
    quality -= 0.1;
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  }

  return blob;
}

export default function AvatarCropModal({ imageSrc, onSave, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await onSave(file);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="crop-overlay" onClick={onCancel}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-header">
          <h3>Crop Profile Photo</h3>
        </div>
        <div className="crop-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="crop-zoom">
          <span className="crop-zoom-label">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="crop-zoom-slider"
          />
        </div>
        <div className="crop-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
