import apiClient from './client';
import type { Product, ProductSyncReport, ProductSyncBlockedReport } from '../types';

/** Returned when the sync is HALTED because some MIS categories aren't synced yet. */
export interface ProductSyncBlocked {
  blocked: true;
  message: string;
  report: ProductSyncBlockedReport;
}

/** Returned when the sync ran end-to-end. */
export interface ProductSyncOk {
  blocked: false;
  message: string;
  report: ProductSyncReport;
}

export type ProductSyncResult = ProductSyncBlocked | ProductSyncOk;

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await apiClient.get('/products');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  create: async (payload: Partial<Product>): Promise<Product> => {
    const { data } = await apiClient.post('/products', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create product');
    return data.data;
  },

  update: async (id: number, payload: Partial<Product>): Promise<Product> => {
    const { data } = await apiClient.put(`/products/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update product');
    return data.data;
  },

  discontinue: async (id: number): Promise<Product> => {
    const { data } = await apiClient.patch(`/products/${id}/discontinue`);
    if (!data.success) throw new Error(data.message || 'Failed to discontinue product');
    return data.data;
  },

  reactivate: async (id: number): Promise<Product> => {
    const { data } = await apiClient.patch(`/products/${id}/reactivate`);
    if (!data.success) throw new Error(data.message || 'Failed to reactivate product');
    return data.data;
  },

  /**
   * Phase 2.5 sync flow:
   *   1. PRE-CHECK — every MIS category id in the payload must already exist
   *      in our `categories.mis_id` column. If any are missing the backend
   *      responds with HTTP 409 + code 'CATEGORIES_NOT_SYNCED' and returns the
   *      list of missing categories.  We surface that as { blocked: true, ... }.
   *   2. IMPORT — otherwise products are upserted (insert new / update existing
   *      by mis_id) and the backend returns a full report.
   */
  syncFromMIS: async (apiUrl?: string): Promise<ProductSyncResult> => {
    try {
      const { data } = await apiClient.post('/products/sync', apiUrl ? { apiUrl } : {});
      if (!data.success) throw new Error(data.message || 'Sync failed');
      return { blocked: false, message: data.message, report: data.report as ProductSyncReport };
    } catch (err: any) {
      // Axios interceptor already converts to Error; for the 409 case we want
      // the structured report — fall back to a direct call so we can read it.
      const direct = await apiClient.post('/products/sync', apiUrl ? { apiUrl } : {}, {
        validateStatus: () => true,
      });
      const body = direct.data || {};
      if (direct.status === 409 && body?.code === 'CATEGORIES_NOT_SYNCED') {
        return { blocked: true, message: body.message, report: body.report as ProductSyncBlockedReport };
      }
      if (body?.success === false) throw new Error(body.message || err.message || 'Sync failed');
      if (body?.success === true)  return { blocked: false, message: body.message, report: body.report as ProductSyncReport };
      throw err;
    }
  },
};
