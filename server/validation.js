const { z } = require('zod');

const registerFamily = z.object({
  familyName: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const login = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const invite = z.object({
  email: z.string().email().max(255),
  role: z.enum(['parent', 'child']),
});

const acceptInvite = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

const createTask = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  assignedTo: z.number().int().positive().optional(),
  assignToAll: z.boolean().optional(),
  rejectable: z.boolean().optional(),
});

const updateTaskStatus = z.object({
  status: z.enum(['pending', 'accepted', 'in_progress', 'completed', 'rejected']),
});

const createRequest = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  requestedTo: z.number().int().positive().optional(),
  requestToAll: z.boolean().optional(),
});

const respondToRequest = z.object({
  status: z.enum(['accepted', 'rejected']),
});

const contact = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  message: z.string().min(1).max(2000),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  validate,
  schemas: {
    registerFamily,
    login,
    invite,
    acceptInvite,
    createTask,
    updateTaskStatus,
    createRequest,
    respondToRequest,
    contact,
  },
};
