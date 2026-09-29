import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyPhoneOtp: (data) => api.post('/auth/verify-phone-otp', data),
  resendPhoneOtp: (data) => api.post('/auth/resend-phone-otp', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/users/me'),
};

// Cities API
export const citiesAPI = {
  getAll: () => api.get('/cities/'),
  getById: (id) => api.get(`/cities/${id}`),
  search: (q) => api.get(`/cities/search?q=${q}`),
  create: (data) => api.post('/cities/', data),
  update: (id, data) => api.put(`/cities/${id}`, data),
  delete: (id) => api.delete(`/cities/${id}`),
  addAttraction: (cityId, data) => api.post(`/cities/${cityId}/attractions`, data),
  updateAttraction: (id, data) => api.put(`/cities/attractions/${id}`, data),
  deleteAttraction: (id) => api.delete(`/cities/attractions/${id}`),
  addFood: (cityId, data) => api.post(`/cities/${cityId}/foods`, data),
  updateFood: (id, data) => api.put(`/cities/foods/${id}`, data),
  deleteFood: (id) => api.delete(`/cities/foods/${id}`),
};

// Hotels API
export const hotelsAPI = {
  getAll: () => api.get('/hotels/'),
  getByCity: (cityId) => api.get(`/hotels/city/${cityId}`),
  getById: (id) => api.get(`/hotels/${id}`),
  create: (data) => api.post('/hotels/', data),
  update: (id, data) => api.put(`/hotels/${id}`, data),
  delete: (id) => api.delete(`/hotels/${id}`),
  addRoomType: (hotelId, data) => api.post(`/hotels/${hotelId}/room-types`, data),
  updateRoomType: (id, data) => api.put(`/hotels/room-types/${id}`, data),
  deleteRoomType: (id) => api.delete(`/hotels/room-types/${id}`),
};

// Inventory API
export const inventoryAPI = {
  checkAvailability: (data) => api.post('/inventory/check-availability', data),
  bulkCreate: (data) => api.post('/inventory/bulk-create', data),
  getByRoomType: (id, start, end) => api.get(`/inventory/room-type/${id}?start_date=${start}&end_date=${end}`),
  update: (id, data) => api.put(`/inventory/${id}`, data),
};

// Reservations API
export const reservationsAPI = {
  getMy: () => api.get('/reservations/my'),
  getById: (bookingId) => api.get(`/reservations/${bookingId}`),
  getAll: (params) => api.get('/reservations/', { params }),
  create: (data) => api.post('/reservations/', data),
  cancel: (bookingId) => api.post(`/reservations/${bookingId}/cancel`),
  update: (bookingId, data) => api.put(`/reservations/${bookingId}`, data),
};

// Itineraries API
export const itinerariesAPI = {
  getByCity: (cityId) => api.get(`/itineraries/city/${cityId}`),
  getById: (id) => api.get(`/itineraries/${id}`),
  create: (data) => api.post('/itineraries/', data),
  update: (id, data) => api.put(`/itineraries/${id}`, data),
  delete: (id) => api.delete(`/itineraries/${id}`),
};

// Conversations API
export const conversationsAPI = {
  getMy: () => api.get('/conversations/my'),
  getById: (id) => api.get(`/conversations/${id}`),
  getAll: () => api.get('/conversations/'),
};

// Assistant API
export const assistantAPI = {
  chat: (data) => api.post('/assistant/chat', data, { timeout: 90000 }),
  voice: (formData) => api.post('/assistant/voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  tts: (text, lang) => api.post(`/assistant/tts?text=${encodeURIComponent(text)}&language=${lang}`, null, {
    responseType: 'arraybuffer',
  }),
};

// Feedback API
export const feedbackAPI = {
  submit: (data) => api.post('/feedback/', data),
  getMy: () => api.get('/feedback/my'),
  getAll: () => api.get('/feedback/'),
};

// Documents API
export const documentsAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  process: (id) => api.post(`/documents/${id}/process`),
  getAll: () => api.get('/documents/'),
  getById: (id) => api.get(`/documents/${id}`),
  delete: (id) => api.delete(`/documents/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getDailyCalls: (days) => api.get(`/analytics/calls/daily?days=${days || 30}`),
  getMonthlyCalls: (months) => api.get(`/analytics/calls/monthly?months=${months || 12}`),
  getBookingTrends: (days) => api.get(`/analytics/bookings/trends?days=${days || 30}`),
  getConversionRates: (days) => api.get(`/analytics/conversion-rates?days=${days || 30}`),
  getRevenueByCity: () => api.get('/analytics/revenue/by-city'),
};

// Admin API
export const adminAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getCallLogs: () => api.get('/admin/call-logs'),
  getUsers: () => api.get('/admin/users'),
  callUser: (id) => api.post(`/admin/users/${id}/call`),
};

// Twilio Voice SDK API
export const twilioAPI = {
  getToken: () => api.get('/twilio/token'),
};

export default api;
