import apiClient from './client';
import type { Visit, VisitPhoto } from '../types';

export const visitsApi = {
  getAll: async (): Promise<Visit[]> => {
    const { data } = await apiClient.get('/visits');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getMy: async (_userId: number): Promise<Visit[]> => {
    const { data } = await apiClient.get('/visits/my');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getById: async (id: number): Promise<Visit> => {
    const { data } = await apiClient.get(`/visits/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  startVisit: async (payload: {
    userId: number;
    shopId: number;
    shopName: string;
    latitude?: number;
    longitude?: number;
  }): Promise<Visit> => {
    const { data } = await apiClient.post('/visits/start', payload);
    if (!data.success) throw new Error(data.message || 'Failed to start visit');
    return data.data;
  },

  completeVisit: async (id: number, payload: { remarks?: string; photos?: string[] }): Promise<Visit> => {
    const { data } = await apiClient.post(`/visits/${id}/complete`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to complete visit');
    return data.data;
  },

  uploadPhotos: async (visitId: number, photos: { photoType: 'OutsideShop' | 'ShelfPhoto' | 'SelfieWithShopkeeper'; photoUrl: string }[]): Promise<VisitPhoto[]> => {
    const { data } = await apiClient.post(`/visits/${visitId}/photos`, { photos });
    if (!data.success) throw new Error(data.message || 'Failed to upload photos');
    return data.data;
  },
};
