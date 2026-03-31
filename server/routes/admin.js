const express = require('express');
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.use(authenticate, requireSuperAdmin);

const isSQLite = !process.env.DATABASE_URL;
const likeOp = isSQLite ? 'like' : likeOp;

function parsePeriod(period) {
  const match = (period || '30d').match(/^(\d+)(d|w|m)$/);
  if (!match) return 30;
  const num = parseInt(match[1]);
  if (match[2] === 'w') return num * 7;
  if (match[2] === 'm') return num * 30;
  return num;
}

function dateFrom(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Overview stats
router.get('/stats/overview', async (req, res) => {
  try {
    const [families] = await db('families').count('id as count');
    const [users] = await db('users').count('id as count');
    const [parents] = await db('users').where({ role: 'parent' }).count('id as count');
    const [children] = await db('users').where({ role: 'child' }).count('id as count');
    const [totalTasks] = await db('tasks').count('id as count');
    const [completedTasks] = await db('tasks').where({ status: 'completed' }).count('id as count');
    const [totalEvents] = await db('events').count('id as count');
    const [pendingEvents] = await db('events').where({ status: 'pending' }).count('id as count');
    const [totalRequests] = await db('help_requests').count('id as count');
    const [pendingRequests] = await db('help_requests').where({ status: 'pending' }).count('id as count');

    const total = Number(totalTasks.count);
    const completed = Number(completedTasks.count);

    res.json({
      families: Number(families.count),
      users: Number(users.count),
      parents: Number(parents.count),
      children: Number(children.count),
      totalTasks: total,
      completedTasks: completed,
      taskCompletionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalEvents: Number(totalEvents.count),
      pendingEvents: Number(pendingEvents.count),
      totalRequests: Number(totalRequests.count),
      pendingRequests: Number(pendingRequests.count),
      uptime: Math.round(process.uptime()),
    });
  } catch (err) {
    logger.error({ msg: 'Admin stats error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Registration trends
router.get('/stats/registrations', async (req, res) => {
  try {
    const days = parsePeriod(req.query.period);
    const since = dateFrom(days);

    const usersByDay = await db('users')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as count')
      .where('created_at', '>=', since)
      .groupByRaw('DATE(created_at)')
      .orderBy('date');

    const familiesByDay = await db('families')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as count')
      .where('created_at', '>=', since)
      .groupByRaw('DATE(created_at)')
      .orderBy('date');

    res.json({
      users: usersByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      families: familiesByDay.map(r => ({ date: r.date, count: Number(r.count) })),
    });
  } catch (err) {
    logger.error({ msg: 'Admin stats error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Task analytics
router.get('/stats/tasks', async (req, res) => {
  try {
    const days = parsePeriod(req.query.period);
    const since = dateFrom(days);

    const createdByDay = await db('tasks')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as count')
      .where('created_at', '>=', since)
      .groupByRaw('DATE(created_at)')
      .orderBy('date');

    const completedByDay = await db('tasks')
      .select(db.raw('DATE(updated_at) as date'))
      .count('id as count')
      .where({ status: 'completed' })
      .where('updated_at', '>=', since)
      .groupByRaw('DATE(updated_at)')
      .orderBy('date');

    const statusDist = await db('tasks')
      .select('status')
      .count('id as count')
      .groupBy('status');

    res.json({
      created: createdByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      completed: completedByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      statusDistribution: statusDist.map(r => ({ status: r.status, count: Number(r.count) })),
    });
  } catch (err) {
    logger.error({ msg: 'Admin stats error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Event analytics
router.get('/stats/events', async (req, res) => {
  try {
    const days = parsePeriod(req.query.period);
    const since = dateFrom(days);

    const createdByDay = await db('events')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as count')
      .where('created_at', '>=', since)
      .groupByRaw('DATE(created_at)')
      .orderBy('date');

    const typeDist = await db('events')
      .select('event_type')
      .count('id as count')
      .groupBy('event_type');

    const statusDist = await db('events')
      .select('status')
      .count('id as count')
      .groupBy('status');

    res.json({
      created: createdByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      typeDistribution: typeDist.map(r => ({ type: r.event_type, count: Number(r.count) })),
      statusDistribution: statusDist.map(r => ({ status: r.status, count: Number(r.count) })),
    });
  } catch (err) {
    logger.error({ msg: 'Admin stats error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Family details
router.get('/stats/families', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const families = await db('families as f')
      .select(
        'f.id', 'f.ref_number', 'f.name', 'f.created_at',
        db.raw('(SELECT COUNT(*) FROM users WHERE family_id = f.id) as member_count'),
        db.raw('(SELECT COUNT(*) FROM tasks WHERE family_id = f.id) as task_count'),
        db.raw('(SELECT COUNT(*) FROM tasks WHERE family_id = f.id AND status = ?) as completed_task_count', ['completed']),
        db.raw('(SELECT COUNT(*) FROM events WHERE family_id = f.id) as event_count'),
        db.raw('(SELECT COUNT(*) FROM help_requests WHERE family_id = f.id) as request_count'),
      )
      .orderBy('f.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [total] = await db('families').count('id as count');

    res.json({
      families: families.map(f => ({
        id: f.id,
        ref: f.ref_number,
        name: f.name,
        createdAt: f.created_at,
        members: Number(f.member_count),
        tasks: Number(f.task_count),
        completedTasks: Number(f.completed_task_count),
        events: Number(f.event_count),
        requests: Number(f.request_count),
      })),
      total: Number(total.count),
      page,
      totalPages: Math.ceil(Number(total.count) / limit),
    });
  } catch (err) {
    logger.error({ msg: 'Admin stats error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// User records
router.get('/records/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let query = db('users as u')
      .leftJoin('families as f', 'f.id', 'u.family_id')
      .select(
        'u.id', 'u.ref_number', 'u.name', 'u.email', 'u.role',
        'u.is_admin', 'u.is_super_admin', 'u.created_at',
        'f.name as family_name', 'f.ref_number as family_ref'
      );

    let countQuery = db('users as u');

    if (search) {
      const like = `%${search}%`;
      query = query.where(function () {
        this.where('u.name', likeOp, like)
          .orWhere('u.email', likeOp, like)
          .orWhere('u.ref_number', likeOp, like);
      });
      countQuery = countQuery.where(function () {
        this.where('name', likeOp, like)
          .orWhere('email', likeOp, like)
          .orWhere('ref_number', likeOp, like);
      });
    }

    const users = await query.orderBy('u.id').limit(limit).offset(offset);
    const [total] = await countQuery.count('id as count');

    res.json({
      users: users.map(u => ({
        id: u.id,
        ref: u.ref_number,
        name: u.name,
        email: u.email,
        role: u.role,
        isAdmin: u.is_admin,
        isSuperAdmin: u.is_super_admin,
        familyName: u.family_name,
        familyRef: u.family_ref,
        createdAt: u.created_at,
      })),
      total: Number(total.count),
      page,
      totalPages: Math.ceil(Number(total.count) / limit),
    });
  } catch (err) {
    logger.error({ msg: 'Admin records error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Family records
router.get('/records/families', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let query = db('families as f')
      .select(
        'f.id', 'f.ref_number', 'f.name', 'f.created_at',
        db.raw('(SELECT COUNT(*) FROM users WHERE family_id = f.id) as member_count'),
      );

    let countQuery = db('families');

    if (search) {
      const like = `%${search}%`;
      query = query.where(function () {
        this.where('f.name', likeOp, like)
          .orWhere('f.ref_number', likeOp, like);
      });
      countQuery = countQuery.where(function () {
        this.where('name', likeOp, like)
          .orWhere('ref_number', likeOp, like);
      });
    }

    const families = await query.orderBy('f.id').limit(limit).offset(offset);
    const [total] = await countQuery.count('id as count');

    // Get members for each family
    const familyIds = families.map(f => f.id);
    const members = familyIds.length > 0
      ? await db('users').whereIn('family_id', familyIds).select('id', 'ref_number', 'name', 'role', 'is_admin', 'family_id')
      : [];

    const membersByFamily = {};
    members.forEach(m => {
      if (!membersByFamily[m.family_id]) membersByFamily[m.family_id] = [];
      membersByFamily[m.family_id].push({ ref: m.ref_number, name: m.name, role: m.role, isAdmin: m.is_admin });
    });

    res.json({
      families: families.map(f => ({
        id: f.id,
        ref: f.ref_number,
        name: f.name,
        members: Number(f.member_count),
        memberList: membersByFamily[f.id] || [],
        createdAt: f.created_at,
      })),
      total: Number(total.count),
      page,
      totalPages: Math.ceil(Number(total.count) / limit),
    });
  } catch (err) {
    logger.error({ msg: 'Admin records error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Active users over time
router.get('/stats/active-users', async (req, res) => {
  try {
    const days = parsePeriod(req.query.period);
    const since = dateFrom(days);

    // Users who created or were assigned tasks
    const taskActivity = await db('tasks')
      .select(db.raw('DATE(created_at) as date'))
      .countDistinct('assigned_by as count')
      .where('created_at', '>=', since)
      .groupByRaw('DATE(created_at)')
      .orderBy('date');

    // Users who created events
    const eventActivity = await db('events')
      .select(db.raw('DATE(created_at) as date'))
      .countDistinct('requested_by as count')
      .where('created_at', '>=', since)
      .groupByRaw('DATE(created_at)')
      .orderBy('date');

    // Merge into a single timeline
    const dateMap = {};
    taskActivity.forEach(r => {
      dateMap[r.date] = (dateMap[r.date] || 0) + Number(r.count);
    });
    eventActivity.forEach(r => {
      dateMap[r.date] = (dateMap[r.date] || 0) + Number(r.count);
    });

    const activeUsers = Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ activeUsers });
  } catch (err) {
    logger.error({ msg: 'Admin stats error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
