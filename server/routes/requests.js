const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { validate, validateParamId, schemas } = require('../validation');
const { buildRecurrenceFields, getRecurrenceConfig, getNextDate, today } = require('../recurrence');
const { notifyUser, notifyFamilyMembers } = require('../notifications');
const logger = require('../logger');

const router = express.Router();

// Create a help request
router.post('/', authenticate, validate(schemas.createRequest), async (req, res) => {
  try {
    const { title, description, requestedTo, requestToAll } = req.body;

    if (!requestToAll && !requestedTo) {
      return res.status(400).json({ error: 'Must request from a family member or all' });
    }

    if (requestedTo) {
      const member = await db('users')
        .where({ id: requestedTo, family_id: req.user.familyId, is_active: true })
        .whereNot({ id: req.user.id })
        .first();
      if (!member) {
        return res.status(400).json({ error: 'Invalid family member' });
      }
    }

    const recurrence = buildRecurrenceFields(req.body);

    const [request] = await db('help_requests').insert({
      title, description: description || null,
      requested_by: req.user.id, requested_to: requestedTo || null,
      request_to_all: !!requestToAll, family_id: req.user.familyId,
      ...recurrence,
    }).returning('id');

    // Notify targeted parent(s)
    const payload = { title: 'Help request', body: `${req.user.name} needs help: ${title}`, url: '/dashboard', tag: 'request-new' };
    if (requestToAll) {
      notifyFamilyMembers(req.user.familyId, req.user.id, payload);
    } else if (requestedTo) {
      notifyUser(requestedTo, payload);
    }

    res.json({ message: 'Request created', requestId: request.id || request });
  } catch (err) {
    logger.error({ msg: 'Create request error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get help requests
router.get('/', authenticate, async (req, res) => {
  try {
    let query = db('help_requests as r')
      .leftJoin('users as u', 'r.requested_by', 'u.id')
      .leftJoin('users as p', 'r.requested_to', 'p.id')
      .leftJoin('users as a', 'r.accepted_by', 'a.id')
      .select('r.*', 'u.name as requested_by_name', 'p.name as requested_to_name', 'a.name as accepted_by_name')
      .orderBy('r.created_at', 'desc');

    query = query.where('r.family_id', req.user.familyId)
      .andWhere(function () {
        this.where('r.requested_by', req.user.id)
          .orWhere('r.requested_to', req.user.id)
          .orWhere('r.request_to_all', true);
      });

    const requests = await query;
    res.json({ requests });
  } catch (err) {
    logger.error({ msg: 'Get requests error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Respond to a help request
router.patch('/:id/respond', authenticate, validateParamId, validate(schemas.respondToRequest), async (req, res) => {
  try {
    const { status } = req.body;

    const request = await db('help_requests')
      .where({ id: req.params.id, family_id: req.user.familyId }).first();

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already responded to' });
    }

    if (request.requested_by === req.user.id) {
      return res.status(403).json({ error: 'Cannot respond to your own request' });
    }

    if (!request.request_to_all && request.requested_to !== req.user.id) {
      return res.status(403).json({ error: 'This request is not for you' });
    }

    await db('help_requests').where({ id: req.params.id }).update({
      status,
      accepted_by: status === 'accepted' ? req.user.id : null,
      updated_at: db.fn.now(),
    });

    // Auto-create next occurrence for recurring requests when accepted
    if (status === 'accepted' && request.recurrence_type !== 'none') {
      const config = getRecurrenceConfig(request);
      const nextDate = getNextDate(config, today());

      if (nextDate) {
        await db('help_requests').insert({
          title: request.title,
          description: request.description,
          requested_by: request.requested_by,
          requested_to: request.requested_to,
          request_to_all: request.request_to_all,
          family_id: request.family_id,
          recurrence_type: request.recurrence_type,
          recurrence_interval: request.recurrence_interval,
          recurrence_unit: request.recurrence_unit,
          recurrence_days: request.recurrence_days,
          recurrence_end: request.recurrence_end,
          series_id: request.series_id,
        });
      }
    }

    // Notify the person who made the request
    const displayStatus = status === 'rejected' ? 'declined' : status;
    notifyUser(request.requested_by, {
      title: `Request ${displayStatus}`,
      body: `Your help request "${request.title}" was ${displayStatus}`,
      url: '/dashboard',
      tag: 'request-response',
    });

    res.json({ message: `Request ${status}` });
  } catch (err) {
    logger.error({ msg: 'Respond to request error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
