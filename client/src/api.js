const API_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('familysync_token');
}

class OfflineError extends Error {
  constructor() {
    super("You're offline. Please check your connection.");
    this.name = 'OfflineError';
    this.isOffline = true;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
  getMe: () => request('/auth/me'),
  getFamilyMembers: () => request('/auth/family-members'),
  removeFamilyMember: (id) => request(`/auth/family-members/${id}`, { method: 'DELETE' }),

  // Account
  updatePassword: (data) => request('/auth/me/password', { method: 'PATCH', body: JSON.stringify(data) }),
  updateEmail: (data) => request('/auth/me/email', { method: 'PATCH', body: JSON.stringify(data) }),
  updateName: (data) => request('/auth/me/name', { method: 'PATCH', body: JSON.stringify(data) }),

  // Invitations
  sendInvite: (data) => request('/auth/invite', { method: 'POST', body: JSON.stringify(data) }),
  getInvite: (token) => request(`/auth/invite/${token}`),
  acceptInvite: (data) => request('/auth/accept-invite', { method: 'POST', body: JSON.stringify(data) }),
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
  regenerateCalendarToken: () => request('/calendar/token/regenerate', { method: 'POST' }),

  // Contact
  sendContactMessage: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),

  // Push notifications
  getVapidKey: () => request('/push/vapid-key'),
  subscribePush: (subscription) => request('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  unsubscribePush: (endpoint) => request('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),

  // Admin
  getAdminOverview: () => request('/admin/stats/overview'),
  getAdminRegistrations: (period = '30d') => request(`/admin/stats/registrations?period=${period}`),
  getAdminTasks: (period = '30d') => request(`/admin/stats/tasks?period=${period}`),
  getAdminEvents: (period = '30d') => request(`/admin/stats/events?period=${period}`),
  getAdminFamilies: (page = 1) => request(`/admin/stats/families?page=${page}`),
  getAdminActiveUsers: (period = '30d') => request(`/admin/stats/active-users?period=${period}`),
};
