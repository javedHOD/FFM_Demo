import type { User, Shop, Attendance, Visit, SalesEntry, Order, DashboardStats, Region, City } from '../types';

export const mockUsers: User[] = [
  { id: 1, fullName: 'Ahmed Al-Rashid', email: 'admin@fieldforce.com', phone: '+966501234567', roleId: 5, roleName: 'Admin', regionId: 1, regionName: 'Central', cityId: 1, cityName: 'Riyadh', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, fullName: 'Mohammed Al-Qahtani', email: 'nsm@fieldforce.com', phone: '+966502345678', roleId: 4, roleName: 'National Sales Manager', regionId: 1, regionName: 'Central', cityId: 1, cityName: 'Riyadh', isActive: true, createdAt: '2024-01-02T00:00:00Z' },
  { id: 3, fullName: 'Khalid Al-Otaibi', email: 'rm@fieldforce.com', phone: '+966503456789', roleId: 3, roleName: 'Regional Manager', regionId: 1, regionName: 'Central', cityId: 1, cityName: 'Riyadh', isActive: true, createdAt: '2024-01-03T00:00:00Z' },
  { id: 4, fullName: 'Fahad Al-Dosari', email: 'cm@fieldforce.com', phone: '+966504567890', roleId: 2, roleName: 'City Manager', regionId: 1, regionName: 'Central', cityId: 1, cityName: 'Riyadh', isActive: true, createdAt: '2024-01-04T00:00:00Z' },
  { id: 5, fullName: 'Omar Al-Shamri', email: 'promoter@fieldforce.com', phone: '+966505678901', roleId: 1, roleName: 'Promoter', regionId: 1, regionName: 'Central', cityId: 1, cityName: 'Riyadh', isActive: true, createdAt: '2024-01-05T00:00:00Z' },
  { id: 6, fullName: 'Saad Al-Ghamdi', email: 'promoter2@fieldforce.com', phone: '+966506789012', roleId: 1, roleName: 'Promoter', regionId: 2, regionName: 'Western', cityId: 3, cityName: 'Jeddah', isActive: true, createdAt: '2024-01-06T00:00:00Z' },
  { id: 7, fullName: 'Nawaf Al-Harbi', email: 'cm2@fieldforce.com', phone: '+966507890123', roleId: 2, roleName: 'City Manager', regionId: 2, regionName: 'Western', cityId: 3, cityName: 'Jeddah', isActive: false, createdAt: '2024-01-07T00:00:00Z' },
  { id: 8, fullName: 'Turki Al-Mutairi', email: 'promoter3@fieldforce.com', phone: '+966508901234', roleId: 1, roleName: 'Promoter', regionId: 3, regionName: 'Eastern', cityId: 5, cityName: 'Dammam', isActive: true, createdAt: '2024-01-08T00:00:00Z' },
];

export const mockRegions: Region[] = [
  { id: 1, name: 'Central' },
  { id: 2, name: 'Western' },
  { id: 3, name: 'Eastern' },
  { id: 4, name: 'Northern' },
  { id: 5, name: 'Southern' },
];

export const mockCities: City[] = [
  { id: 1, regionId: 1, regionName: 'Central', name: 'Riyadh' },
  { id: 2, regionId: 1, regionName: 'Central', name: 'Al-Kharj' },
  { id: 3, regionId: 2, regionName: 'Western', name: 'Jeddah' },
  { id: 4, regionId: 2, regionName: 'Western', name: 'Mecca' },
  { id: 5, regionId: 3, regionName: 'Eastern', name: 'Dammam' },
  { id: 6, regionId: 3, regionName: 'Eastern', name: 'Al-Ahsa' },
  { id: 7, regionId: 4, regionName: 'Northern', name: 'Tabuk' },
  { id: 8, regionId: 5, regionName: 'Southern', name: 'Abha' },
];

