import apiClient from './client';
import type { SalesEntry } from '../types';

export interface SalesDateFilter {
  from?: string;
  to?: string;
}

export const salesApi = {
  getAll: async (params?: SalesDateFilter): Promise<SalesEntry[]> => {
    const { data } = await apiClient.get('/sales', { params });
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getMy: async (_userId: number): Promise<SalesEntry[]> => {
    const { data } = await apiClient.get('/sales/my');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  create: async (payload: {
    userId: number;
    userName?: string;
    shopId: number;
    shopName?: string;
    productName: string;
    quantity: number;
    amount: number;
    remarks?: string;
  }): Promise<SalesEntry> => {
    const { data } = await apiClient.post('/sales', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create sales entry');
    return data.data;
  },

  getSummaryByUser: async (params?: SalesDateFilter): Promise<{ userId: number; userName: string; totalAmount: number; totalOrders: number }[]> => {
    const { data } = await apiClient.get('/sales/summary/by-user', { params });
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};
