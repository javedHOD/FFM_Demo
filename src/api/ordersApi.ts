import apiClient from './client';
import type { Order, OrderItem } from '../types';

export const ordersApi = {
  getAll: async (): Promise<Order[]> => {
    const { data } = await apiClient.get('/orders');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getMy: async (_userId: number): Promise<Order[]> => {
    const { data } = await apiClient.get('/orders/my');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getById: async (id: number): Promise<Order> => {
    const { data } = await apiClient.get(`/orders/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  create: async (payload: {
    userId: number;
    userName?: string;
    shopId: number;
    shopName?: string;
    orderType: 'RetailerToMD' | 'MDToDistributor';
    productName?: string;
    quantity?: number;
    items?: OrderItem[];
    remarks?: string;
  }): Promise<Order> => {
    const { data } = await apiClient.post('/orders', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create order');
    return data.data;
  },

  updateStatus: async (
    id: number,
    status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Partially Approved',
    approvedBy?: number,
    approvedByName?: string,
    approvalRemarks?: string
  ): Promise<Order> => {
    const { data } = await apiClient.put(`/orders/${id}/status`, { status, approvedBy, approvedByName, approvalRemarks });
    if (!data.success) throw new Error(data.message || 'Failed to update order status');
    return data.data;
  },

  updateItemStatus: async (
    orderId: number,
    itemId: number,
    status: 'Approved' | 'Rejected',
    approvedBy?: number,
    approvedByName?: string,
    approvalRemarks?: string
  ): Promise<Order> => {
    const { data } = await apiClient.put(`/orders/${orderId}/items/${itemId}/status`, {
      status,
      approvedBy,
      approvedByName,
      approvalRemarks,
    });
    if (!data.success) throw new Error(data.message || 'Failed to update item status');
    return data.data;
  },

  getPending: async (): Promise<Order[]> => {
    const { data } = await apiClient.get('/orders/pending');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};
