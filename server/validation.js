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
  recurrenceEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').refine(val => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    return new Date(val + 'T00:00:00') <= maxDate;
  }, 'Recurrence end date must be within 2 years').optional().nullable(),
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
  eventType: z.enum(['drop_off', 'pick_up', 'both', 'fyi']),
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

const webauthnRegister = z.object({
  deviceName: z.string().max(100).optional(),
}).passthrough();

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

const emailPreferences = z.object({
  optOut: z.boolean(),
});

const notificationPreferences = z.object({
  pendingRequests: z.boolean().optional(),
  tasksDue: z.boolean().optional(),
  activeEvents: z.boolean().optional(),
  newRequests: z.boolean().optional(),
  newTasks: z.boolean().optional(),
  newEvents: z.boolean().optional(),
  responses: z.boolean().optional(),
}).refine(data => Object.values(data).some(v => v !== undefined), {
  message: 'At least one preference must be provided',
});

const adminReactivate = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
});

const adminBroadcastPush = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  url: z.string().max(500).regex(/^\/[a-zA-Z0-9/_-]*$/, 'URL must be a safe relative path').optional(),
});

const adminSendEmail = z.object({
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().max(50000).optional(),
  bodyContent: z.string().max(50000).optional(),
  userIds: z.array(z.number().int().positive()).min(1),
}).refine(data => data.bodyHtml || data.bodyContent, {
  message: 'Either bodyHtml or bodyContent is required',
});

const adminUpdateSiteImage = z.object({
  imageUrl: z.string().max(2000).regex(/^(\/api\/(admin\/)?uploads\/|\/images\/site\/)/, 'Image URL must be a local upload or site image path').optional(),
  altText: z.string().max(500).optional(),
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

function validateParamId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  next();
}

module.exports = {
  validate,
  validateParamId,
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
    webauthnRegister,
    webauthnLoginOptions,
    webauthnLogin,
    forgotPassword,
    resetPassword,
    emailPreferences,
    notificationPreferences,
    adminReactivate,
    adminBroadcastPush,
    adminSendEmail,
    adminUpdateSiteImage,
  },
};
