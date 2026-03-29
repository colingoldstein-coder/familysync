import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import RecurrencePicker from '../components/RecurrencePicker';
import EventCard from '../components/EventCard';
import EventForm from '../components/EventForm';
import CalendarSync from '../components/CalendarSync';
import '../styles/shared.css';
import './Dashboard.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  const deadline = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  const formatted = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (diffDays < 0) return { text: `Overdue (${formatted})`, className: 'deadline-overdue' };
  if (diffDays === 0) return { text: `Due today`, className: 'deadline-today' };
  if (diffDays === 1) return { text: `Due tomorrow`, className: 'deadline-soon' };
  if (diffDays <= 3) return { text: `Due ${formatted}`, className: 'deadline-soon' };
  return { text: `Due ${formatted}`, className: 'deadline-normal' };
}

export default function ChildDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Request form
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqTo, setReqTo] = useState('');
  const [reqToAll, setReqToAll] = useState(false);
  const [reqRecurrence, setReqRecurrence] = useState({
    recurrenceType: 'none', recurrenceInterval: 1, recurrenceUnit: 'week',
    recurrenceDays: null, recurrenceEnd: null,
  });

  const loadData = async () => {
    try {
      const [tasksData, requestsData, membersData, eventsData] = await Promise.all([
        api.getTasks(),
        api.getRequests(),
        api.getFamilyMembers(),
        api.getEvents(),
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

  const parents = members.filter(m => m.role === 'parent');

  const handleUpdateTask = async (id, status) => {
    try {
      await api.updateTaskStatus(id, status);
      setSuccess(`Task ${status}!`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createRequest({
        title: reqTitle,
        description: reqDesc,
        requestedTo: reqToAll ? null : Number(reqTo),
        requestToAll: reqToAll,
        ...reqRecurrence,
      });
      setSuccess('Request sent!');
      setShowRequestModal(false);
      setReqTitle('');
      setReqDesc('');
      setReqTo('');
      setReqToAll(false);
      setReqRecurrence({ recurrenceType: 'none', recurrenceInterval: 1, recurrenceUnit: 'week', recurrenceDays: null, recurrenceEnd: null });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateEvent = async (data) => {
    setError('');
    try {
      await api.createEvent(data);
      setSuccess('Event created!');
      setShowEventForm(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (id, series = false) => {
    try {
      await api.deleteEvent(id, series);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'accepted' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'rejected');
  const myEvents = events;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Hey, {user.name}!</h1>
        <p>Here's what's going on</p>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{pendingTasks.length}</div>
          <div className="stat-label">Active Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{requests.filter(r => r.status === 'pending').length}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{completedTasks.length}</div>
          <div className="stat-label">Done</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          My Tasks {pendingTasks.length > 0 && <span className="tab-badge">{pendingTasks.length}</span>}
        </button>
        <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          My Requests
        </button>
        <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          Events {myEvents.filter(e => e.status === 'pending').length > 0 && <span className="tab-badge">{myEvents.filter(e => e.status === 'pending').length}</span>}
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <>
          <div className="section-header">
            <h2>Your Tasks</h2>
          </div>

          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks!</h3>
              <p>You're all caught up</p>
            </div>
          ) : (
            <div className="card-grid">
              {pendingTasks.map(task => (
                <div key={task.id} className="card task-card">
                  <div className="task-header">
                    <div>
                      <h3 className="task-title">{task.title}</h3>
                      {task.description && <p className="task-desc">{task.description}</p>}
                    </div>
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                  </div>
                  <div className="task-meta">
                    <span>From: <strong>{task.assigned_by_name}</strong></span>
                    {task.deadline && (() => {
                      const dl = formatDeadline(task.deadline);
                      return <span className={`meta-tag ${dl.className}`}>{dl.text}</span>;
                    })()}
                    {formatRecurrence(task) && (
                      <span className="meta-tag recurrence-tag">{formatRecurrence(task)}</span>
                    )}
                  </div>
                  <div className="task-actions">
                    {task.status === 'pending' && (
                      <>
                        <button className="btn btn-primary btn-small" onClick={() => handleUpdateTask(task.id, 'accepted')}>
                          Accept
                        </button>
                        {task.rejectable === 1 && (
                          <button className="btn btn-danger btn-small" onClick={() => handleUpdateTask(task.id, 'rejected')}>
                            Reject
                          </button>
                        )}
                      </>
                    )}
                    {task.status === 'accepted' && (
                      <button className="btn btn-primary btn-small" onClick={() => handleUpdateTask(task.id, 'in_progress')}>
                        Start Working
                      </button>
                    )}
                    {(task.status === 'accepted' || task.status === 'in_progress') && (
                      <button className="btn btn-primary btn-small" onClick={() => handleUpdateTask(task.id, 'completed')}>
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {completedTasks.map(task => (
                <div key={task.id} className="card task-card completed">
                  <div className="task-header">
                    <div>
                      <h3 className="task-title">{task.title}</h3>
                    </div>
                    <span className={`badge badge-${task.status}`}>{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <>
          <div className="section-header">
            <h2>Your Requests</h2>
            <button className="btn btn-primary btn-small" onClick={() => setShowRequestModal(true)}>
              + Ask for Help
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">
              <h3>No requests yet</h3>
              <p>Need a lift somewhere? Ask your parents!</p>
            </div>
          ) : (
            <div className="card-grid">
              {requests.map(req => (
                <div key={req.id} className="card request-card">
                  <div className="task-header">
                    <div>
                      <h3 className="task-title">{req.title}</h3>
                      {req.description && <p className="task-desc">{req.description}</p>}
                    </div>
                    <span className={`badge badge-${req.status}`}>{req.status}</span>
                  </div>
                  <div className="task-meta">
                    {req.request_to_all ? (
                      <span>Sent to: <strong>All Parents</strong></span>
                    ) : (
                      <span>Sent to: <strong>{req.requested_to_name}</strong></span>
                    )}
                    {req.accepted_by_name && <span>Accepted by: <strong>{req.accepted_by_name}</strong></span>}
                    {formatRecurrence(req) && (
                      <span className="meta-tag recurrence-tag">{formatRecurrence(req)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <>
          <div className="section-header">
            <h2>Your Events</h2>
            <button className="btn btn-primary btn-small" onClick={() => setShowEventForm(true)}>
              + New Event
            </button>
          </div>

          {myEvents.length === 0 ? (
            <div className="empty-state">
              <h3>No events yet</h3>
              <p>Need a lift? Create an event!</p>
            </div>
          ) : (
            <div className="card-grid">
              {myEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  userRole="child"
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}
        </>
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

      {/* Create Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Ask for Help</h2>
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>What do you need?</label>
                <input
                  type="text"
                  placeholder="e.g. Lift to Sarah's party"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Details (optional)</label>
                <textarea
                  placeholder="When, where, any extra info..."
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="reqAll"
                    checked={reqToAll}
                    onChange={(e) => setReqToAll(e.target.checked)}
                  />
                  <label htmlFor="reqAll">Ask both parents</label>
                </div>
              </div>

              {!reqToAll && (
                <div className="form-group">
                  <label>Ask who?</label>
                  <select
                    value={reqTo}
                    onChange={(e) => setReqTo(e.target.value)}
                    required={!reqToAll}
                  >
                    <option value="">Select a parent...</option>
                    {parents.map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <RecurrencePicker value={reqRecurrence} onChange={setReqRecurrence} />

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CalendarSync />
    </div>
  );
}
