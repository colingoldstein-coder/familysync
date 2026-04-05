import { useState } from 'react';
import RecurrencePicker from './RecurrencePicker';
import useFocusTrap from '../hooks/useFocusTrap';
import '../styles/shared.css';

export default function EventForm({ members, userRole, onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [eventType, setEventType] = useState('drop_off');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [requestedTo, setRequestedTo] = useState('');
  const [requestToAll, setRequestToAll] = useState(false);
  const [recurrence, setRecurrence] = useState({
    recurrenceType: 'none', recurrenceInterval: 1, recurrenceUnit: 'week',
    recurrenceDays: null, recurrenceEnd: null,
  });
  const trapRef = useFocusTrap(true);

  // Filter targets: children see parents, parents see children
  const targets = userRole === 'child'
    ? members.filter(m => m.role === 'parent')
    : members.filter(m => m.role === 'child');

  const allLabel = userRole === 'child' ? 'All parents' : 'All children';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (eventTime && endTime && endTime <= eventTime) {
      setTimeError('End time must be after start time');
      return;
    }
    setTimeError('');
    onSubmit({
      title,
      description: description || undefined,
      eventDate,
      eventTime,
      endTime: endTime || null,
      eventType,
      locationName: locationName || undefined,
      locationAddress: locationAddress || undefined,
      requestedTo: requestToAll ? undefined : Number(requestedTo),
      requestToAll,
      ...recurrence,
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div ref={trapRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="event-form-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2 id="event-form-title">New Event</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Name</label>
            <input
              type="text"
              placeholder="e.g. Sarah's birthday party"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>Details (optional)</label>
            <textarea
              placeholder="Any extra info — what to bring, dress code, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>End (optional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setTimeError(''); }}
              />
            </div>
          </div>
          {timeError && <div className="error-msg">{timeError}</div>}

          <div className="form-group">
            <label>Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="drop_off">Drop-off (take me there)</option>
              <option value="pick_up">Pick-up (collect me)</option>
              <option value="both">Both (drop-off & pick-up)</option>
              <option value="fyi">Just FYI (no transport needed)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Location Name (optional)</label>
            <input
              type="text"
              placeholder="e.g. Sarah's house, Sports hall"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>Address (optional)</label>
            <input
              type="text"
              placeholder="e.g. 42 Oak Street, London, SW1A 1AA"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              maxLength={500}
            />
            {locationAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-preview-link"
              >
                Preview on Google Maps
              </a>
            )}
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="eventAll"
                checked={requestToAll}
                onChange={(e) => setRequestToAll(e.target.checked)}
              />
              <label htmlFor="eventAll">Send to {allLabel.toLowerCase()}</label>
            </div>
          </div>

          {!requestToAll && (
            <div className="form-group">
              <label>Send to</label>
              <select
                value={requestedTo}
                onChange={(e) => setRequestedTo(e.target.value)}
                required={!requestToAll}
              >
                <option value="">Select...</option>
                {targets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <RecurrencePicker value={recurrence} onChange={setRecurrence} />

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
