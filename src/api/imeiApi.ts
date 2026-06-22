import apiClient from './client';
import type { IMEIVerificationResult, IMEIVerificationLog } from '../types/imei';

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
