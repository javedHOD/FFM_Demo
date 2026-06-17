import apiClient from './client';
import type { User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', credentials);
    if (!data.success) throw new Error(data.message || 'Login failed');
    return data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore errors on logout
    }
  },

  me: async (_token: string): Promise<User> => {
    const { data } = await apiClient.get('/auth/me');
    if (!data.success) throw new Error(data.message || 'Failed to get user');
    return data.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    if (!data.success) throw new Error(data.message || 'Email not found');
  },
};