export const mockShops: Shop[] = [
  { id: 1, shopName: 'Al-Noor Electronics', shopType: 'Electronics', address: 'King Fahd Road, Riyadh', cityId: 1, cityName: 'Riyadh', regionId: 1, regionName: 'Central', latitude: 24.7136, longitude: 46.6753, assignedUserId: 5, assignedUserName: 'Omar Al-Shamri', isActive: true, createdAt: '2024-01-10T00:00:00Z' },
  { id: 2, shopName: 'Madinah Mobile', shopType: 'Mobile', address: 'Olaya Street, Riyadh', cityId: 1, cityName: 'Riyadh', regionId: 1, regionName: 'Central', latitude: 24.6877, longitude: 46.7219, assignedUserId: 5, assignedUserName: 'Omar Al-Shamri', isActive: true, createdAt: '2024-01-11T00:00:00Z' },
  { id: 3, shopName: 'Gulf Tech Store', shopType: 'Electronics', address: 'Prince Sultan Road, Jeddah', cityId: 3, cityName: 'Jeddah', regionId: 2, regionName: 'Western', latitude: 21.4858, longitude: 39.1925, assignedUserId: 6, assignedUserName: 'Saad Al-Ghamdi', isActive: true, createdAt: '2024-01-12T00:00:00Z' },
  { id: 4, shopName: 'Eastern Digital', shopType: 'Digital', address: 'King Saud Road, Dammam', cityId: 5, cityName: 'Dammam', regionId: 3, regionName: 'Eastern', latitude: 26.4207, longitude: 50.0888, assignedUserId: 8, assignedUserName: 'Turki Al-Mutairi', isActive: true, createdAt: '2024-01-13T00:00:00Z' },
  { id: 5, shopName: 'Riyadh Smart Hub', shopType: 'Electronics', address: 'Tahlia Street, Riyadh', cityId: 1, cityName: 'Riyadh', regionId: 1, regionName: 'Central', latitude: 24.6921, longitude: 46.6859, assignedUserId: 5, assignedUserName: 'Omar Al-Shamri', isActive: true, createdAt: '2024-01-14T00:00:00Z' },
  { id: 6, shopName: 'Jeddah Electronics World', shopType: 'Electronics', address: 'Corniche Road, Jeddah', cityId: 3, cityName: 'Jeddah', regionId: 2, regionName: 'Western', latitude: 21.5433, longitude: 39.1728, assignedUserId: 6, assignedUserName: 'Saad Al-Ghamdi', isActive: false, createdAt: '2024-01-15T00:00:00Z' },
];

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

export const mockAttendance: Attendance[] = [
  { id: 1, userId: 5, userName: 'Omar Al-Shamri', checkInTime: today, checkOutTime: undefined, checkInLatitude: 24.7136, checkInLongitude: 46.6753, selfieUrl: 'https://i.pravatar.cc/150?img=11', status: 'CheckedIn', createdAt: today },
  { id: 2, userId: 6, userName: 'Saad Al-Ghamdi', checkInTime: today, checkOutTime: today, checkInLatitude: 21.4858, checkInLongitude: 39.1925, checkOutLatitude: 21.4862, checkOutLongitude: 39.1930, selfieUrl: 'https://i.pravatar.cc/150?img=12', status: 'CheckedOut', createdAt: today },
  { id: 3, userId: 8, userName: 'Turki Al-Mutairi', checkInTime: yesterday, checkOutTime: yesterday, checkInLatitude: 26.4207, checkInLongitude: 50.0888, selfieUrl: 'https://i.pravatar.cc/150?img=13', status: 'CheckedOut', createdAt: yesterday },
  { id: 4, userId: 5, userName: 'Omar Al-Shamri', checkInTime: yesterday, checkOutTime: yesterday, checkInLatitude: 24.7136, checkInLongitude: 46.6753, selfieUrl: 'https://i.pravatar.cc/150?img=11', status: 'CheckedOut', createdAt: yesterday },
  { id: 5, userId: 6, userName: 'Saad Al-Ghamdi', checkInTime: twoDaysAgo, checkOutTime: twoDaysAgo, checkInLatitude: 21.4858, checkInLongitude: 39.1925, status: 'CheckedOut', createdAt: twoDaysAgo },
];

export const mockVisits: Visit[] = [
  { id: 1, userId: 5, userName: 'Omar Al-Shamri', shopId: 1, shopName: 'Al-Noor Electronics', visitStartTime: today, latitude: 24.7136, longitude: 46.6753, status: 'InProgress', createdAt: today },
  { id: 2, userId: 5, userName: 'Omar Al-Shamri', shopId: 2, shopName: 'Madinah Mobile', visitStartTime: yesterday, visitEndTime: yesterday, durationMinutes: 25, remarks: 'Good visit, placed order', status: 'Completed', photos: [
    { id: 1, visitId: 2, photoType: 'OutsideShop', photoUrl: 'https://picsum.photos/400/300?random=1', createdAt: yesterday },
    { id: 2, visitId: 2, photoType: 'ShelfPhoto', photoUrl: 'https://picsum.photos/400/300?random=2', createdAt: yesterday },
    { id: 3, visitId: 2, photoType: 'SelfieWithShopkeeper', photoUrl: 'https://picsum.photos/400/300?random=3', createdAt: yesterday },
  ], createdAt: yesterday },
  { id: 3, userId: 6, userName: 'Saad Al-Ghamdi', shopId: 3, shopName: 'Gulf Tech Store', visitStartTime: today, visitEndTime: today, durationMinutes: 18, remarks: 'Regular check', status: 'Completed', createdAt: today },
  { id: 4, userId: 8, userName: 'Turki Al-Mutairi', shopId: 4, shopName: 'Eastern Digital', visitStartTime: yesterday, visitEndTime: yesterday, durationMinutes: 12, status: 'Completed', createdAt: yesterday },
  { id: 5, userId: 5, userName: 'Omar Al-Shamri', shopId: 5, shopName: 'Riyadh Smart Hub', visitStartTime: twoDaysAgo, visitEndTime: twoDaysAgo, durationMinutes: 22, remarks: 'Discussed new products', status: 'Completed', createdAt: twoDaysAgo },
];

