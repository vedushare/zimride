import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zimride_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const sendOtp = (phone) => api.post('/auth/send-otp', { phone });
export const verifyOtp = (phone, otp) => api.post('/auth/verify-otp', { phone, otp });
export const verifyPhone = (otp) => api.post('/auth/verify-phone', { otp });
export const resendOtp = () => api.post('/auth/resend-otp');

// Rides
export const getRides = (params) => api.get('/rides', { params });
export const getRide = (id) => api.get(`/rides/${id}`);
export const postRide = (data) => api.post('/rides', data);
export const updateRide = (id, data) => api.put(`/rides/${id}`, data);
export const cancelRide = (id) => api.delete(`/rides/${id}`);

// Bookings
export const bookRide = (data) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const getRideBookings = (rideId) => api.get(`/bookings/ride/${rideId}`);
export const updateBookingStatus = (id, status) => api.put(`/bookings/${id}/status`, { status });

// Users
export const getUser = (id) => api.get(`/users/${id}`);
export const updateProfile = (data) => api.put('/users/me', data);
export const getMyRides = () => api.get('/users/me/rides');
export const reviewUser = (id, data) => api.post(`/users/${id}/review`, data);

export default api;
