import { useState } from 'react';
import '../styles/shared.css';

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

const EVENT_TYPE_LABELS = {
  drop_off: 'Drop-off',
  pick_up: 'Pick-up',
  both: 'Drop-off & Pick-up',
};

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  const str = String(dateStr);
  const plain = str.includes('T') ? str.split('T')[0] : str.slice(0, 10);
  const d = new Date(plain + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function subtractMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - mins;
  const newH = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const newM = ((total % 60) + 60) % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor((total % 1440) / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function EventCard({ event, userRole, onRespond, onDelete }) {
  const [showRespond, setShowRespond] = useState(false);
  const [travelBefore, setTravelBefore] = useState(15);
  const [travelAfter, setTravelAfter] = useState(15);
  const [parentNotes, setParentNotes] = useState('');

  const isPending = event.status === 'pending';
  const isAccepted = event.status === 'accepted';
  const endTime = event.end_time || event.event_time;

  const handleAccept = () => {
    onRespond(event.id, {
      status: 'accepted',
      travelTimeBefore: travelBefore,
      travelTimeAfter: travelAfter,
      parentNotes: parentNotes || undefined,
    });
    setShowRespond(false);
  };

  // Calculate busy window
  const busyFrom = isAccepted && event.travel_time_before
    ? subtractMinutes(event.event_time, event.travel_time_before)
    : null;
  const busyUntil = isAccepted && event.travel_time_after
    ? addMinutes(endTime, event.travel_time_after)
    : null;

  return (
    <div className={`card event-card ${event.status === 'rejected' ? 'rejected' : ''}`}>
      <div className="event-header">
        <div>
          <h3 className="task-title">{event.title}</h3>
          <div className="event-datetime">
            {formatDate(event.event_date)} at {formatTime(event.event_time)}
            {event.end_time && ` – ${formatTime(event.end_time)}`}
          </div>
        </div>
        <div className="event-badges">
          <span className={`badge badge-${event.status}`}>{event.status === 'rejected' ? 'declined' : event.status}</span>
          <span className="meta-tag event-type-tag">{EVENT_TYPE_LABELS[event.event_type]}</span>
          {formatRecurrence(event) && (
            <span className="meta-tag recurrence-tag">{formatRecurrence(event)}</span>
          )}
        </div>
      </div>

      {event.description && <p className="task-desc">{event.description}</p>}

      {(event.location_name || event.location_address) && (
        <div className="event-location">
          <span className="location-icon">&#128205;</span>
          <div>
            {event.location_name && <strong>{event.location_name}</strong>}
            {event.location_address && (
              <a
                href={mapsUrl(event.location_address)}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-link"
              >
                {event.location_address}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="task-meta">
        <span>From: <strong>{event.requested_by_name}</strong></span>
        {event.request_to_all ? (
          <span>To: <strong>All Parents</strong></span>
        ) : event.requested_to_name ? (
          <span>To: <strong>{event.requested_to_name}</strong></span>
        ) : null}
        {event.accepted_by_name && <span>Accepted by: <strong>{event.accepted_by_name}</strong></span>}
      </div>

      {/* Busy window for accepted events */}
      {isAccepted && (busyFrom || busyUntil) && (
        <div className="busy-window">
          <span className="busy-icon">&#128338;</span>
          <span>
            Busy {busyFrom ? `from ${formatTime(busyFrom)}` : `from ${formatTime(event.event_time)}`}
            {' '}until {busyUntil ? formatTime(busyUntil) : formatTime(endTime)}
          </span>
          {event.travel_time_before > 0 && (
            <span className="meta-tag">{event.travel_time_before}min travel before</span>
          )}
          {event.travel_time_after > 0 && (
            <span className="meta-tag">{event.travel_time_after}min travel after</span>
          )}
        </div>
      )}

      {isAccepted && event.parent_notes && (
        <div className="parent-notes">
          <strong>Notes:</strong> {event.parent_notes}
        </div>
      )}

      {/* Parent response form */}
      {isPending && userRole === 'parent' && !showRespond && (
        <div className="task-actions">
          <button className="btn btn-primary btn-small" onClick={() => setShowRespond(true)}>
            Accept
          </button>
          <button
            className="btn btn-danger btn-small"
            onClick={() => onRespond(event.id, { status: 'rejected' })}
          >
            Decline
          </button>
        </div>
      )}

      {showRespond && (
        <div className="respond-form">
          <h4>Add travel time</h4>
          <div className="travel-time-row">
            <div className="form-group">
              <label>Travel before (mins)</label>
              <input
                type="number"
                min={0}
                max={480}
                value={travelBefore}
                onChange={(e) => setTravelBefore(Number(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>Travel after (mins)</label>
              <input
                type="number"
                min={0}
                max={480}
                value={travelAfter}
                onChange={(e) => setTravelAfter(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          {travelBefore > 0 || travelAfter > 0 ? (
            <div className="busy-preview">
              You'll be busy from{' '}
              <strong>{formatTime(subtractMinutes(event.event_time, travelBefore))}</strong>
              {' '}until{' '}
              <strong>{formatTime(addMinutes(endTime, travelAfter))}</strong>
            </div>
          ) : null}
          <div className="form-group">
            <label>Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. I'll text when I'm leaving"
              value={parentNotes}
              onChange={(e) => setParentNotes(e.target.value)}
            />
          </div>
          <div className="task-actions">
            <button className="btn btn-primary btn-small" onClick={handleAccept}>
              Confirm
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setShowRespond(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete */}
      {onDelete && (
        <div className="task-actions" style={{ marginTop: 8 }}>
          <button className="btn btn-danger btn-small" onClick={() => onDelete(event.id)}>
            Delete
          </button>
          {event.series_id && (
            <button className="btn btn-danger btn-small" onClick={() => onDelete(event.id, true)}>
              Delete Series
            </button>
          )}
        </div>
      )}
    </div>
  );
}
