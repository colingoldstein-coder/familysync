import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import EventForm from '../components/EventForm';
import '../styles/shared.css';
import './Dashboard.css';

const STORAGE_KEY = 'familysync_child_filters';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function loadFilters() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore parse errors */ }
  return { tasks: true, events: true, completed: false };
}

function saveFilters(filters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

function formatRecurrence(item) {
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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function getSortDate(item) {
  if (item._type === 'event') return item.event_date || '9999-99-99';
  if (item._type === 'task') return item.deadline || '9999-99-99';
  return '9999-99-99';
}

function getDateLabel(dateStr) {
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

function isCompleted(item) {
  if (item._type === 'task') return item.status === 'completed' || item.status === 'rejected';
  if (item._type === 'event') return item.status === 'rejected';
  return false;
}

export default function ChildDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(loadFilters);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const [tasksData, membersData, eventsData] = await Promise.all([
        api.getTasks(), api.getFamilyMembers(), api.getEvents(),
      ]);
      setTasks(tasksData.tasks);
      setMembers(membersData.members);
      setEvents(eventsData.events);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateFilters = (key) => {
    setFilters(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveFilters(next);
      return next;
    });
  };

  const handleUpdateTask = async (id, status) => {
    try {
      await api.updateTaskStatus(id, status);
      const displayStatus = status === 'rejected' ? 'declined' : status;
      setSuccess(`Task ${displayStatus}!`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleCreateEvent = async (data) => {
    setError('');
    try {
      await api.createEvent(data);
      setSuccess('Event created!');
      setShowEventForm(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleDeleteEvent = async (id, series = false) => {
    try { await api.deleteEvent(id, series); loadData(); }
    catch (err) { setError(err.message); }
  };

  // Build unified timeline
  const allItems = [];

  if (filters.tasks) {
    tasks.forEach(t => {
      if (!filters.completed && isCompleted({ ...t, _type: 'task' })) return;
      allItems.push({ ...t, _type: 'task' });
    });
  }

  if (filters.events) {
    events.forEach(e => {
      if (!filters.completed && isCompleted({ ...e, _type: 'event' })) return;
      allItems.push({ ...e, _type: 'event' });
    });
  }

  allItems.sort((a, b) => {
    const da = getSortDate(a);
    const db = getSortDate(b);
    if (da === db) return 0;
    return da < db ? -1 : 1;
  });

  const groups = [];
  let lastDate = null;
  allItems.forEach(item => {
    const date = getSortDate(item);
    const dateKey = date === '9999-99-99' ? '__none__' : date;
    if (dateKey !== lastDate) {
      groups.push({ dateKey, items: [] });
      lastDate = dateKey;
    }
    groups[groups.length - 1].items.push(item);
  });

  const pendingTasks = tasks.filter(t => t.status === 'accepted' || t.status === 'in_progress');

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>Hey, {user.name}!</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-small" onClick={() => setShowEventForm(true)}>+ New Event</button>
          </div>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="summary-bar">
        <div className="summary-counts">
          <span className="summary-item"><strong>{tasks.filter(t => t.status === 'pending').length}</strong> Requests</span>
          <span className="summary-sep" />
          <span className="summary-item"><strong>{pendingTasks.length}</strong> Active Tasks</span>
          <span className="summary-sep" />
          <span className="summary-item"><strong>{events.filter(e => e.status !== 'rejected').length}</strong> Events</span>
          {filters.completed && (
            <>
              <span className="summary-sep" />
              <span className="summary-item"><strong>{tasks.filter(t => isCompleted({ ...t, _type: 'task' })).length + events.filter(e => e.status === 'rejected').length}</strong> Completed</span>
            </>
          )}
        </div>
        <button className={`filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(f => !f)} title="Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
      </div>
      {showFilters && (
        <div className="filter-bar">
          <label className="filter-check">
            <input type="checkbox" checked={filters.tasks} onChange={() => updateFilters('tasks')} />
            <span>Requests &amp; Tasks</span>
          </label>
          <label className="filter-check">
            <input type="checkbox" checked={filters.events} onChange={() => updateFilters('events')} />
            <span>Events</span>
          </label>
          <label className="filter-check">
            <input type="checkbox" checked={filters.completed} onChange={() => updateFilters('completed')} />
            <span>Completed</span>
          </label>
        </div>
      )}

      {/* Timeline */}
      {allItems.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing to show</h3>
          <p>{!filters.tasks && !filters.requests && !filters.events ? 'Select a category above' : "You're all caught up!"}</p>
        </div>
      ) : (
        groups.map(group => {
          const label = group.dateKey === '__none__'
            ? { text: 'No date set', className: 'no-date' }
            : getDateLabel(group.dateKey);
          return (
            <div key={group.dateKey} className="timeline-group">
              <div className={`timeline-date ${label.className}`}>{label.text}</div>
              {group.items.map(item => (
                <ChildTimelineItem
                  key={`${item._type}-${item.id}`}
                  item={item}
                  onUpdateTask={handleUpdateTask}
                  onDeleteEvent={handleDeleteEvent}
                />
              ))}
            </div>
          );
        })
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <EventForm
          members={members}
          userRole="child"
          onSubmit={handleCreateEvent}
          onCancel={() => setShowEventForm(false)}
        />
      )}

    </div>
  );
}

function ChildTimelineItem({ item, onUpdateTask, onDeleteEvent }) {
  const completed = isCompleted(item);

  if (item._type === 'event') {
    return (
      <div className={`timeline-item ${completed ? 'completed' : ''}`}>
        <div className="timeline-type-indicator type-event" />
        <div className="timeline-content">
          <div className="timeline-top-row">
            <span className="timeline-title">{item.title}</span>
            <div className="timeline-badges">
              <span className="timeline-category cat-event">Event</span>
              <span className={`badge badge-${item.status}`}>{item.status === 'rejected' ? 'declined' : item.status}</span>
            </div>
          </div>
          <div className="timeline-summary">
            {item.event_date && <span className="timeline-time">{formatTime(item.event_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</span>}
            {item.description && <span>{item.description}</span>}
            {item.location_name && <span className="timeline-location">{item.location_name}</span>}
            {item.accepted_by_name && <span>Accepted by: <strong>{item.accepted_by_name}</strong></span>}
            {formatRecurrence(item) && <span className="meta-tag recurrence-tag">{formatRecurrence(item)}</span>}
          </div>
          <div className="timeline-actions">
            <button className="btn btn-danger btn-small" onClick={() => onDeleteEvent(item.id)}>Delete</button>
            {item.series_id && <button className="btn btn-danger btn-small" onClick={() => onDeleteEvent(item.id, true)}>Delete Series</button>}
          </div>
        </div>
      </div>
    );
  }

  // Task (shown as "Request" when pending, "Task" when accepted+)
  const isRequest = item.status === 'pending';
  return (
    <div className={`timeline-item ${completed ? 'completed' : ''}`}>
      <div className={`timeline-type-indicator ${isRequest ? 'type-request' : 'type-task'}`} />
      <div className="timeline-content">
        <div className="timeline-top-row">
          <span className="timeline-title">{item.title}</span>
          <div className="timeline-badges">
            <span className={`timeline-category ${isRequest ? 'cat-request' : 'cat-task'}`}>{isRequest ? 'Request' : 'Task'}</span>
            <span className={`badge badge-${item.status}`}>{item.status === 'rejected' ? 'declined' : item.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="timeline-summary">
          {item.description && <span>{item.description}</span>}
          <span>From: <strong>{item.assigned_by_name}</strong></span>
          {item.deadline && <span>Due: <strong>{(() => { const s = String(item.deadline); const p = s.includes('T') ? s.split('T')[0] : s.slice(0, 10); return new Date(p + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); })()}</strong></span>}
          {formatRecurrence(item) && <span className="meta-tag recurrence-tag">{formatRecurrence(item)}</span>}
        </div>
        {!completed && (
          <div className="timeline-actions">
            {item.status === 'pending' && (
              <>
                <button className="btn btn-primary btn-small" onClick={() => onUpdateTask(item.id, 'accepted')}>Accept</button>
                {item.rejectable === 1 && (
                  <button className="btn btn-danger btn-small" onClick={() => onUpdateTask(item.id, 'rejected')}>Decline</button>
                )}
              </>
            )}
            {item.status === 'accepted' && (
              <button className="btn btn-primary btn-small" onClick={() => onUpdateTask(item.id, 'in_progress')}>Start Working</button>
            )}
            {(item.status === 'accepted' || item.status === 'in_progress') && (
              <button className="btn btn-primary btn-small" onClick={() => onUpdateTask(item.id, 'completed')}>Mark Done</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
