import apiClient from './client';
import type { Attendance } from '../types';

export interface AttendancePageData {
  todayAttendance: Attendance | null;
  history: Attendance[];
}

export const attendanceApi = {
  getAttendancePage: async (): Promise<AttendancePageData> => {
    const { data } = await apiClient.get('/attendance/attendance-page');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getAll: async (): Promise<Attendance[]> => {
    const { data } = await apiClient.get('/attendance');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getMy: async (_userId: number): Promise<Attendance[]> => {
    const { data } = await apiClient.get('/attendance/my');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getTodayStatus: async (_userId: number): Promise<Attendance | null> => {
    const { data } = await apiClient.get('/attendance/today');
    if (!data.success) return null;
    return data.data;
  },

  checkIn: async (payload: {
    userId: number;
    latitude?: number;
    longitude?: number;
    selfieUrl?: string;
  }): Promise<Attendance> => {
    const { data } = await apiClient.post('/attendance/check-in', payload);
    if (!data.success) throw new Error(data.message || 'Check-in failed');
    return data.data;
  },

  checkOut: async (payload: {
    attendanceId: number;
    latitude?: number;
    longitude?: number;
  }): Promise<Attendance> => {
    const { data } = await apiClient.post('/attendance/check-out', payload);
    if (!data.success) throw new Error(data.message || 'Check-out failed');
    return data.data;
  },
};
