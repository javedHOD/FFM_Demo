import apiClient from './client';
import type { User, Region, City, Shop } from '../types';
import type { Employee } from '../types/hr';

export interface UsersPageData {
  users: User[];
  regions: Region[];
  cities: City[];
  employees: Employee[];
  shops: Shop[];
}

export const usersApi = {
  getUsersPage: async (): Promise<UsersPageData> => {
    const { data } = await apiClient.get('/users/users-page');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get('/users');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getById: async (id: number): Promise<User> => {
    const { data } = await apiClient.get(`/users/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  create: async (userData: Partial<User> & { password?: string }): Promise<User> => {
    const { data } = await apiClient.post('/users', userData);
    if (!data.success) throw new Error(data.message || 'Failed to create user');
    return data.data;
  },

  update: async (id: number, userData: Partial<User> & { password?: string }): Promise<User> => {
    const { data } = await apiClient.put(`/users/${id}`, userData);
    if (!data.success) throw new Error(data.message || 'Failed to update user');
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/users/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete user');
  },

  getRegions: async (): Promise<Region[]> => {
    const { data } = await apiClient.get('/users/meta/regions');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getCities: async (regionId?: number): Promise<City[]> => {
    const url = regionId ? `/users/meta/cities?regionId=${regionId}` : '/users/meta/cities';
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};
