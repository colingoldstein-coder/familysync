const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatRecurrence(item) {
  const type = item.recurrence_type;
  if (!type || type === 'none') return null;
  const interval = item.recurrence_interval || 1;
  const unit = item.recurrence_unit || 'week';
  if (type === 'daily') return interval === 1 ? 'Daily' : `Every ${interval} days`;
  if (type === 'weekly') {
    const days = item.recurrence_days;
    if (days === '1,2,3,4,5') return 'Weekdays';
    if (days) {
      const dayLabels = days.split(',').map(d => DAY_NAMES[Number(d)]).join(', ');
      return interval === 1 ? `Weekly (${dayLabels})` : `Every ${interval} weeks (${dayLabels})`;
    }
    return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
  }
  if (type === 'monthly') return interval === 1 ? 'Monthly' : `Every ${interval} months`;
  if (type === 'custom') {
    const unitLabel = interval === 1 ? unit : unit + 's';
    return `Every ${interval === 1 ? '' : interval + ' '}${unitLabel}`;
  }
  return null;
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

export function getSortDate(item) {
  if (item._type === 'event') return item.event_date || '9999-99-99';
  if (item._type === 'task') return item.deadline || '9999-99-99';
  return '9999-99-99';
}

export function getDateLabel(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr);
  const plain = str.includes('T') ? str.split('T')[0] : str.slice(0, 10);
  const d = new Date(plain + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  const formatted = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  if (diff < 0) return { text: `Overdue — ${formatted}`, className: 'overdue' };
  if (diff === 0) return { text: `Today — ${formatted}`, className: 'today' };
  if (diff === 1) return { text: `Tomorrow — ${formatted}`, className: '' };
  return { text: formatted, className: '' };
}

export function isCompleted(item) {
  if (item._type === 'task') return item.status === 'completed' || item.status === 'rejected';
  if (item._type === 'event') return item.status === 'rejected';
  return false;
}

export function loadFilters(storageKey, defaults) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore parse errors */ }
  return defaults;
}

export function saveFilters(storageKey, filters) {
  localStorage.setItem(storageKey, JSON.stringify(filters));
}
