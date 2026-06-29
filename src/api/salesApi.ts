import apiClient from './client';
import type { SalesEntry, Shop } from '../types';

export interface SalesDateFilter {
  from?: string;
  to?: string;
}

export interface AdminSalesPageData {
  sales: SalesEntry[];
  salesByUser: { userId: number; userName: string; totalAmount: number; totalOrders: number }[];
}

export interface SalesPageData {
  sales: SalesEntry[];
  shops: Shop[];
}

export const salesApi = {
  getSalesPage: async (): Promise<SalesPageData> => {
    const { data } = await apiClient.get('/sales/sales-page');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getAdminSalesPage: async (params?: SalesDateFilter): Promise<AdminSalesPageData> => {
    const { data } = await apiClient.get('/sales/admin-sales-page', { params });
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

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
