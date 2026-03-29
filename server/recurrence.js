const crypto = require('crypto');

function generateSeriesId() {
  return crypto.randomUUID();
}

/**
 * Calculate the next occurrence date based on recurrence settings.
 * Returns a YYYY-MM-DD string, or null if the series has ended.
 */
function getNextDate(recurrence, fromDate) {
  const from = new Date(fromDate + 'T00:00:00');
  const { type, interval, unit, days, end } = recurrence;
  let next;

  switch (type) {
    case 'daily':
      next = addDays(from, interval || 1);
      break;

    case 'weekly':
      next = getNextWeeklyDate(from, days, interval || 1);
      break;

    case 'monthly':
      next = addMonths(from, interval || 1);
      break;

    case 'custom':
      switch (unit) {
        case 'day':
          next = addDays(from, interval || 1);
          break;
        case 'week':
          next = addDays(from, (interval || 1) * 7);
          break;
        case 'month':
          next = addMonths(from, interval || 1);
          break;
        default:
          return null;
      }
      break;

    default:
      return null;
  }

  if (end) {
    const endDate = new Date(end + 'T23:59:59');
    if (next > endDate) return null;
  }

  return formatDate(next);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date, n) {
  const d = new Date(date);
  const dayOfMonth = d.getDate();
  d.setMonth(d.getMonth() + n);
  // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28)
  if (d.getDate() !== dayOfMonth) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

function getNextWeeklyDate(from, daysStr, interval) {
  if (!daysStr) {
    // No specific days — just add N weeks
    return addDays(from, interval * 7);
  }

  const selectedDays = daysStr.split(',').map(Number).sort((a, b) => a - b);
  const currentDay = from.getDay(); // 0=Sun..6=Sat

  // Find the next selected day after currentDay in the same week cycle
  for (const day of selectedDays) {
    if (day > currentDay) {
      return addDays(from, day - currentDay);
    }
  }

  // Wrap to the first selected day of the next interval-th week
  const daysUntilNextWeek = 7 - currentDay + selectedDays[0];
  const extraWeeks = (interval - 1) * 7;
  return addDays(from, daysUntilNextWeek + extraWeeks);
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function today() {
  return formatDate(new Date());
}

/**
 * Build recurrence fields object from request body params.
 */
function buildRecurrenceFields(body) {
  const type = body.recurrenceType || 'none';
  if (type === 'none') {
    return {
      recurrence_type: 'none',
      recurrence_interval: 1,
      recurrence_unit: 'week',
      recurrence_days: null,
      recurrence_end: null,
      series_id: null,
    };
  }

  return {
    recurrence_type: type,
    recurrence_interval: body.recurrenceInterval || 1,
    recurrence_unit: body.recurrenceUnit || 'week',
    recurrence_days: body.recurrenceDays || null,
    recurrence_end: body.recurrenceEnd || null,
    series_id: generateSeriesId(),
  };
}

/**
 * Extract recurrence config from a DB row for next-date calculation.
 */
function getRecurrenceConfig(row) {
  return {
    type: row.recurrence_type,
    interval: row.recurrence_interval,
    unit: row.recurrence_unit,
    days: row.recurrence_days,
    end: row.recurrence_end,
  };
}

module.exports = {
  generateSeriesId,
  getNextDate,
  buildRecurrenceFields,
  getRecurrenceConfig,
  today,
};
