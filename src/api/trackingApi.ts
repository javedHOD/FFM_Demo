import apiClient from './client';
import type { User, Attendance, Visit } from '../types';

export interface FieldStaffTracking {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'roleId' | 'roleName' | 'regionName' | 'cityName'>;
  attendance: Attendance | null;
  activeVisit: Visit | null;
  lastUpdate: string;
}

export interface LiveTrackingPageData {
  staffTracking: FieldStaffTracking[];
}

export const trackingApi = {
  getLiveTrackingPage: async (): Promise<LiveTrackingPageData> => {
    const { data } = await apiClient.get('/tracking/live-tracking-page');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};
