const express = require('express');
const db = require('../db');
const { authenticate, requireParent } = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const { buildRecurrenceFields, getRecurrenceConfig, getNextDate } = require('../recurrence');
const { notifyUser, notifyFamilyMembers } = require('../notifications');

const router = express.Router();

// Create an event (any family member)
router.post('/', authenticate, validate(schemas.createEvent), async (req, res) => {
  try {
    const {
      title, description, eventDate, eventTime, endTime, eventType,
      locationName, locationAddress, requestedTo, requestToAll,
    } = req.body;
    const recurrence = buildRecurrenceFields(req.body);

    if (!requestToAll && !requestedTo) {
      return res.status(400).json({ error: 'Must request from a family member or all parents' });
    }

    if (requestedTo) {
      const target = await db('users')
        .where({ id: requestedTo, family_id: req.user.familyId }).first();
      if (!target) {
        return res.status(400).json({ error: 'Invalid family member' });
      }
    }

    const [event] = await db('events').insert({
      title,
      description: description || null,
      event_date: eventDate,
      event_time: eventTime,
      end_time: endTime || null,
      event_type: eventType,
      location_name: locationName || null,
      location_address: locationAddress || null,
      requested_by: req.user.id,
      requested_to: requestedTo || null,
      request_to_all: !!requestToAll,
      family_id: req.user.familyId,
      ...recurrence,
    }).returning('id');

    // Notify targeted family members
    const payload = { title: 'New event', body: `${title} on ${eventDate}`, url: '/dashboard', tag: 'event-new' };
    if (requestToAll) {
      notifyFamilyMembers(req.user.familyId, req.user.id, payload);
    } else if (requestedTo) {
      notifyUser(requestedTo, payload);
    }

    res.json({ message: 'Event created', eventId: event.id || event });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get events
router.get('/', authenticate, async (req, res) => {
  try {
    let query = db('events as e')
      .leftJoin('users as u', 'e.requested_by', 'u.id')
      .leftJoin('users as p', 'e.requested_to', 'p.id')
      .leftJoin('users as a', 'e.accepted_by', 'a.id')
      .select(
        'e.*',
        'u.name as requested_by_name',
        'p.name as requested_to_name',
        'a.name as accepted_by_name',
      )
      .where('e.family_id', req.user.familyId)
      .orderBy('e.event_date', 'asc')
      .orderBy('e.event_time', 'asc');

    // Children only see events they created or that are assigned to them
    if (req.user.role === 'child') {
      query = query.andWhere(function () {
        this.where('e.requested_by', req.user.id);
      });
    } else {
      // Parents see events directed to them or to all parents, plus ones they created
      query = query.andWhere(function () {
        this.where('e.requested_to', req.user.id)
          .orWhere('e.request_to_all', true)
          .orWhere('e.requested_by', req.user.id);
      });
    }

    const events = await query;
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Respond to an event (parent only — accept with travel time, or decline)
router.patch('/:id/respond', authenticate, requireParent, validate(schemas.respondToEvent), async (req, res) => {
  try {
    const { status, travelTimeBefore, travelTimeAfter, parentNotes } = req.body;

    const event = await db('events')
      .where({ id: req.params.id, family_id: req.user.familyId }).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({ error: 'Event already responded to' });
    }

    if (!event.request_to_all && event.requested_to !== req.user.id) {
      return res.status(403).json({ error: 'This event is not assigned to you' });
    }

    await db('events').where({ id: req.params.id }).update({
      status,
      accepted_by: status === 'accepted' ? req.user.id : null,
      travel_time_before: status === 'accepted' ? (travelTimeBefore || 0) : 0,
      travel_time_after: status === 'accepted' ? (travelTimeAfter || 0) : 0,
      parent_notes: parentNotes || null,
      updated_at: db.fn.now(),
    });

    // Auto-create next occurrence for recurring events when accepted
    if (status === 'accepted' && event.recurrence_type !== 'none') {
      const config = getRecurrenceConfig(event);
      const nextDate = getNextDate(config, event.event_date);

      if (nextDate) {
        await db('events').insert({
          title: event.title,
          description: event.description,
          event_date: nextDate,
          event_time: event.event_time,
          end_time: event.end_time,
          event_type: event.event_type,
          location_name: event.location_name,
          location_address: event.location_address,
          requested_by: event.requested_by,
          requested_to: event.requested_to,
          request_to_all: event.request_to_all,
          family_id: event.family_id,
          recurrence_type: event.recurrence_type,
          recurrence_interval: event.recurrence_interval,
          recurrence_unit: event.recurrence_unit,
          recurrence_days: event.recurrence_days,
          recurrence_end: event.recurrence_end,
          series_id: event.series_id,
        });
      }
    }

    // Notify the event creator
    notifyUser(event.requested_by, {
      title: `Event ${status}`,
      body: `${req.user.name} ${status} "${event.title}"`,
      url: '/dashboard',
      tag: 'event-response',
    });

    res.json({ message: `Event ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await db('events')
      .where({ id: req.params.id, family_id: req.user.familyId }).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only the creator or a parent can delete
    if (event.requested_by !== req.user.id && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.query.series === 'true' && event.series_id) {
      await db('events')
        .where({ series_id: event.series_id, family_id: req.user.familyId })
        .whereIn('status', ['pending'])
        .del();
      res.json({ message: 'Recurring event series deleted' });
    } else {
      await db('events').where({ id: req.params.id }).del();
      res.json({ message: 'Event deleted' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