export const mockSales: SalesEntry[] = [
  { id: 1, userId: 5, userName: 'Omar Al-Shamri', shopId: 1, shopName: 'Al-Noor Electronics', productName: 'Samsung Galaxy A54', quantity: 5, amount: 12500, remarks: 'Bulk order', createdAt: today },
  { id: 2, userId: 5, userName: 'Omar Al-Shamri', shopId: 2, shopName: 'Madinah Mobile', productName: 'iPhone 15', quantity: 2, amount: 9800, createdAt: yesterday },
  { id: 3, userId: 6, userName: 'Saad Al-Ghamdi', shopId: 3, shopName: 'Gulf Tech Store', productName: 'Xiaomi Redmi 12', quantity: 10, amount: 8500, createdAt: today },
  { id: 4, userId: 8, userName: 'Turki Al-Mutairi', shopId: 4, shopName: 'Eastern Digital', productName: 'OPPO A78', quantity: 3, amount: 4200, createdAt: yesterday },
  { id: 5, userId: 5, userName: 'Omar Al-Shamri', shopId: 5, shopName: 'Riyadh Smart Hub', productName: 'Vivo Y36', quantity: 7, amount: 6300, createdAt: twoDaysAgo },
  { id: 6, userId: 6, userName: 'Saad Al-Ghamdi', shopId: 3, shopName: 'Gulf Tech Store', productName: 'Samsung Galaxy S24', quantity: 1, amount: 4200, createdAt: twoDaysAgo },
];

export const mockOrders: Order[] = [
  { id: 1, userId: 5, userName: 'Omar Al-Shamri', shopId: 1, shopName: 'Al-Noor Electronics', orderType: 'RetailerToMD', productName: 'Samsung Galaxy A54', quantity: 10, remarks: 'Urgent order', status: 'Pending', createdAt: today, updatedAt: today },
  { id: 2, userId: 6, userName: 'Saad Al-Ghamdi', shopId: 3, shopName: 'Gulf Tech Store', orderType: 'RetailerToMD', productName: 'iPhone 15 Pro', quantity: 5, remarks: 'Monthly restock', status: 'Approved', approvedBy: 3, approvedByName: 'Khalid Al-Otaibi', approvalRemarks: 'Approved for dispatch', createdAt: yesterday, updatedAt: yesterday },
  { id: 3, userId: 5, userName: 'Omar Al-Shamri', shopId: 2, shopName: 'Madinah Mobile', orderType: 'MDToDistributor', productName: 'Xiaomi Redmi 12', quantity: 50, status: 'Pending', createdAt: yesterday, updatedAt: yesterday },
  { id: 4, userId: 8, userName: 'Turki Al-Mutairi', shopId: 4, shopName: 'Eastern Digital', orderType: 'RetailerToMD', productName: 'OPPO A78', quantity: 8, status: 'Rejected', approvedBy: 3, approvedByName: 'Khalid Al-Otaibi', approvalRemarks: 'Out of stock', createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
  { id: 5, userId: 6, userName: 'Saad Al-Ghamdi', shopId: 6, shopName: 'Jeddah Electronics World', orderType: 'RetailerToMD', productName: 'Vivo Y36', quantity: 15, status: 'Completed', approvedBy: 2, approvedByName: 'Mohammed Al-Qahtani', createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
];

export const mockDashboardStats: DashboardStats = {
  todayVisits: 3,
  pendingVisits: 2,
  completedVisits: 8,
  attendanceStatus: 'Present',
  totalOrders: 5,
  pendingOrders: 2,
  salesAmount: 45500,
  photosUploaded: 9,
  gpsCompliance: 92,
  totalUsers: 8,
  activeFieldStaff: 6,
  pendingApprovals: 2,
  totalShops: 6,
};

export const mockAdminDashboardStats: DashboardStats = {
  todayVisits: 8,
  pendingVisits: 4,
  completedVisits: 24,
  attendanceStatus: '6/8 Present',
  totalOrders: 5,
  pendingOrders: 2,
  salesAmount: 45500,
  photosUploaded: 27,
  gpsCompliance: 88,
  totalUsers: 8,
  activeFieldStaff: 6,
  pendingApprovals: 2,
  totalShops: 6,
};

export const products = [
  'Samsung Galaxy A54',
  'Samsung Galaxy S24',
  'iPhone 15',
  'iPhone 15 Pro',
  'Xiaomi Redmi 12',
  'Xiaomi 14',
  'OPPO A78',
  'OPPO Reno 11',
  'Vivo Y36',
  'Vivo V30',
  'OnePlus Nord CE 3',
  'Google Pixel 8',
  'Realme 12 Pro',
  'Nokia G42',
  'Motorola Moto G84',
];
