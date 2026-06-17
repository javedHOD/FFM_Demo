# FieldForce Enterprise - API Documentation

## Overview

The system uses a **service-layer pattern** with mock APIs ready for production backend integration. All API calls are centralized in `src/api/` directory with TypeScript interfaces.

---

## API Services

### 1. Authentication API (`authApi.ts`)

#### Login
```typescript
authApi.login(credentials: { email: string; password: string })
→ { user: User; token: string }
```

**Example:**
```typescript
const { user, token } = await authApi.login({
  email: 'promoter@fieldforce.com',
  password: 'Promoter@123'
});
```

#### Logout
```typescript
authApi.logout()
→ void
```

#### Get Current User
```typescript
authApi.me(token: string)
→ User
```

#### Forgot Password
```typescript
authApi.forgotPassword(email: string)
→ void
```

---

### 2. Users API (`usersApi.ts`)

#### Get All Users
```typescript
usersApi.getAll()
→ User[]
```

#### Get User by ID
```typescript
usersApi.getById(id: number)
→ User
```

#### Create User
```typescript
usersApi.create(data: Partial<User>)
→ User
```

**Required Fields:**
- fullName
- email
- phone
- roleId
- regionId (optional)
- cityId (optional)

#### Update User
```typescript
usersApi.update(id: number, data: Partial<User>)
→ User
```

#### Delete User
```typescript
usersApi.delete(id: number)
→ void
```

#### Get Regions
```typescript
usersApi.getRegions()
→ Region[]
```

#### Get Cities
```typescript
usersApi.getCities(regionId?: number)
→ City[]
```

---

### 3. Shops API (`shopsApi.ts`)

#### Get All Shops
```typescript
shopsApi.getAll(userId?: number)
→ Shop[]
```
*If userId provided, returns only assigned shops*

#### Get Shop by ID
```typescript
shopsApi.getById(id: number)
→ Shop
```

#### Create Shop
```typescript
shopsApi.create(data: Partial<Shop>)
→ Shop
```

**Required Fields:**
- shopName
- shopType
- address
- cityId
- regionId

**Optional Fields:**
- latitude
- longitude
- assignedUserId

#### Update Shop
```typescript
shopsApi.update(id: number, data: Partial<Shop>)
→ Shop
```

#### Delete Shop
```typescript
shopsApi.delete(id: number)
→ void
```

---

### 4. Attendance API (`attendanceApi.ts`)

#### Get All Attendance Records
```typescript
attendanceApi.getAll()
→ Attendance[]
```

#### Get My Attendance
```typescript
attendanceApi.getMy(userId: number)
→ Attendance[]
```

#### Get Today's Status
```typescript
attendanceApi.getTodayStatus(userId: number)
→ Attendance | null
```

#### Check In
```typescript
attendanceApi.checkIn({
  userId: number;
  latitude?: number;
  longitude?: number;
  selfieUrl?: string;
})
→ Attendance
```

**Note:** selfieUrl is Base64-encoded image data from camera

#### Check Out
```typescript
attendanceApi.checkOut({
  attendanceId: number;
  latitude?: number;
  longitude?: number;
})
→ Attendance
```

---

### 5. Visits API (`visitsApi.ts`)

#### Get All Visits
```typescript
visitsApi.getAll()
→ Visit[]
```

#### Get My Visits
```typescript
visitsApi.getMy(userId: number)
→ Visit[]
```

#### Get Visit by ID
```typescript
visitsApi.getById(id: number)
→ Visit
```

#### Start Visit
```typescript
visitsApi.startVisit({
  userId: number;
  shopId: number;
  shopName: string;
  latitude?: number;
  longitude?: number;
})
→ Visit
```

#### Complete Visit
```typescript
visitsApi.completeVisit(id: number, {
  remarks?: string;
  photos?: string[];
})
→ Visit
```

#### Upload Photos
```typescript
visitsApi.uploadPhotos(visitId: number, photos: {
  photoType: 'OutsideShop' | 'ShelfPhoto' | 'SelfieWithShopkeeper';
  photoUrl: string;
}[])
→ VisitPhoto[]
```

---

### 6. Sales API (`salesApi.ts`)

#### Get All Sales
```typescript
salesApi.getAll()
→ SalesEntry[]
```

