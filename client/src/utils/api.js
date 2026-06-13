const BASE = '/api';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body, isFormData = false) {
  const headers = { ...authHeader() };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),

  // Sessions
  createSession: (title) => request('POST', '/sessions', { title }),
  getSessions: (status) => request('GET', `/sessions${status ? `?status=${status}` : ''}`),
  getSession: (id) => request('GET', `/sessions/${id}`),
  endSession: (id) => request('POST', `/sessions/${id}/end`),
  validateInvite: (token) => request('GET', `/sessions/join/${token}`),
  uploadRecording: (sessionId, blob) => {
    const form = new FormData();
    form.append('recording', blob, 'recording.webm');
    return request('POST', `/sessions/${sessionId}/recording`, form, true);
  },
  uploadFile: (sessionId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request('POST', `/sessions/${sessionId}/files`, form, true);
  },

  // Admin
  adminSessions: () => request('GET', '/admin/sessions'),
  adminStats: () => request('GET', '/admin/stats'),
  adminEndSession: (id) => request('POST', `/admin/sessions/${id}/end`),
};
