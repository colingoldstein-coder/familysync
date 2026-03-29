import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import RecurrencePicker from '../components/RecurrencePicker';
import EventCard from '../components/EventCard';
import EventForm from '../components/EventForm';
import '../styles/shared.css';
import './Dashboard.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRecurrence(task) {
  const type = task.recurrence_type;
  if (!type || type === 'none') return null;

  const interval = task.recurrence_interval || 1;
  const unit = task.recurrence_unit || 'week';

  if (type === 'daily') {
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }
  if (type === 'weekly') {
    const days = task.recurrence_days;
    if (days === '1,2,3,4,5') return 'Weekdays';
    if (days) {
      const dayLabels = days.split(',').map(d => DAY_NAMES[Number(d)]).join(', ');
      return interval === 1 ? `Weekly (${dayLabels})` : `Every ${interval} weeks (${dayLabels})`;
    }
    return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
  }
  if (type === 'monthly') {
    return interval === 1 ? 'Monthly' : `Every ${interval} months`;
  }
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

export default function ParentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
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

  const children = members.filter(m => m.role === 'child');

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createTask({
        title: taskTitle,
        description: taskDesc,
        assignedTo: taskAssignAll ? null : Number(taskAssignTo),
        assignToAll: taskAssignAll,
        rejectable: taskRejectable,
        deadline: taskDeadline || null,
        ...taskRecurrence,
      });
      setSuccess('Task created!');
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignTo('');
      setTaskAssignAll(false);
      setTaskRejectable(false);
      setTaskDeadline('');
      setTaskRecurrence({ recurrenceType: 'none', recurrenceInterval: 1, recurrenceUnit: 'week', recurrenceDays: null, recurrenceEnd: null });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRespondRequest = async (id, status) => {
    try {
      await api.respondToRequest(id, status);
      setSuccess(`Request ${status}!`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (id, series = false) => {
    try {
      await api.deleteTask(id, series);
      loadData();
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

  const handleRespondEvent = async (id, data) => {
    try {
      await api.respondToEvent(id, data);
      setSuccess(`Event ${data.status}!`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pendingEvents = events.filter(e => e.status === 'pending');
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const upcomingEvents = events.filter(e => e.status !== 'rejected');
  const pastEvents = events.filter(e => e.status === 'rejected');

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome back, {user.name}</h1>
        <p>Manage your family's tasks and requests</p>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{activeTasks.length}</div>
          <div className="stat-label">Active Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingRequests.length}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{completedTasks.length}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          Tasks
        </button>
        <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          Help Requests {pendingRequests.length > 0 && <span className="tab-badge">{pendingRequests.length}</span>}
        </button>
        <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          Events {pendingEvents.length > 0 && <span className="tab-badge">{pendingEvents.length}</span>}
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <>
          <div className="section-header">
            <h2>Tasks</h2>
            <button className="btn btn-primary btn-small" onClick={() => setShowTaskModal(true)}>
              + New Task
            </button>
          </div>

          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks yet</h3>
              <p>Create a task to get your family organized</p>
            </div>
          ) : (
            <div className="card-grid">
              {activeTasks.map(task => (
                <div key={task.id} className="card task-card">
                  <div className="task-header">
                    <div>
                      <h3 className="task-title">{task.title}</h3>
                      {task.description && <p className="task-desc">{task.description}</p>}
                    </div>
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                  </div>
                  <div className="task-meta">
                    <span>Assigned to: <strong>{task.assigned_to_name}</strong></span>
                    {task.rejectable ? <span className="meta-tag">Rejectable</span> : null}
                    {task.deadline && (() => {
                      const dl = formatDeadline(task.deadline);
                      return <span className={`meta-tag ${dl.className}`}>{dl.text}</span>;
                    })()}
                    {formatRecurrence(task) && (
                      <span className="meta-tag recurrence-tag">{formatRecurrence(task)}</span>
                    )}
                  </div>
                  <div className="task-actions">
                    <button className="btn btn-danger btn-small" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                    {task.series_id && (
                      <button className="btn btn-danger btn-small" onClick={() => handleDeleteTask(task.id, true)}>Delete Series</button>
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
                    <span className="badge badge-completed">completed</span>
                  </div>
                  <div className="task-meta">
                    <span>Done by: <strong>{task.assigned_to_name}</strong></span>
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
            <h2>Help Requests</h2>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">
              <h3>No requests yet</h3>
              <p>Your children's help requests will appear here</p>
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
                    <span>From: <strong>{req.requested_by_name}</strong></span>
                    {req.request_to_all ? <span className="meta-tag">All Parents</span> : null}
                    {req.accepted_by_name && <span>Accepted by: <strong>{req.accepted_by_name}</strong></span>}
                    {formatRecurrence(req) && (
                      <span className="meta-tag recurrence-tag">{formatRecurrence(req)}</span>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="task-actions">
                      <button className="btn btn-primary btn-small" onClick={() => handleRespondRequest(req.id, 'accepted')}>
                        Accept
                      </button>
                      <button className="btn btn-danger btn-small" onClick={() => handleRespondRequest(req.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  )}
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
            <h2>Events</h2>
            <button className="btn btn-primary btn-small" onClick={() => setShowEventForm(true)}>
              + New Event
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="empty-state">
              <h3>No events yet</h3>
              <p>Events from your family will appear here</p>
            </div>
          ) : (
            <div className="card-grid">
              {upcomingEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  userRole="parent"
                  onRespond={handleRespondEvent}
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
                <input
                  type="text"
                  placeholder="e.g. Hang up the laundry"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  placeholder="Any extra details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Deadline (optional)</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="assignAll"
                    checked={taskAssignAll}
                    onChange={(e) => setTaskAssignAll(e.target.checked)}
                  />
                  <label htmlFor="assignAll">Assign to all children</label>
                </div>
              </div>

              {!taskAssignAll && (
                <div className="form-group">
                  <label>Assign to</label>
                  <select
                    value={taskAssignTo}
                    onChange={(e) => setTaskAssignTo(e.target.value)}
                    required={!taskAssignAll}
                  >
                    <option value="">Select a child...</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="rejectable"
                    checked={taskRejectable}
                    onChange={(e) => setTaskRejectable(e.target.checked)}
                  />
                  <label htmlFor="rejectable">Allow child to reject this task</label>
                </div>
              </div>

              <RecurrencePicker value={taskRecurrence} onChange={setTaskRecurrence} />

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
