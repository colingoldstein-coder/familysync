import { useState } from 'react';
import './PasswordInput.css';

function getStrength(password) {
  if (!password) return { score: 0, checks: [] };
  const checks = [
    { label: '10+ characters', met: password.length >= 10 },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.met).length;
  return { score, checks };
}

export default function PasswordInput({ value, onChange, placeholder = 'Password', required = true, showStrength = false }) {
  const [visible, setVisible] = useState(false);
  const { score, checks } = showStrength ? getStrength(value) : { score: 0, checks: [] };

  return (
    <div className="password-input-wrap">
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
      {showStrength && value && (
        <div className="password-strength">
          <div className="password-strength-bar">
            <div
              className={`password-strength-fill strength-${score}`}
              style={{ width: `${(score / 4) * 100}%` }}
            />
          </div>
          <ul className="password-checks">
            {checks.map(c => (
              <li key={c.label} className={c.met ? 'met' : ''}>
                {c.met ? '✓' : '○'} {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
