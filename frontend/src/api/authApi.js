import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pushhub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pushhub_token');
      localStorage.removeItem('pushhub_user');
      window.dispatchEvent(new Event('auth-changed'));
    }
    return Promise.reject(err);
  }
);

export const loginAdmin = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const getMe = () => {
  return api.get('/auth/me');
};

export const updateProfile = (data) => {
  return api.put('/auth/update-profile', data);
};

export const getSystemSettings = () => {
  return api.get('/settings/config');
};

export default api;