#### Get My Sales
```typescript
salesApi.getMy(userId: number)
→ SalesEntry[]
```

#### Create Sales Entry
```typescript
salesApi.create({
  userId: number;
  userName?: string;
  shopId: number;
  shopName?: string;
  productName: string;
  quantity: number;
  amount: number;
  remarks?: string;
})
→ SalesEntry
```

#### Get Sales Summary by User
```typescript
salesApi.getSummaryByUser()
→ { userId; userName; totalAmount; totalOrders }[]
```

---

### 7. Orders API (`ordersApi.ts`)

#### Get All Orders
```typescript
ordersApi.getAll()
→ Order[]
```

#### Get My Orders
```typescript
ordersApi.getMy(userId: number)
→ Order[]
```

#### Get Order by ID
```typescript
ordersApi.getById(id: number)
→ Order
```

#### Create Order
```typescript
ordersApi.create({
  userId: number;
  userName?: string;
  shopId: number;
  shopName?: string;
  orderType: 'RetailerToMD' | 'MDToDistributor';
  productName: string;
  quantity: number;
  remarks?: string;
})
→ Order
```

#### Update Order Status
```typescript
ordersApi.updateStatus(
  id: number,
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed',
  approvedBy?: number,
  approvedByName?: string,
  approvalRemarks?: string
)
→ Order
```

#### Get Pending Orders
```typescript
ordersApi.getPending()
→ Order[]
```

---

### 8. Reports API (`reportsApi.ts`)

#### Get Dashboard Stats
```typescript
reportsApi.getDashboard(userId: number, roleName: string)
→ DashboardStats
```

Returns role-specific statistics

#### Get Visit Report
```typescript
reportsApi.getVisitReport()
→ Visit[]
```

#### Get Attendance Report
```typescript
reportsApi.getAttendanceReport()
→ Attendance[]
```

#### Get Sales Report
```typescript
reportsApi.getSalesReport()
→ SalesEntry[]
```

#### Get Order Report
```typescript
reportsApi.getOrderReport()
→ Order[]
```

#### Get Weekly Visit Data
```typescript
reportsApi.getWeeklyVisitData()
→ { day: string; visits: number; completed: number }[]
```

#### Get Monthly Sales Data
```typescript
reportsApi.getMonthlySalesData()
→ { month: string; amount: number }[]
```

---

## Data Types

### User
```typescript
interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: Role;
  regionId?: number;
  regionName?: string;
  cityId?: number;
  cityName?: string;
  isActive: boolean;
  createdAt: string;
}

type Role = 'Promoter' | 'City Manager' | 'Regional Manager' 
  | 'National Sales Manager' | 'Admin';
```

### Attendance
```typescript
interface Attendance {
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
```

### Visit
```typescript
interface Visit {
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

interface VisitPhoto {
  id: number;
  visitId: number;
  photoType: 'OutsideShop' | 'ShelfPhoto' | 'SelfieWithShopkeeper';
  photoUrl: string;
  createdAt: string;
}
```

### Sales Entry
```typescript
interface SalesEntry {
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
```

