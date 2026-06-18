import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { createMockAdapter } from './mockAdapter';
import { redirectToLogin } from '../utils/navigation';

const API_BASE_URL =  import.meta.env.VITE_API_URL || 'http://104.238.162.4:3500/api' //'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

if (import.meta.env.VITE_USE_MOCK === 'true') {
  apiClient.defaults.adapter = createMockAdapter();
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/logout');

    if (error.response?.status === 401 && !isAuthRequest) {
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (isAuthenticated) {
        logout();
        redirectToLogin();
      }
    }
    // Surface the server's error message instead of a generic axios message
    const serverMessage = error.response?.data?.message;
    const message = serverMessage || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
