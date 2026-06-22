import apiClient from './client';
import type { IMEIVerificationResult, IMEIVerificationLog, ImeiAdminSettings } from '../types/imei';

export const imeiApi = {
  verify: async (payload: {
    visitId: number;
    shopId: number;
    shopName: string;
    IMEI: string;
    Lat?: number;
    Long?: number;
  }): Promise<{ status: string; message: string; data?: IMEIVerificationResult }> => {
    const { data } = await apiClient.post('/imei/verify', payload);
    return data;
  },

  getLogs: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    region?: string;
    city?: string;
    promoterId?: number;
    shopId?: number;
    imei?: string;
    productCategory?: string;
  }): Promise<IMEIVerificationLog[]> => {
    const { data } = await apiClient.get('/imei/logs', { params });
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getSettings: async (): Promise<ImeiAdminSettings> => {
    const { data } = await apiClient.get('/imei/settings');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  saveSettings: async (settings: ImeiAdminSettings): Promise<void> => {
    const { data } = await apiClient.put('/imei/settings', settings);
    if (!data.success) throw new Error(data.message);
  },

  exportLogs: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    region?: string;
    city?: string;
    promoterId?: number;
    shopId?: number;
    imei?: string;
    productCategory?: string;
  }): Promise<string> => {
    const { data } = await apiClient.get('/imei/logs/export', { params, responseType: 'blob' });
    return URL.createObjectURL(data);
  },
};