### Order
```typescript
interface Order {
  id: number;
  userId: number;
  userName?: string;
  shopId: number;
  shopName?: string;
  orderType: 'RetailerToMD' | 'MDToDistributor';
  productName: string;
  quantity: number;
  remarks?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  approvedBy?: number;
  approvedByName?: string;
  approvalRemarks?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Dashboard Stats
```typescript
interface DashboardStats {
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
```

---

## Integration with Real Backend

### Step 1: Update API Client
**File:** `src/api/client.ts`

```typescript
const API_BASE_URL = process.env.VITE_API_URL || 'http://YOUR_BACKEND:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// JWT token is automatically added to all requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Step 2: Replace Mock API with Real Calls
**Example:** `src/api/usersApi.ts`

```typescript
// Before (Mock):
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    await new Promise(r => setTimeout(r, 400));
    return [...users];
  },
};

// After (Real):
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },
};
```

### Step 3: Update .env
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Error Handling

All APIs have built-in error handling:

```typescript
try {
  const result = await authApi.login(credentials);
  // Success
} catch (error: any) {
  // error.message contains the error details
  toast.error(error.message);
}
```

### Common Error Cases
- **401 Unauthorized** → Auto-logout & redirect to login
- **400 Bad Request** → Show validation errors
- **500 Server Error** → Show generic error toast
- **Network Error** → Show connection error

---

## Rate Limiting & Pagination

### Pagination Example
```typescript
const [page, setPage] = useState(1);
const [limit, setPage] = useState(10);

const items = await usersApi.getAll();
const paginated = items.slice((page - 1) * limit, page * limit);
```

**Note:** Implement server-side pagination for large datasets

---

## File Upload for Photos

### Selfie Capture (Attendance)
```typescript
// From camera or file input
const canvas = canvasRef.current;
const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

await attendanceApi.checkIn({
  userId,
  selfieUrl: dataUrl, // Base64 encoded
  latitude,
  longitude,
});
```

### Visit Photos
```typescript
const photos = [
  { photoType: 'OutsideShop', photoUrl: dataUrl1 },
  { photoType: 'ShelfPhoto', photoUrl: dataUrl2 },
  { photoType: 'SelfieWithShopkeeper', photoUrl: dataUrl3 },
];

await visitsApi.uploadPhotos(visitId, photos);
```

### For Production
Replace Base64 with FormData + multipart upload:

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('type', 'selfie');

const response = await apiClient.post('/uploads', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

## Authentication Flow

### Login
1. User submits credentials
2. Backend validates and returns JWT token
3. Token stored in Zustand store
4. Token persisted to localStorage
5. All subsequent requests include JWT header

### Logout
1. Clear token from store
2. Clear localStorage
3. Redirect to login page
4. Optionally notify backend

### Token Refresh
1. Implement in axios interceptor
2. On 401, attempt refresh
3. Retry original request
4. Or redirect to login if refresh fails

---

## Testing APIs

### Using Postman/Insomnia

**Base URL:** `http://localhost:5000/api`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Example: Get All Users**
```
GET /api/users
Headers: Authorization: Bearer [token]
```

**Example: Create User**
```
POST /api/users
Body: {
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+966501234567",
  "roleId": 1,
  "regionId": 1,
  "cityId": 1
}
```

---

## Performance Optimization

### Caching Strategies
```typescript
// Implement in real API layer
const cache = new Map();

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    if (cache.has('users')) return cache.get('users');
    const data = await apiClient.get('/users');
    cache.set('users', data);
    return data;
  },
};
```

### Batch Operations
```typescript
// Get multiple resources efficiently
const [visits, orders, sales] = await Promise.all([
  visitsApi.getAll(),
  ordersApi.getAll(),
  salesApi.getAll(),
]);
```

---

## WebSocket Integration (Real-time)

For live tracking, implement WebSocket:

```typescript
const ws = new WebSocket('ws://localhost:5000/tracking');

ws.onmessage = (event) => {
  const staffUpdate = JSON.parse(event.data);
  // Update UI with live location
  setStaffTracking(prev => prev.map(
    s => s.user.id === staffUpdate.userId ? staffUpdate : s
  ));
};
```

---

## Monitoring & Logging

Implement logging for debugging:

```typescript
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API]', response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  (error) => {
    console.error('[API Error]', error.config?.url, error.response?.status);
    return Promise.reject(error);
  }
);
```

---

## Security Considerations

1. **HTTPS Only** - Use HTTPS in production
2. **CORS** - Configure on backend
3. **Token Expiration** - Implement refresh tokens
4. **Password Hashing** - Never send plain passwords
5. **Input Validation** - Validate on both client & server
6. **Rate Limiting** - Prevent brute force attacks
7. **SQL Injection** - Use parameterized queries (backend)
8. **XSS Protection** - Sanitize user inputs

---

## Troubleshooting

### CORS Errors
**Solution:** Configure CORS on backend
```javascript
// Node.js/Express
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### 401 Unauthorized
**Solution:** Check token expiration, refresh if needed

### Network Timeouts
**Solution:** Increase axios timeout
```typescript
const apiClient = axios.create({
  timeout: 30000, // 30 seconds
});
```

### File Upload Failures
**Solution:** Ensure backend supports multipart/form-data

---

## API Versioning

For future versions, structure API like:
```
/api/v1/users
/api/v2/users (with breaking changes)
```

Implement in axios config:
```typescript
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';
const API_BASE_URL = `${baseUrl}/${API_VERSION}`;
```

---

**All APIs are ready for production backend integration!**
