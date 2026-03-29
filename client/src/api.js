const API_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('familysync_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  // Help Requests
  createRequest: (data) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
  getRequests: () => request('/requests'),
  respondToRequest: (id, status) => request(`/requests/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Contact
  sendContactMessage: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),
};
