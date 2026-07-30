import axios from 'axios';

// In dev: empty baseURL lets Vite proxy handle /api requests to localhost:5001
// In production: points directly to the deployed Render backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Prices
export const fetchPrices = () => api.get('/api/prices');
export const updatePrices = (prices) => api.post('/api/prices', prices);

// Page counting
export const countPages = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/count-pages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Orders - matching backend routes at /api/orders
export const createOrder = (file, options) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', JSON.stringify(options));
  return api.post('/api/orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const verifyPayment = (paymentData) => api.post('/api/orders/verify', paymentData);

export const fetchOrders = () => api.get('/api/orders');
export const updateOrderStatus = (id, status) =>
  api.patch(`/api/orders/${id}/status`, { status });

// Stats & Charts
export const fetchStats = () => api.get('/api/orders/stats');
export const fetchChartData = (range = 'month-by-week') =>
  api.get(`/api/orders/chart-data?range=${range}`);

// Auth - matching backend routes at /api/auth
export const login = (username, password) =>
  api.post('/api/auth/login', { username, password });
export const logout = () => api.post('/api/auth/logout');

export default api;
