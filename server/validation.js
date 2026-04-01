const { z } = require('zod');

const strongPassword = z.string().min(10).max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const registerFamily = z.object({
  familyName: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: strongPassword,
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
  password: strongPassword,
});

const datePattern = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format');

const recurrenceFields = {
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).optional(),
  recurrenceInterval: z.number().int().min(1).max(365).optional(),
  recurrenceUnit: z.enum(['day', 'week', 'month']).optional(),
  recurrenceDays: z.string().regex(/^[0-6](,[0-6])*$/, 'Invalid days format').optional().nullable(),
  recurrenceEnd: datePattern.optional().nullable(),
};

const createTask = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  assignedTo: z.number().int().positive().optional(),
  assignToAll: z.boolean().optional(),
  rejectable: z.boolean().optional(),
  deadline: datePattern.optional().nullable(),
  ...recurrenceFields,
});

const updateTaskStatus = z.object({
  status: z.enum(['pending', 'accepted', 'in_progress', 'completed', 'rejected']),
});

const createRequest = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  requestedTo: z.number().int().positive().optional(),
  requestToAll: z.boolean().optional(),
  ...recurrenceFields,
});

const respondToRequest = z.object({
  status: z.enum(['accepted', 'rejected']),
});

const timePattern = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)');

const createEvent = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eventDate: datePattern,
  eventTime: timePattern,
  endTime: timePattern.optional().nullable(),
  eventType: z.enum(['drop_off', 'pick_up', 'both']),
  locationName: z.string().max(200).optional(),
  locationAddress: z.string().max(500).optional(),
  requestedTo: z.number().int().positive().optional(),
  requestToAll: z.boolean().optional(),
  ...recurrenceFields,
});

const respondToEvent = z.object({
  status: z.enum(['accepted', 'rejected']),
  travelTimeBefore: z.number().int().min(0).max(480).optional(),
  travelTimeAfter: z.number().int().min(0).max(480).optional(),
  parentNotes: z.string().max(1000).optional(),
});

const updatePassword = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: strongPassword,
});

const updateEmail = z.object({
  newEmail: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const updateName = z.object({
  name: z.string().min(1).max(100),
});

const googleLogin = z.object({
  idToken: z.string().min(1),
});

const googleRegisterFamily = z.object({
  idToken: z.string().min(1),
  familyName: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
});

const googleAcceptInvite = z.object({
  idToken: z.string().min(1),
  inviteToken: z.string().min(1),
  name: z.string().min(1).max(100),
});

const contact = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  message: z.string().min(1).max(2000),
});

const pushSubscribe = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

const pushUnsubscribe = z.object({
  endpoint: z.string().url().max(2000),
});

const webauthnLoginOptions = z.object({
  email: z.string().email().max(255),
});

const webauthnLogin = z.object({
  email: z.string().email().max(255),
  response: z.object({}).passthrough(),
});

const forgotPassword = z.object({
  email: z.string().email().max(255),
});

const resetPassword = z.object({
  token: z.string().min(1),
  newPassword: strongPassword,
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
    createEvent,
    respondToEvent,
    contact,
    updatePassword,
    updateEmail,
    updateName,
    googleLogin,
    googleRegisterFamily,
    googleAcceptInvite,
    pushSubscribe,
    pushUnsubscribe,
    webauthnLoginOptions,
    webauthnLogin,
    forgotPassword,
    resetPassword,
  },
};
