import apiClient from './client';
import type { Category, CategorySyncReport } from '../types';

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await apiClient.get('/categories');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  create: async (payload: Partial<Category>): Promise<Category> => {
    const { data } = await apiClient.post('/categories', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create category');
    return data.data;
  },

  update: async (id: number, payload: Partial<Category>): Promise<Category> => {
    const { data } = await apiClient.put(`/categories/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update category');
    return data.data;
  },

  discontinue: async (id: number): Promise<Category> => {
    const { data } = await apiClient.patch(`/categories/${id}/discontinue`);
    if (!data.success) throw new Error(data.message || 'Failed to discontinue category');
    return data.data;
  },

  reactivate: async (id: number): Promise<Category> => {
    const { data } = await apiClient.patch(`/categories/${id}/reactivate`);
    if (!data.success) throw new Error(data.message || 'Failed to reactivate category');
    return data.data;
  },

  /**
   * Phase 2.4 – pull categories from the external MIS API.
   *  - Records whose MIS primary key already exists in the
   *    `mis_id` (Sync PK) column are skipped.
   *  - All other records are inserted.
   *  - The backend returns a full report listing saved + skipped rows,
   *    which the page then displays at the end of the sync.
   */
  syncFromMIS: async (apiUrl?: string): Promise<{ message: string; report: CategorySyncReport }> => {
    const { data } = await apiClient.post('/categories/sync', apiUrl ? { apiUrl } : {});
    if (!data.success) throw new Error(data.message || 'Sync failed');
    return { message: data.message, report: data.report };
  },
};
