const express = require('express');
const db = require('../db');
const { authenticate, requireParent } = require('../middleware/auth');
const { validate, schemas } = require('../validation');

const router = express.Router();

// Create an event (any family member)
router.post('/', authenticate, validate(schemas.createEvent), async (req, res) => {
  try {
    const {
      title, description, eventDate, eventTime, endTime, eventType,
      locationName, locationAddress, requestedTo, requestToAll,
    } = req.body;

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
    }).returning('id');

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

// Respond to an event (parent only — accept with travel time, or reject)
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

    await db('events').where({ id: req.params.id }).del();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
