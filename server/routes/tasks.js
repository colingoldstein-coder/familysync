const express = require('express');
const db = require('../db');
const { authenticate, requireParent } = require('../middleware/auth');
const { validate, validateParamId, schemas } = require('../validation');
const { buildRecurrenceFields, getRecurrenceConfig, getNextDate, copyRecurrenceFields, today } = require('../recurrence');
const { notifyUserIfEnabled } = require('../notifications');
const logger = require('../logger');

const router = express.Router();

// Create a task (parent only)
router.post('/', authenticate, requireParent, validate(schemas.createTask), async (req, res) => {
  try {
    const { title, description, assignedTo, assignToAll, rejectable, deadline } = req.body;
    const recurrence = buildRecurrenceFields(req.body);

    if (!assignToAll && !assignedTo) {
      return res.status(400).json({ error: 'Must assign to a family member or all' });
    }

    if (assignedTo) {
      const member = await db('users')
        .where({ id: assignedTo, family_id: req.user.familyId, is_active: true }).first();
      if (!member) {
        return res.status(400).json({ error: 'Invalid family member' });
      }
    }

    if (assignToAll) {
      const assignees = await db('users')
        .where({ family_id: req.user.familyId, is_active: true })
        .whereNot({ id: req.user.id })
        .select('id');

      if (assignees.length === 0) {
        return res.status(400).json({ error: 'No other family members' });
      }

      const taskIds = await db.transaction(async (trx) => {
        const ids = [];
        for (const member of assignees) {
          const [task] = await trx('tasks').insert({
            title, description: description || null,
            assigned_by: req.user.id, assigned_to: member.id,
            assign_to_all: true, family_id: req.user.familyId,
            rejectable: !!rejectable, deadline: deadline || null,
            ...recurrence,
          }).returning('id');
          ids.push(task.id || task);
        }
        return ids;
      });

      for (const member of assignees) {
        notifyUserIfEnabled(member.id, 'notify_new_requests', { title: 'New task from ' + req.user.name, body: title, url: '/dashboard', tag: 'task-new' });
      }

      res.json({ message: `Task assigned to ${assignees.length} family members`, taskIds });
    } else {
      const [task] = await db('tasks').insert({
        title, description: description || null,
        assigned_by: req.user.id, assigned_to: assignedTo,
        family_id: req.user.familyId, rejectable: !!rejectable,
        deadline: deadline || null,
        ...recurrence,
      }).returning('id');

      notifyUserIfEnabled(assignedTo, 'notify_new_requests', { title: 'New task from ' + req.user.name, body: title, url: '/dashboard', tag: 'task-new' });

      res.json({ message: 'Task created', taskId: task.id || task });
    }
  } catch (err) {
    logger.error({ msg: 'Create task error', error: err.message });
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
      query = query.where(function () {
        this.where('t.assigned_to', req.user.id)
          .orWhere('t.assigned_by', req.user.id);
      });
    }

    const tasks = await query;
    res.json({ tasks });
  } catch (err) {
    logger.error({ msg: 'Get tasks error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', authenticate, validateParamId, validate(schemas.updateTaskStatus), async (req, res) => {
  try {
    const { status } = req.body;
    const task = await db('tasks').where({ id: req.params.id }).first();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.family_id !== req.user.familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Task assignees (children or parents) can update their own tasks
    if (task.assigned_to === req.user.id) {
      if (status === 'rejected' && !task.rejectable) {
        return res.status(403).json({ error: 'This task cannot be declined' });
      }

      if (!['accepted', 'in_progress', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
    } else if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Not your task' });
    }

    // Use transaction for status update + recurring next-occurrence
    // WHERE constraint prevents race condition with concurrent status updates
    let nextTaskId = null;
    const updated = await db.transaction(async (trx) => {
      const affected = await trx('tasks')
        .where({ id: req.params.id })
        .whereNotIn('status', ['completed', 'rejected'])
        .update({ status, updated_at: db.fn.now() });

      if (affected === 0) return false;

      if (status === 'completed' && task.recurrence_type !== 'none') {
        const config = getRecurrenceConfig(task);
        const baseDate = task.deadline || today();
        const nextDate = getNextDate(config, baseDate);

        if (nextDate) {
          const [nextTask] = await trx('tasks').insert({
            title: task.title,
            description: task.description,
            assigned_by: task.assigned_by,
            assigned_to: task.assigned_to,
            assign_to_all: task.assign_to_all,
            family_id: task.family_id,
            rejectable: task.rejectable,
            deadline: task.deadline ? nextDate : null,
            ...copyRecurrenceFields(task),
          }).returning('id');
          nextTaskId = nextTask.id || nextTask;
        }
      }

      return true;
    });

    if (!updated) {
      return res.status(400).json({ error: 'Task already completed or declined' });
    }

    // Notify the parent when a task is completed
    if (status === 'completed') {
      notifyUserIfEnabled(task.assigned_by, 'notify_responses', {
        title: 'Task completed',
        body: `${req.user.name} completed "${task.title}"`,
        url: '/dashboard',
        tag: 'task-done',
      });
    }

    res.json({ message: 'Task updated', nextTaskId });
  } catch (err) {
    logger.error({ msg: 'Update task status error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task (parent only) — ?series=true to delete all future in series
router.delete('/:id', authenticate, requireParent, validateParamId, async (req, res) => {
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
    logger.error({ msg: 'Delete task error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
