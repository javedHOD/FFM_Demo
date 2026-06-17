import apiClient from './client';
import type { DashboardStats, Visit, Attendance, SalesEntry, Order } from '../types';

export const reportsApi = {
  getDashboard: async (userId: number, roleName: string): Promise<DashboardStats> => {
    const { data } = await apiClient.get(`/reports/dashboard?userId=${userId}&roleName=${encodeURIComponent(roleName)}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getVisitReport: async (): Promise<Visit[]> => {
    const { data } = await apiClient.get('/reports/visits');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getAttendanceReport: async (): Promise<Attendance[]> => {
    const { data } = await apiClient.get('/reports/attendance');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getSalesReport: async (): Promise<SalesEntry[]> => {
    const { data } = await apiClient.get('/reports/sales');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getOrderReport: async (): Promise<Order[]> => {
    const { data } = await apiClient.get('/reports/orders');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getWeeklyVisitData: async (): Promise<{ day: string; visits: number; completed: number }[]> => {
    const { data } = await apiClient.get('/reports/weekly-visits');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getMonthlySalesData: async (): Promise<{ month: string; amount: number }[]> => {
    const { data } = await apiClient.get('/reports/monthly-sales');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};
