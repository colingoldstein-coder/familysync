import { useState, useRef, useEffect } from 'react';
import './ColorPalettePicker.css';

// Google Docs / Sheets style colour palette
const PALETTE = [
  // Row 1 – blacks / greys / white
  ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
  // Row 2 – saturated
  ['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
  // Row 3 – light tints
  ['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
  // Row 4
  ['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
  // Row 5
  ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
  // Row 6
  ['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  // Row 7 – dark shades
  ['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47'],
  // Row 8
  ['#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'],
];

export default function ColorPalettePicker({ onSelect, onOpen }) {
  const [open, setOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState('#e0e0e0');
  const [showCustom, setShowCustom] = useState(false);
  const wrapRef = useRef(null);
  const colorInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = (e) => {
    e.preventDefault();
    if (!open && onOpen) onOpen();
    setOpen(!open);
    setShowCustom(false);
  };

  const handlePickColor = (color) => {
    setCurrentColor(color);
    setOpen(false);
    onSelect(color);
  };

  const handleCustomClick = (e) => {
    e.preventDefault();
    setShowCustom(true);
    // Use requestAnimationFrame to ensure React has flushed the DOM update
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        colorInputRef.current?.click();
      });
    });
  };

  const handleCustomChange = (e) => {
    const color = e.target.value;
    setCurrentColor(color);
    setOpen(false);
    setShowCustom(false);
    onSelect(color);
  };

  return (
    <div className="color-palette-wrap" ref={wrapRef}>
      <button
        type="button"
        className="rte-btn color-palette-trigger"
        title="Font Colour"
        onMouseDown={handleToggle}
      >
        A<span className="rte-color-swatch" style={{ backgroundColor: currentColor }} />
      </button>

      {open && (
        <div className="color-palette-dropdown">
          <div className="color-palette-grid">
            {PALETTE.map((row, ri) => (
              <div key={ri} className="color-palette-row">
                {row.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-palette-cell${color === currentColor ? ' active' : ''}`}
                    style={{ backgroundColor: color }}
                    title={color}
                    onMouseDown={(e) => { e.preventDefault(); handlePickColor(color); }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="color-palette-custom">
            <button
              type="button"
              className="color-palette-custom-btn"
              onMouseDown={handleCustomClick}
            >
              Custom colour...
            </button>
            {showCustom && (
              <input
                ref={colorInputRef}
                type="color"
                className="color-palette-custom-input"
                value={currentColor}
                onChange={handleCustomChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
