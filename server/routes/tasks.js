const express = require('express');
const db = require('../db');
const { authenticate, requireParent } = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const { buildRecurrenceFields, getRecurrenceConfig, getNextDate, today } = require('../recurrence');

const router = express.Router();

// Create a task (parent only)
router.post('/', authenticate, requireParent, validate(schemas.createTask), async (req, res) => {
  try {
    const { title, description, assignedTo, assignToAll, rejectable, deadline } = req.body;
    const recurrence = buildRecurrenceFields(req.body);

    if (!assignToAll && !assignedTo) {
      return res.status(400).json({ error: 'Must assign to a child or all children' });
    }

    if (assignedTo) {
      const child = await db('users')
        .where({ id: assignedTo, family_id: req.user.familyId, role: 'child' }).first();
      if (!child) {
        return res.status(400).json({ error: 'Invalid child' });
      }
    }

    if (assignToAll) {
      const children = await db('users')
        .where({ family_id: req.user.familyId, role: 'child' }).select('id');

      if (children.length === 0) {
        return res.status(400).json({ error: 'No children in the family' });
      }

      const taskIds = await db.transaction(async (trx) => {
        const ids = [];
        for (const child of children) {
          const [task] = await trx('tasks').insert({
            title, description: description || null,
            assigned_by: req.user.id, assigned_to: child.id,
            assign_to_all: true, family_id: req.user.familyId,
            rejectable: !!rejectable, deadline: deadline || null,
            ...recurrence,
          }).returning('id');
          ids.push(task.id || task);
        }
        return ids;
      });

      res.json({ message: `Task assigned to ${children.length} children`, taskIds });
    } else {
      const [task] = await db('tasks').insert({
        title, description: description || null,
        assigned_by: req.user.id, assigned_to: assignedTo,
        family_id: req.user.familyId, rejectable: !!rejectable,
        deadline: deadline || null,
        ...recurrence,
      }).returning('id');

      res.json({ message: 'Task created', taskId: task.id || task });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tasks (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    let query = db('tasks as t')
      .leftJoin('users as u', 't.assigned_to', 'u.id')
      .leftJoin('users as p', 't.assigned_by', 'p.id')
      .select('t.*', 'u.name as assigned_to_name', 'p.name as assigned_by_name')
      .orderBy('t.created_at', 'desc');

    if (req.user.role === 'parent') {
      query = query.where('t.family_id', req.user.familyId);
    } else {
      query = query.where('t.assigned_to', req.user.id);
    }

    const tasks = await query;
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', authenticate, validate(schemas.updateTaskStatus), async (req, res) => {
  try {
    const { status } = req.body;
    const task = await db('tasks').where({ id: req.params.id }).first();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.family_id !== req.user.familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'child') {
      if (task.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Not your task' });
      }

      if (status === 'rejected' && !task.rejectable) {
        return res.status(403).json({ error: 'This task cannot be rejected' });
      }

      if (!['accepted', 'in_progress', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
    }

    await db('tasks').where({ id: req.params.id }).update({ status, updated_at: db.fn.now() });

    // Auto-create next occurrence for recurring tasks
    let nextTaskId = null;
    if (status === 'completed' && task.recurrence_type !== 'none') {
      const config = getRecurrenceConfig(task);
      const baseDate = task.deadline || today();
      const nextDate = getNextDate(config, baseDate);

      if (nextDate) {
        const [nextTask] = await db('tasks').insert({
          title: task.title,
          description: task.description,
          assigned_by: task.assigned_by,
          assigned_to: task.assigned_to,
          assign_to_all: task.assign_to_all,
          family_id: task.family_id,
          rejectable: task.rejectable,
          deadline: task.deadline ? nextDate : null,
          recurrence_type: task.recurrence_type,
          recurrence_interval: task.recurrence_interval,
          recurrence_unit: task.recurrence_unit,
          recurrence_days: task.recurrence_days,
          recurrence_end: task.recurrence_end,
          series_id: task.series_id,
        }).returning('id');
        nextTaskId = nextTask.id || nextTask;
      }
    }

    res.json({ message: 'Task updated', nextTaskId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task (parent only) — ?series=true to delete all future in series
router.delete('/:id', authenticate, requireParent, async (req, res) => {
  try {
    const task = await db('tasks')
      .where({ id: req.params.id, family_id: req.user.familyId }).first();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.query.series === 'true' && task.series_id) {
      // Delete all pending/future tasks in this series
      await db('tasks')
        .where({ series_id: task.series_id, family_id: req.user.familyId })
        .whereIn('status', ['pending', 'accepted', 'in_progress'])
        .del();
      res.json({ message: 'Recurring series deleted' });
    } else {
      await db('tasks').where({ id: req.params.id }).del();
      res.json({ message: 'Task deleted' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
