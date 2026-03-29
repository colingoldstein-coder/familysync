import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import RecurrencePicker from '../components/RecurrencePicker';
import EventCard from '../components/EventCard';
import EventForm from '../components/EventForm';
import '../styles/shared.css';
import './Dashboard.css';

const STORAGE_KEY = 'familysync_parent_filters';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function loadFilters() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { tasks: true, requests: true, events: true, completed: false };
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
  const d = new Date(dateStr + 'T00:00:00');
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
  if (item._type === 'request') return item.status === 'accepted' || item.status === 'rejected';
  if (item._type === 'event') return item.status === 'rejected';
  return false;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(loadFilters);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignTo, setTaskAssignTo] = useState('');
  const [taskAssignAll, setTaskAssignAll] = useState(false);
  const [taskRejectable, setTaskRejectable] = useState(false);
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskRecurrence, setTaskRecurrence] = useState({
    recurrenceType: 'none', recurrenceInterval: 1, recurrenceUnit: 'week',
    recurrenceDays: null, recurrenceEnd: null,
  });

  const loadData = async () => {
    try {
      const [tasksData, requestsData, membersData, eventsData] = await Promise.all([
        api.getTasks(), api.getRequests(), api.getFamilyMembers(), api.getEvents(),
      ]);
      setTasks(tasksData.tasks);
      setRequests(requestsData.requests);
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

  const children = members.filter(m => m.role === 'child');

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createTask({
        title: taskTitle, description: taskDesc,
        assignedTo: taskAssignAll ? null : Number(taskAssignTo),
        assignToAll: taskAssignAll, rejectable: taskRejectable,
        deadline: taskDeadline || null, ...taskRecurrence,
      });
      setSuccess('Task created!');
      setShowTaskModal(false);
      setTaskTitle(''); setTaskDesc(''); setTaskAssignTo('');
      setTaskAssignAll(false); setTaskRejectable(false); setTaskDeadline('');
      setTaskRecurrence({ recurrenceType: 'none', recurrenceInterval: 1, recurrenceUnit: 'week', recurrenceDays: null, recurrenceEnd: null });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleRespondRequest = async (id, status) => {
    try {
      await api.respondToRequest(id, status);
      setSuccess(`Request ${status}!`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleDeleteTask = async (id, series = false) => {
    try { await api.deleteTask(id, series); loadData(); }
    catch (err) { setError(err.message); }
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

  const handleRespondEvent = async (id, data) => {
    try {
      await api.respondToEvent(id, data);
      setSuccess(`Event ${data.status}!`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleDeleteEvent = async (id, series = false) => {
    try { await api.deleteEvent(id, series); loadData(); }
    catch (err) { setError(err.message); }
  };

  // Build unified timeline items
  const allItems = [];

  if (filters.tasks) {
    tasks.forEach(t => {
      if (!filters.completed && isCompleted({ ...t, _type: 'task' })) return;
      allItems.push({ ...t, _type: 'task' });
    });
  }

  if (filters.requests) {
    requests.forEach(r => {
      if (!filters.completed && isCompleted({ ...r, _type: 'request' })) return;
      allItems.push({ ...r, _type: 'request' });
    });
  }

  if (filters.events) {
    events.forEach(e => {
      if (!filters.completed && isCompleted({ ...e, _type: 'event' })) return;
      allItems.push({ ...e, _type: 'event' });
    });
  }

  // Sort by date
  allItems.sort((a, b) => {
    const da = getSortDate(a);
    const db = getSortDate(b);
    if (da === db) return 0;
    return da < db ? -1 : 1;
  });

  // Group by date
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

  const taskCount = tasks.length;
  const requestCount = requests.length;
  const eventCount = events.length;

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'rejected');
  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>Welcome back, {user.name}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-small" onClick={() => setShowTaskModal(true)}>+ New Task</button>
            <button className="btn btn-primary btn-small" onClick={() => setShowEventForm(true)}>+ New Event</button>
          </div>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{activeTasks.length}</div>
          <div className="stat-label">Active Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingRequests.length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{events.filter(e => e.status !== 'rejected').length}</div>
          <div className="stat-label">Events</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="filter-bar-label">Show:</span>
        <label className="filter-check">
          <input type="checkbox" checked={filters.tasks} onChange={() => updateFilters('tasks')} />
          <span>Tasks <span className="filter-count">({taskCount})</span></span>
        </label>
        <label className="filter-check">
          <input type="checkbox" checked={filters.requests} onChange={() => updateFilters('requests')} />
          <span>Requests <span className="filter-count">({requestCount})</span></span>
        </label>
        <label className="filter-check">
          <input type="checkbox" checked={filters.events} onChange={() => updateFilters('events')} />
          <span>Events <span className="filter-count">({eventCount})</span></span>
        </label>
        <label className="filter-check">
          <input type="checkbox" checked={filters.completed} onChange={() => updateFilters('completed')} />
          <span>Completed</span>
        </label>
      </div>

      {/* Timeline */}
      {allItems.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing to show</h3>
          <p>{!filters.tasks && !filters.requests && !filters.events ? 'Select a category above' : 'Create a task or event to get started'}</p>
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
                <TimelineItem
                  key={`${item._type}-${item.id}`}
                  item={item}
                  userRole="parent"
                  onUpdateTask={handleDeleteTask}
                  onRespondRequest={handleRespondRequest}
                  onRespondEvent={handleRespondEvent}
                  onDeleteTask={handleDeleteTask}
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
          userRole="parent"
          onSubmit={handleCreateEvent}
          onCancel={() => setShowEventForm(false)}
        />
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" placeholder="e.g. Hang up the laundry" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea placeholder="Any extra details..." value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label>Deadline (optional)</label>
                <input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <div className="checkbox-group">
                  <input type="checkbox" id="assignAll" checked={taskAssignAll} onChange={(e) => setTaskAssignAll(e.target.checked)} />
                  <label htmlFor="assignAll">Assign to all children</label>
                </div>
              </div>
              {!taskAssignAll && (
                <div className="form-group">
                  <label>Assign to</label>
                  <select value={taskAssignTo} onChange={(e) => setTaskAssignTo(e.target.value)} required={!taskAssignAll}>
                    <option value="">Select a child...</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <div className="checkbox-group">
                  <input type="checkbox" id="rejectable" checked={taskRejectable} onChange={(e) => setTaskRejectable(e.target.checked)} />
                  <label htmlFor="rejectable">Allow child to reject this task</label>
                </div>
              </div>
              <RecurrencePicker value={taskRecurrence} onChange={setTaskRecurrence} />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function TimelineItem({ item, userRole, onRespondRequest, onRespondEvent, onDeleteTask, onDeleteEvent }) {
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
              <span className={`badge badge-${item.status}`}>{item.status}</span>
            </div>
          </div>
          <div className="timeline-summary">
            {item.event_date && <span className="timeline-time">{formatTime(item.event_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</span>}
            {item.description && <span>{item.description}</span>}
            {item.location_name && <span className="timeline-location">{item.location_name}</span>}
            {item.requested_by_name && <span>From: <strong>{item.requested_by_name}</strong></span>}
            {formatRecurrence(item) && <span className="meta-tag recurrence-tag">{formatRecurrence(item)}</span>}
          </div>
          {item.status === 'pending' && userRole === 'parent' && (
            <EventCard
              event={item}
              userRole="parent"
              onRespond={onRespondEvent}
              onDelete={onDeleteEvent}
            />
          )}
          {item.status !== 'pending' && (
            <div className="timeline-actions">
              <button className="btn btn-danger btn-small" onClick={() => onDeleteEvent(item.id)}>Delete</button>
              {item.series_id && <button className="btn btn-danger btn-small" onClick={() => onDeleteEvent(item.id, true)}>Delete Series</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (item._type === 'request') {
    return (
      <div className={`timeline-item ${completed ? 'completed' : ''}`}>
        <div className="timeline-type-indicator type-request" />
        <div className="timeline-content">
          <div className="timeline-top-row">
            <span className="timeline-title">{item.title}</span>
            <div className="timeline-badges">
              <span className="timeline-category cat-request">Request</span>
              <span className={`badge badge-${item.status}`}>{item.status}</span>
            </div>
          </div>
          <div className="timeline-summary">
            {item.description && <span>{item.description}</span>}
            <span>From: <strong>{item.requested_by_name}</strong></span>
            {item.request_to_all && <span>To: <strong>All Parents</strong></span>}
            {item.accepted_by_name && <span>Accepted by: <strong>{item.accepted_by_name}</strong></span>}
            {formatRecurrence(item) && <span className="meta-tag recurrence-tag">{formatRecurrence(item)}</span>}
          </div>
          {item.status === 'pending' && (
            <div className="timeline-actions">
              <button className="btn btn-primary btn-small" onClick={() => onRespondRequest(item.id, 'accepted')}>Accept</button>
              <button className="btn btn-danger btn-small" onClick={() => onRespondRequest(item.id, 'rejected')}>Reject</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Task
  return (
    <div className={`timeline-item ${completed ? 'completed' : ''}`}>
      <div className="timeline-type-indicator type-task" />
      <div className="timeline-content">
        <div className="timeline-top-row">
          <span className="timeline-title">{item.title}</span>
          <div className="timeline-badges">
            <span className="timeline-category cat-task">Task</span>
            <span className={`badge badge-${item.status}`}>{item.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="timeline-summary">
          {item.description && <span>{item.description}</span>}
          <span>Assigned to: <strong>{item.assigned_to_name}</strong></span>
          {item.rejectable ? <span className="meta-tag">Rejectable</span> : null}
          {item.deadline && <span>Due: <strong>{new Date(item.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong></span>}
          {formatRecurrence(item) && <span className="meta-tag recurrence-tag">{formatRecurrence(item)}</span>}
        </div>
        <div className="timeline-actions">
          <button className="btn btn-danger btn-small" onClick={() => onDeleteTask(item.id)}>Delete</button>
          {item.series_id && <button className="btn btn-danger btn-small" onClick={() => onDeleteTask(item.id, true)}>Delete Series</button>}
        </div>
      </div>
    </div>
  );
}
