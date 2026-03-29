import { useState, useEffect } from 'react';
import '../styles/shared.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESETS = [
  { label: 'Does not repeat', type: 'none' },
  { label: 'Daily', type: 'daily' },
  { label: 'Weekly', type: 'weekly' },
  { label: 'Monthly', type: 'monthly' },
  { label: 'Weekdays (Mon–Fri)', type: 'weekly', days: '1,2,3,4,5' },
  { label: 'Custom...', type: 'custom' },
];

export default function RecurrencePicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(value.recurrenceType === 'custom');

  const handlePreset = (preset) => {
    if (preset.type === 'custom') {
      setShowCustom(true);
      onChange({
        recurrenceType: 'custom',
        recurrenceInterval: value.recurrenceInterval || 1,
        recurrenceUnit: value.recurrenceUnit || 'week',
        recurrenceDays: null,
        recurrenceEnd: value.recurrenceEnd || null,
      });
      return;
    }

    setShowCustom(false);
    onChange({
      recurrenceType: preset.type,
      recurrenceInterval: 1,
      recurrenceUnit: 'week',
      recurrenceDays: preset.days || null,
      recurrenceEnd: value.recurrenceEnd || null,
    });
  };

  const currentPreset = () => {
    if (value.recurrenceType === 'none') return 'Does not repeat';
    if (value.recurrenceType === 'daily') return 'Daily';
    if (value.recurrenceType === 'weekly' && value.recurrenceDays === '1,2,3,4,5') return 'Weekdays (Mon–Fri)';
    if (value.recurrenceType === 'weekly') return 'Weekly';
    if (value.recurrenceType === 'monthly') return 'Monthly';
    if (value.recurrenceType === 'custom') return 'Custom...';
    return 'Does not repeat';
  };

  const toggleDay = (dayNum) => {
    const current = value.recurrenceDays ? value.recurrenceDays.split(',').map(Number) : [];
    let updated;
    if (current.includes(dayNum)) {
      updated = current.filter(d => d !== dayNum);
    } else {
      updated = [...current, dayNum].sort((a, b) => a - b);
    }
    onChange({
      ...value,
      recurrenceDays: updated.length > 0 ? updated.join(',') : null,
    });
  };

  const selectedDays = value.recurrenceDays ? value.recurrenceDays.split(',').map(Number) : [];

  return (
    <div className="recurrence-picker">
      <div className="form-group">
        <label>Repeat</label>
        <select
          value={currentPreset()}
          onChange={(e) => {
            const preset = PRESETS.find(p => p.label === e.target.value);
            if (preset) handlePreset(preset);
          }}
        >
          {PRESETS.map(p => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Weekly day picker */}
      {value.recurrenceType === 'weekly' && value.recurrenceDays !== '1,2,3,4,5' && (
        <div className="form-group">
          <label>On days</label>
          <div className="day-picker">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                className={`day-btn ${selectedDays.includes(i) ? 'active' : ''}`}
                onClick={() => toggleDay(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom interval */}
      {showCustom && value.recurrenceType === 'custom' && (
        <div className="form-group">
          <label>Every</label>
          <div className="custom-interval">
            <input
              type="number"
              min={1}
              max={365}
              value={value.recurrenceInterval || 1}
              onChange={(e) => onChange({ ...value, recurrenceInterval: Number(e.target.value) || 1 })}
              className="interval-input"
            />
            <select
              value={value.recurrenceUnit || 'week'}
              onChange={(e) => onChange({ ...value, recurrenceUnit: e.target.value })}
            >
              <option value="day">{(value.recurrenceInterval || 1) === 1 ? 'day' : 'days'}</option>
              <option value="week">{(value.recurrenceInterval || 1) === 1 ? 'week' : 'weeks'}</option>
              <option value="month">{(value.recurrenceInterval || 1) === 1 ? 'month' : 'months'}</option>
            </select>
          </div>
        </div>
      )}

      {/* End date (for any recurrence) */}
      {value.recurrenceType !== 'none' && (
        <div className="form-group">
          <label>Ends (optional)</label>
          <input
            type="date"
            value={value.recurrenceEnd || ''}
            onChange={(e) => onChange({ ...value, recurrenceEnd: e.target.value || null })}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}
    </div>
  );
}
