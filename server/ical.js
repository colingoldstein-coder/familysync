/**
 * Generate iCal (.ics) content from tasks and events.
 */

function escapeIcal(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcalDate(dateStr) {
  // YYYY-MM-DD -> YYYYMMDD (all-day)
  return dateStr.replace(/-/g, '');
}

function formatIcalDateTime(dateStr, timeStr) {
  // YYYY-MM-DD + HH:MM -> YYYYMMDDTHHMMSS
  return dateStr.replace(/-/g, '') + 'T' + timeStr.replace(/:/g, '') + '00';
}

function addMinutesToTime(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor((total % 1440) / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function subtractMinutesFromTime(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - mins;
  const adjusted = ((total % 1440) + 1440) % 1440;
  const newH = Math.floor(adjusted / 60);
  const newM = adjusted % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function generateIcal({ tasks, events, userName, familyName }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilySync//Calendar//EN',
    `X-WR-CALNAME:FamilySync - ${escapeIcal(userName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  // Tasks with deadlines become all-day events
  for (const task of tasks) {
    if (!task.deadline) continue;
    if (task.status === 'rejected') continue;

    const uid = `task-${task.id}@familysync`;
    const summary = `[Task] ${task.title}`;
    const status = task.status === 'completed' ? 'COMPLETED' : 'NEEDS-ACTION';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(task.deadline)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcalDate(task.deadline)}`);
    lines.push(`SUMMARY:${escapeIcal(summary)}`);
    if (task.description) {
      lines.push(`DESCRIPTION:${escapeIcal(task.description)}`);
    }
    lines.push(`STATUS:${status}`);
    if (task.assigned_to_name) {
      lines.push(`X-ASSIGNED-TO:${escapeIcal(task.assigned_to_name)}`);
    }
    if (task.assigned_by_name) {
      lines.push(`X-ASSIGNED-BY:${escapeIcal(task.assigned_by_name)}`);
    }
    lines.push('END:VEVENT');
  }

  // Events become timed calendar events
  for (const event of events) {
    if (event.status === 'rejected') continue;

    const uid = `event-${event.id}@familysync`;
    const summary = event.title;
    const travelBefore = event.travel_time_before || 0;
    const travelAfter = event.travel_time_after || 0;

    // Calculate start/end including travel time for accepted events
    let startTime = event.event_time;
    let endTime = event.end_time || event.event_time;

    if (event.status === 'accepted' && travelBefore > 0) {
      startTime = subtractMinutesFromTime(event.event_time, travelBefore);
    }
    if (event.status === 'accepted' && travelAfter > 0) {
      endTime = addMinutesToTime(event.end_time || event.event_time, travelAfter);
    }

    // If no end time was set and no travel after, make it 1 hour
    if (!event.end_time && travelAfter === 0) {
      endTime = addMinutesToTime(event.event_time, 60);
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART:${formatIcalDateTime(event.event_date, startTime)}`);
    lines.push(`DTEND:${formatIcalDateTime(event.event_date, endTime)}`);
    lines.push(`SUMMARY:${escapeIcal(summary)}`);

    // Build description
    const descParts = [];
    if (event.description) descParts.push(event.description);
    const typeLabels = { drop_off: 'Drop-off', pick_up: 'Pick-up', both: 'Drop-off & Pick-up' };
    descParts.push(`Type: ${typeLabels[event.event_type]}`);
    if (travelBefore > 0) descParts.push(`Travel before: ${travelBefore} mins`);
    if (travelAfter > 0) descParts.push(`Travel after: ${travelAfter} mins`);
    if (event.parent_notes) descParts.push(`Notes: ${event.parent_notes}`);
    if (event.requested_by_name) descParts.push(`Requested by: ${event.requested_by_name}`);
    lines.push(`DESCRIPTION:${escapeIcal(descParts.join('\\n'))}`);

    // Location
    if (event.location_address) {
      lines.push(`LOCATION:${escapeIcal(event.location_address)}`);
    } else if (event.location_name) {
      lines.push(`LOCATION:${escapeIcal(event.location_name)}`);
    }

    // Google Maps URL
    if (event.location_address) {
      lines.push(`URL:https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address)}`);
    }

    if (event.status === 'pending') {
      lines.push('STATUS:TENTATIVE');
    } else {
      lines.push('STATUS:CONFIRMED');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = { generateIcal };
