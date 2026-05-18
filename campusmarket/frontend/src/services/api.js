const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const getToken = () => localStorage.getItem('campustrade_token');

const request = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
};

const get  = (path)        => request('GET',    path);
const post = (path, body)  => request('POST',   path, body);
const patch= (path, body)  => request('PATCH',  path, body);
const del  = (path)        => request('DELETE', path);

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login:       (email, password) => post('/api/auth/login', { email, password }),
  register:    (data)            => post('/api/auth/register', data),
  verifyEmail: (token)           => get(`/api/auth/verify/${token}`),

  // ── Users ─────────────────────────────────────────────────────────────────
  getMe:       ()       => get('/api/users/me'),
  getUser:     (id)     => get(`/api/users/${id}`),
  updateMe:    (data)   => patch('/api/users/me', data),
  reviewUser:  (id, d)  => post(`/api/users/${id}/reviews`, d),

  // ── Listings ──────────────────────────────────────────────────────────────
  getListings:   (params = {}) => get(`/api/listings?${new URLSearchParams(params)}`),
  getListing:    (id)          => get(`/api/listings/${id}`),
  createListing: (data)        => post('/api/listings', data),
  updateListing: (id, data)    => patch(`/api/listings/${id}`, data),
  deleteListing: (id)          => del(`/api/listings/${id}`),
  makeOffer:     (id, data)    => post(`/api/listings/${id}/offers`, data),
  buyNow:        (id, data)    => post(`/api/listings/${id}/buy`, data),
  getMyListings: ()            => get('/api/listings?mine=true'),

  // ── Search ────────────────────────────────────────────────────────────────
  search:      (params) => get(`/api/search?${new URLSearchParams(params)}`),
  suggestions: (q)      => get(`/api/search/suggestions?q=${encodeURIComponent(q)}`),
  trending:    ()       => get('/api/search/trending'),

  // ── Chat ──────────────────────────────────────────────────────────────────
  getConversations:  ()        => get('/api/conversations'),
  getMessages:       (id)      => get(`/api/conversations/${id}/messages`),
  startConversation: (data)    => post('/api/conversations', data),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: ()  => get('/api/notifications'),
  markAllRead:      ()  => patch('/api/notifications/read-all'),

  // ── Reports ───────────────────────────────────────────────────────────────
  fileReport: (data) => post('/api/reports', data),

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminStats:     ()           => get('/api/admin/stats'),
  adminUsers:     ()           => get('/api/admin/users'),
  suspendUser:    (id, data)   => post(`/api/admin/users/${id}/suspend`, data),
  unsuspendUser:  (id)         => post(`/api/admin/users/${id}/unsuspend`),
  adminReports:   ()           => get('/api/admin/reports'),
  resolveReport:  (id, data)   => patch(`/api/admin/reports/${id}`, data),
  fraudFlags:     ()           => get('/api/admin/fraud-flags'),
  adminListings:  ()           => get('/api/listings'),

  // ── AI ────────────────────────────────────────────────────────────────────
  priceSuggestion: (data) => post('/api/ai/price-suggestion', data),
};

export const saveToken  = (token) => localStorage.setItem('campustrade_token', token);
export const clearToken = ()      => localStorage.removeItem('campustrade_token');
