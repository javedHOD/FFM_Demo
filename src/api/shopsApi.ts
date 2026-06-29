import apiClient from './client';
import type { Shop, Region, City, User } from '../types';

export interface ShopsPageData {
  shops: Shop[];
  regions: Region[];
  cities: City[];
  users: Pick<User, 'id' | 'fullName' | 'roleName'>[];
}

export const shopsApi = {
  getShopsPage: async (): Promise<ShopsPageData> => {
    const { data } = await apiClient.get('/shops/shops-page');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getAll: async (userId?: number): Promise<Shop[]> => {
    const url = userId ? `/shops?userId=${userId}` : '/shops';
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getById: async (id: number): Promise<Shop> => {
    const { data } = await apiClient.get(`/shops/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  create: async (payload: Partial<Shop>): Promise<Shop> => {
    const { data } = await apiClient.post('/shops', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create shop');
    return data.data;
  },

  update: async (id: number, payload: Partial<Shop>): Promise<Shop> => {
    const { data } = await apiClient.put(`/shops/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update shop');
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/shops/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete shop');
  },
};
