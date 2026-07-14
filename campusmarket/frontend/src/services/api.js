// Production is served behind the same ingress as the API gateway, so an
// unset value must use same-origin requests. Local Compose supplies its own
// explicit VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('campustrade_token');

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
  login:        (email, password) => post('/api/auth/login', { email, password }),
  register:     (data)            => post('/api/auth/register', data),
  verifyEmail:  (token)           => get(`/api/auth/verify/${token}`),
  googleLogin:  (credential)      => post('/api/auth/google', { credential }),
  logout:      ()               => post('/api/auth/logout'),
  refresh:     ()               => post('/api/auth/refresh'),
  forgotPassword: (email)       => post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => post('/api/auth/reset-password', { token, password }),
  resendVerification: (email)    => post('/api/auth/resend-verification', { email }),

  // ── Users ─────────────────────────────────────────────────────────────────
  getMe:       ()       => get('/api/users/me'),
  getUser:     (id)     => get(`/api/users/${id}`),
  updateMe:    (data)   => patch('/api/users/me', data),
  reviewUser:  (id, d)  => post(`/api/users/${id}/reviews`, d),
  getTransactions: ()   => get('/api/users/me/transactions'),

  // ── Wishlist ──────────────────────────────────────────────────────────────
  getWishlist:     ()            => get('/api/wishlist'),
  addWishlist:     (listingId)   => post(`/api/wishlist/${listingId}`),
  removeWishlist:  (listingId)   => del(`/api/wishlist/${listingId}`),

  // ── Listings ──────────────────────────────────────────────────────────────
  getListings:   (params = {}) => get(`/api/listings?${new URLSearchParams(params)}`),
  getListing:    (id)          => get(`/api/listings/${id}`),
  createListing: (data)        => post('/api/listings', data),
  updateListing: (id, data)    => patch(`/api/listings/${id}`, data),
  deleteListing: (id)          => del(`/api/listings/${id}`),
  sellListing:   (id, data)    => patch(`/api/listings/${id}/sell`, data),
  uploadImages:  (id, formData)=> {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/listings/${id}/images`, { method: 'POST', headers, body: formData }).then(r => r.json());
  },
  makeOffer:     (id, data)    => post(`/api/listings/${id}/offers`, data),
  getOffers:     (id)          => get(`/api/listings/${id}/offers`),
  buyNow:        (id, data)    => post(`/api/listings/${id}/buy`, data),
  getMyListings: ()            => get('/api/listings?mine=true'),

  // ── Search ────────────────────────────────────────────────────────────────
  search:      (params) => get(`/api/search?${new URLSearchParams(params)}`),
  suggestions: (q)      => get(`/api/search/suggestions?q=${encodeURIComponent(q)}`),
  trending:    ()       => get('/api/search/trending'),

  // ── Offers ────────────────────────────────────────────────────────────────
  createOffer:   (data)        => post('/api/offers', data),
  getMyOffers:   (direction)   => get(`/api/offers?direction=${direction}`),
  updateOffer:   (id, data)    => patch(`/api/offers/${id}`, data),

  // ── Chat ──────────────────────────────────────────────────────────────────
  getConversations:  ()          => get('/api/conversations'),
  getMessages:       (id)        => get(`/api/conversations/${id}/messages`),
  startConversation: (data)      => post('/api/conversations', data),
  sendMessage:       (id, data)  => post(`/api/conversations/${id}/messages`, data),
  markRead:          (id)      => patch(`/api/conversations/${id}/read`),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: ()  => get('/api/notifications'),
  getUnreadCount:   ()  => get('/api/notifications/unread-count'),
  markReadNotif:    (id) => patch(`/api/notifications/${id}/read`),
  markAllRead:      ()     => patch('/api/notifications/read-all'),
  subscribePush:    (data) => post('/api/notifications/push/subscribe', data),
  unsubscribePush:  (data) => post('/api/notifications/push/unsubscribe', data),

  // ── Reports ───────────────────────────────────────────────────────────────
  fileReport: (data) => post('/api/reports', data),

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminStats:     ()           => get('/api/admin/stats'),
  adminPublicStats: ()         => get('/api/admin/public-stats'),
  adminUsers:     (params={})   => get(`/api/admin/users?${new URLSearchParams(params)}`),
  suspendUser:    (id, data)   => post(`/api/admin/users/${id}/suspend`, data),
  unsuspendUser:  (id)         => post(`/api/admin/users/${id}/unsuspend`),
  adminReports:   ()           => get('/api/admin/reports'),
  resolveReport:  (id, data)   => patch(`/api/admin/reports/${id}`, data),
  fraudFlags:     ()           => get('/api/admin/fraud-flags'),
  resolveFraud:   (id)         => patch(`/api/admin/fraud-flags/${id}/resolve`),
  adminListings:  ()           => get('/api/listings'),

  // ── AI ────────────────────────────────────────────────────────────────────
  priceSuggestion: (data) => post('/api/ai/price-suggestion', data),
  fraudCheck:        (data) => post('/api/ai/fraud-check', data),
  listingFraudFlags: (id)  => get(`/api/admin/listing-flags/${id}`),
  aiTrending:        ()    => get('/api/ai/trending'),
};

export const saveToken  = (token) => localStorage.setItem('campustrade_token', token);
export const clearToken = ()      => localStorage.removeItem('campustrade_token');
