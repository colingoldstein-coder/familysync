const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateIcal } = require('../ical');

const router = express.Router();

// Get or generate calendar token for the current user
router.get('/token', authenticate, async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();

    let token = user.calendar_token;
    if (!token) {
      token = crypto.randomUUID();
      await db('users').where({ id: req.user.id }).update({ calendar_token: token });
    }

    res.json({ calendarToken: token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Regenerate calendar token (invalidates old URL)
router.post('/token/regenerate', authenticate, async (req, res) => {
  try {
    const token = crypto.randomUUID();
    await db('users').where({ id: req.user.id }).update({ calendar_token: token });
    res.json({ calendarToken: token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public iCal feed — no auth required, token in URL is the secret
router.get('/feed/:token', async (req, res) => {
  try {
    const user = await db('users').where({ calendar_token: req.params.token }).first();

    if (!user) {
      return res.status(404).send('Calendar not found');
    }

    const family = await db('families').where({ id: user.family_id }).first();

    // Get tasks for this user
    let tasksQuery = db('tasks as t')
      .leftJoin('users as u', 't.assigned_to', 'u.id')
      .leftJoin('users as p', 't.assigned_by', 'p.id')
      .select('t.*', 'u.name as assigned_to_name', 'p.name as assigned_by_name');

    if (user.role === 'parent') {
      tasksQuery = tasksQuery.where('t.family_id', user.family_id);
    } else {
      tasksQuery = tasksQuery.where('t.assigned_to', user.id);
    }

    const tasks = await tasksQuery;

    // Get events for this user
    let eventsQuery = db('events as e')
      .leftJoin('users as u', 'e.requested_by', 'u.id')
      .leftJoin('users as p', 'e.requested_to', 'p.id')
      .leftJoin('users as a', 'e.accepted_by', 'a.id')
      .select('e.*', 'u.name as requested_by_name', 'p.name as requested_to_name', 'a.name as accepted_by_name')
      .where('e.family_id', user.family_id);

    if (user.role === 'child') {
      eventsQuery = eventsQuery.andWhere('e.requested_by', user.id);
    } else {
      eventsQuery = eventsQuery.andWhere(function () {
        this.where('e.requested_to', user.id)
          .orWhere('e.request_to_all', true)
          .orWhere('e.requested_by', user.id);
      });
    }

    const events = await eventsQuery;

    const ical = generateIcal({
      tasks,
      events,
      userName: user.name,
      familyName: family.name,
    });

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="familysync.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.send(ical);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
