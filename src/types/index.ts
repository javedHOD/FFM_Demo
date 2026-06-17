export type Role = 'Promoter' | 'City Manager' | 'Regional Manager' | 'National Sales Manager' | 'Admin';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: Role;
  regionId?: number;
  regionName?: string;
  multiRegionIds?: number[];
  multiRegionNames?: string[];
  cityId?: number;
  cityName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Region {
  id: number;
  name: string;
}

export interface City {
  id: number;
  regionId: number;
  regionName?: string;
  name: string;
}

export interface Shop {
  id: number;
  shopName: string;
  shopType: string;
  address: string;
  cityId: number;
  cityName?: string;
  regionId: number;
  regionName?: string;
  latitude?: number;
  longitude?: number;
  assignedUserId?: number;
  assignedUserName?: string;
  contactPerson?: string;
  contactNo?: string;
  contactNo2?: string;
  ntnNo?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Attendance {
  id: number;
  userId: number;
  userName?: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  selfieUrl?: string;
  status: 'CheckedIn' | 'CheckedOut' | 'Absent' | 'Late';
  createdAt: string;
}

export interface Visit {
  id: number;
  userId: number;
  userName?: string;
  shopId: number;
  shopName?: string;
  visitStartTime: string;
  visitEndTime?: string;
  latitude?: number;
  longitude?: number;
  durationMinutes?: number;
  remarks?: string;
  status: 'InProgress' | 'Completed' | 'Cancelled';
  photos?: VisitPhoto[];
  createdAt: string;
}

export interface VisitPhoto {
  id: number;
  visitId: number;
  photoType: 'OutsideShop' | 'ShelfPhoto' | 'SelfieWithShopkeeper';
  photoUrl: string;
  createdAt: string;
}

export interface SalesEntry {
  id: number;
  userId: number;
  userName?: string;
  shopId: number;
  shopName?: string;
  productName: string;
  quantity: number;
  amount: number;
  remarks?: string;
  createdAt: string;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  productName: string;
  quantity: number;
  status?: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: number;
  approvedByName?: string;
  approvalRemarks?: string;
  updatedAt?: string;
}

export interface Order {
  id: number;
  userId: number;
  userName?: string;
  shopId: number;
  shopName?: string;
  orderType: 'RetailerToMD' | 'MDToDistributor';
  productName: string;
  quantity: number;
  items?: OrderItem[];
  remarks?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Partially Approved';
  approvedBy?: number;
  approvedByName?: string;
  approvalRemarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardStats {
  todayVisits: number;
  pendingVisits: number;
  completedVisits: number;
  attendanceStatus: string;
  totalOrders: number;
  pendingOrders: number;
  salesAmount: number;
  photosUploaded: number;
  gpsCompliance: number;
  totalUsers?: number;
  activeFieldStaff?: number;
  pendingApprovals?: number;
  totalShops?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
