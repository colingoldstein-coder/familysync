const API_URL = import.meta.env.VITE_API_URL || '/api';

class OfflineError extends Error {
  constructor() {
    super("You're offline. Please check your connection.");
    this.name = 'OfflineError';
    this.isOffline = true;
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new OfflineError();
    }
    throw err;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  registerFamily: (data) => request('/auth/register-family', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  getFamilyMembers: () => request('/auth/family-members'),
  removeFamilyMember: (id) => request(`/auth/family-members/${id}`, { method: 'DELETE' }),

  // Google Auth
  googleLogin: (data) => request('/auth/google-login', { method: 'POST', body: JSON.stringify(data) }),
  googleRegisterFamily: (data) => request('/auth/google-register-family', { method: 'POST', body: JSON.stringify(data) }),
  googleAcceptInvite: (data) => request('/auth/google-accept-invite', { method: 'POST', body: JSON.stringify(data) }),

  // Password reset
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Account
  updatePassword: (data) => request('/auth/me/password', { method: 'PATCH', body: JSON.stringify(data) }),
  updateEmail: (data) => request('/auth/me/email', { method: 'PATCH', body: JSON.stringify(data) }),
  updateName: (data) => request('/auth/me/name', { method: 'PATCH', body: JSON.stringify(data) }),
  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch(`${API_URL}/auth/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  removeAvatar: () => request('/auth/me/avatar', { method: 'DELETE' }),
  updateEmailPrefs: (data) => request('/auth/me/email-preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  completeProfileSetup: () => request('/auth/me/profile-setup-complete', { method: 'PATCH' }),
  dismissProfileReminder: () => request('/auth/me/profile-reminder-dismiss', { method: 'PATCH' }),

  // Invitations
  sendInvite: (data) => request('/auth/invite', { method: 'POST', body: JSON.stringify(data) }),
  getInvite: (token) => request(`/auth/invite/${token}`),
  acceptInvite: (data) => request('/auth/accept-invite', { method: 'POST', body: JSON.stringify(data) }),
  declineInvite: (token) => request('/auth/decline-invite', { method: 'POST', body: JSON.stringify({ token }) }),
  getInvitations: () => request('/auth/invitations'),
  resendInvite: (id) => request(`/auth/invitations/${id}/resend`, { method: 'POST' }),

  // Tasks
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  getTasks: () => request('/tasks'),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteTask: (id, series = false) => request(`/tasks/${id}${series ? '?series=true' : ''}`, { method: 'DELETE' }),

  // Help Requests
  createRequest: (data) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
  getRequests: () => request('/requests'),
  respondToRequest: (id, status) => request(`/requests/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Events
  createEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  getEvents: () => request('/events'),
  respondToEvent: (id, data) => request(`/events/${id}/respond`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEvent: (id, series = false) => request(`/events/${id}${series ? '?series=true' : ''}`, { method: 'DELETE' }),

  // Calendar
  getCalendarToken: () => request('/calendar/token'),
  enableCalendarSync: () => request('/calendar/token', { method: 'POST' }),
  regenerateCalendarToken: () => request('/calendar/token/regenerate', { method: 'POST' }),
  unlinkCalendar: () => request('/calendar/token', { method: 'DELETE' }),

  // Contact
  sendContactMessage: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),

  // Push notifications
  getVapidKey: () => request('/push/vapid-key'),
  subscribePush: (subscription) => request('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  unsubscribePush: (endpoint) => request('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  updateNotificationPrefs: (data) => request('/auth/me/notification-preferences', { method: 'PATCH', body: JSON.stringify(data) }),

  // Admin
  getAdminOverview: () => request('/admin/stats/overview'),
  getAdminRegistrations: (period = '30d') => request(`/admin/stats/registrations?period=${period}`),
  getAdminTasks: (period = '30d') => request(`/admin/stats/tasks?period=${period}`),
  getAdminEvents: (period = '30d') => request(`/admin/stats/events?period=${period}`),
  getAdminFamilies: (page = 1) => request(`/admin/stats/families?page=${page}`),
  getAdminActiveUsers: (period = '30d') => request(`/admin/stats/active-users?period=${period}`),
  getAdminUserRecords: (page = 1, search = '') => request(`/admin/records/users?page=${page}&search=${encodeURIComponent(search)}`),
  getAdminFamilyRecords: (page = 1, search = '') => request(`/admin/records/families?page=${page}&search=${encodeURIComponent(search)}`),
  getAdminPushStats: () => request('/admin/push-stats'),
  adminBroadcastPush: (data) => request('/admin/broadcast-push', { method: 'POST', body: JSON.stringify(data) }),
  getAdminUnsubscribedUsers: () => request('/admin/unsubscribed-users'),
  getAdminInactiveUsers: () => request('/admin/inactive-users'),
  adminReactivateUsers: (userIds) => request('/admin/reactivate', { method: 'POST', body: JSON.stringify({ userIds }) }),
  getAdminLockedAccounts: () => request('/admin/locked-accounts'),
  adminUnlockAccounts: (userIds) => request('/admin/unlock-accounts', { method: 'POST', body: JSON.stringify({ userIds }) }),
  getAdminEmailRecipients: (familyId, excludeOptedOut = false) => {
    const params = new URLSearchParams();
    if (familyId) params.set('familyId', familyId);
    if (excludeOptedOut) params.set('excludeOptedOut', 'true');
    const qs = params.toString();
    return request(`/admin/email-recipients${qs ? `?${qs}` : ''}`);
  },
  adminSendEmail: (data) => request('/admin/send-email', { method: 'POST', body: JSON.stringify(data) }),
  getAdminEmailLog: (params = {}) => {
    const p = new URLSearchParams();
    if (params.page) p.set('page', params.page);
    if (params.limit) p.set('limit', params.limit);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    if (params.status) p.set('status', params.status);
    if (params.sort) p.set('sort', params.sort);
    if (params.order) p.set('order', params.order);
    const qs = p.toString();
    return request(`/admin/email-log${qs ? `?${qs}` : ''}`);
  },
  adminUploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${API_URL}/admin/upload-image`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  // Site images (public)
  getSiteImages: () => request('/site-images'),

  // Email preferences (public, token-based)
  getEmailPreferences: (token) => request(`/auth/email-preferences/${token}`),
  updateEmailPreferences: (token, optOut) => request(`/auth/email-preferences/${token}`, { method: 'POST', body: JSON.stringify({ optOut }) }),

  // WebAuthn (biometric login)
  webauthnRegisterOptions: () => request('/webauthn/register-options', { method: 'POST' }),
  webauthnRegister: (data) => request('/webauthn/register', { method: 'POST', body: JSON.stringify(data) }),
  webauthnLoginOptions: (email) => request('/webauthn/login-options', { method: 'POST', body: JSON.stringify({ email }) }),
  webauthnLogin: (data) => request('/webauthn/login', { method: 'POST', body: JSON.stringify(data) }),
  webauthnCredentials: () => request('/webauthn/credentials'),
  webauthnDeleteCredential: (id) => request(`/webauthn/credentials/${id}`, { method: 'DELETE' }),

  // Site images (admin)
  getAdminSiteImages: () => request('/admin/site-images'),
  updateAdminSiteImage: (key, data) => request(`/admin/site-images/${key}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Audit log
  getAdminAuditLog: (params = {}) => {
    const p = new URLSearchParams();
    if (params.limit) p.set('limit', params.limit);
    if (params.offset) p.set('offset', params.offset);
    if (params.action) p.set('action', params.action);
    const qs = p.toString();
    return request(`/admin/audit-log${qs ? `?${qs}` : ''}`);
  },
};
