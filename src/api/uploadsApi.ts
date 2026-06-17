import apiClient from './client';

export type UploadCategory =
  | 'selfie'
  | 'visit-outside'
  | 'visit-shelf'
  | 'visit-selfie'
  | 'visit-photo'
  | 'shop'
  | 'profile'
  | 'temp';

export interface UploadResult {
  filename: string;
  category: UploadCategory;
  subfolder: string;
  url: string;
  fullUrl: string;
  size: number;
}

export const uploadsApi = {
  /**
   * Upload a Base64 image string (from camera capture / canvas)
   * e.g. selfie from attendance check-in, visit photos
   */
  uploadBase64: async (
    image: string,
    category: UploadCategory = 'temp',
    filename?: string
  ): Promise<UploadResult> => {
    const { data } = await apiClient.post('/uploads/base64', { image, category, filename });
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data.data;
  },

  /**
   * Upload multiple Base64 images in one request
   * Great for uploading all 3 visit photos at once
   */
  uploadBase64Batch: async (
    images: { image: string; category: UploadCategory; filename?: string }[]
  ): Promise<UploadResult[]> => {
    const { data } = await apiClient.post('/uploads/base64/batch', { images });
    if (!data.success) throw new Error(data.message || 'Batch upload failed');
    return data.data;
  },

  /**
   * Upload a file via multipart/form-data
   */
  uploadFile: async (file: File, category: UploadCategory = 'temp'): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('files', file);
    const { data } = await apiClient.post(`/uploads/file?category=${category}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data.data;
  },

  /**
   * Upload multiple files
   */
  uploadFiles: async (files: File[], category: UploadCategory = 'temp'): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const { data } = await apiClient.post(`/uploads/file?category=${category}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return Array.isArray(data.data) ? data.data : [data.data];
  },

  /**
   * Upload attendance selfie (Base64 from canvas capture)
   */
  uploadSelfie: async (base64Image: string): Promise<UploadResult> => {
    return uploadsApi.uploadBase64(base64Image, 'selfie');
  },

  /**
   * Upload all 3 visit photos at once
   */
  uploadVisitPhotos: async (photos: {
    photoType: 'OutsideShop' | 'ShelfPhoto' | 'SelfieWithShopkeeper';
    photoUrl: string;
  }[]): Promise<UploadResult[]> => {
    const categoryMap: Record<string, UploadCategory> = {
      OutsideShop:          'visit-outside',
      ShelfPhoto:           'visit-shelf',
      SelfieWithShopkeeper: 'visit-selfie',
    };

    const images = photos.map(p => ({
      image: p.photoUrl,
      category: categoryMap[p.photoType] || 'visit-photo' as UploadCategory,
    }));

    return uploadsApi.uploadBase64Batch(images);
  },

  /**
   * Delete an uploaded file
   */
  deleteFile: async (category: UploadCategory, filename: string): Promise<void> => {
    const { data } = await apiClient.delete(`/uploads/file/${category}/${filename}`);
    if (!data.success) throw new Error(data.message || 'Delete failed');
  },

  /**
   * Get upload folder info (admin)
   */
  getInfo: async () => {
    const { data } = await apiClient.get('/uploads/info');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};
