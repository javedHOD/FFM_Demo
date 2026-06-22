import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  mockUsers,
  mockRegions,
  mockCities,
  mockShops,
  mockOrders,
  mockAttendance,
  mockVisits,
  mockSales,
  mockDashboardStats,
  mockAdminDashboardStats,
} from './mockData';
import type { Order, Shop, User } from '../types';

const DB_KEY = 'fieldforce-phase-1-1-demo-db-v2';

interface DemoDb {
  users: User[];
  shops: Shop[];
  orders: Order[];
  attendance: typeof mockAttendance;
  visits: typeof mockVisits;
  sales: typeof mockSales;
}

const withPhase11Seed = (): DemoDb => ({
  users: mockUsers.map(u => ({
    ...u,
    multiRegionIds: u.roleName === 'Promoter' && u.id === 5 ? [1, 2, 3] : (u.regionId ? [u.regionId] : []),
    multiRegionNames: u.roleName === 'Promoter' && u.id === 5 ? ['Central', 'Western', 'Eastern'] : (u.regionName ? [u.regionName] : []),
    assignedShopIds: u.id === 5 ? [1, 2, 5] : u.id === 6 ? [3, 6] : u.id === 8 ? [4] : [],
    assignedShopNames: u.id === 5 ? ['Al-Noor Electronics', 'Madinah Mobile', 'Riyadh Smart Hub'] : u.id === 6 ? ['Gulf Tech Store', 'Jeddah Electronics World'] : u.id === 8 ? ['Eastern Digital'] : [],
  })),
  shops: mockShops.map((s, idx) => ({
    ...s,
    contactPerson: ['Ali Raza', 'Hafeez Khan', 'Bilal Ahmed', 'Hamza Khan', 'Usman Malik', 'Asad Ali'][idx] || 'Shop Manager',
    contactNo: `0300-00000${idx + 1}`,
    contactNo2: idx % 2 === 0 ? `042-11111${idx + 1}` : '',
    ntnNo: `NTN-00${idx + 1}`,
  })),
  orders: mockOrders.map(o => ({
    ...o,
    items: [{
      id: 1,
      orderId: o.id,
      productName: o.productName,
      quantity: o.quantity,
      status: o.status === 'Partially Approved' ? 'Pending' : o.status,
      approvedBy: o.approvedBy,
      approvedByName: o.approvedByName,
      approvalRemarks: o.approvalRemarks,
    }],
  })),
  attendance: mockAttendance,
  visits: mockVisits,
  sales: mockSales,
});

const loadDb = (): DemoDb => {
  try {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const db = withPhase11Seed();
  saveDb(db);
  return db;
};

const saveDb = (db: DemoDb) => localStorage.setItem(DB_KEY, JSON.stringify(db));
const ok = (config: InternalAxiosRequestConfig, data: any, status = 200): AxiosResponse => ({ data: { success: true, data }, status, statusText: 'OK', headers: {}, config });
const msg = (config: InternalAxiosRequestConfig, message: string, status = 400): AxiosResponse => ({ data: { success: false, message }, status, statusText: message, headers: {}, config });
const parseBody = (data: any) => typeof data === 'string' ? JSON.parse(data || '{}') : (data || {});
const nextId = (items: { id: number }[]) => Math.max(0, ...items.map(i => i.id)) + 1;

const filterSalesByDate = (sales: DemoDb['sales'], from?: string | null, to?: string | null) => {
  if (!from && !to) return sales;
  return sales.filter(s => {
    const dateStr = new Date(s.createdAt).toISOString().slice(0, 10);
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
  });
};

const summarizeSalesByUser = (sales: DemoDb['sales']) => {
  const map = new Map<number, { userId: number; userName: string; totalAmount: number; totalOrders: number }>();
  sales.forEach(s => {
    const existing = map.get(s.userId);
    if (existing) {
      existing.totalAmount += s.amount;
      existing.totalOrders += 1;
    } else {
      map.set(s.userId, {
        userId: s.userId,
        userName: s.userName || `User #${s.userId}`,
        totalAmount: s.amount,
        totalOrders: 1,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
};

const credentials: Record<string, string> = {
  'admin@fieldforce.com': 'Admin@123',
  'nsm@fieldforce.com': 'Nsm@123',
  'rm@fieldforce.com': 'Rm@123',
  'cm@fieldforce.com': 'Cm@123',
  'promoter@fieldforce.com': 'Promoter@123',
};

export const createMockAdapter = (): AxiosAdapter => async (config) => {
  await new Promise(resolve => setTimeout(resolve, 150));

  const db = loadDb();
  const method = (config.method || 'get').toLowerCase();
  const rawUrl = config.url || '/';
  const url = new URL(rawUrl, 'https://demo.local');
  const path = url.pathname;
  const body = parseBody(config.data);

  try {
    // Auth
    if (method === 'post' && path === '/auth/login') {
      const user = db.users.find(u => u.email.toLowerCase() === String(body.email || '').toLowerCase());
      if (!user || credentials[user.email] !== body.password) return msg(config, 'Invalid email or password', 401);
      return ok(config, { user, token: `demo-token-${user.id}` });
    }
    if (path === '/auth/logout') return ok(config, { message: 'Logged out' });
    if (path === '/auth/me') return ok(config, db.users[0]);
    if (path === '/auth/forgot-password') return ok(config, { message: 'Password reset email sent' });

    // Users metadata
    if (method === 'get' && path === '/users/meta/regions') return ok(config, mockRegions);
    if (method === 'get' && path === '/users/meta/cities') {
      const regionId = url.searchParams.get('regionId');
      return ok(config, regionId ? mockCities.filter(c => c.regionId === Number(regionId)) : mockCities);
    }

    // Users CRUD
    if (method === 'get' && path === '/users') return ok(config, db.users);
    if (method === 'post' && path === '/users') {
      if (db.users.some(u => u.email.toLowerCase() === String(body.email).toLowerCase())) return msg(config, 'Email already exists');
      const regionIds = Array.isArray(body.regionIds) ? body.regionIds.map(Number) : (body.regionId ? [Number(body.regionId)] : []);
      const user: User = {
        id: nextId(db.users),
        fullName: body.fullName,
        email: body.email,
        phone: body.phone || '',
        roleId: Number(body.roleId),
        roleName: body.roleName,
        regionId: body.regionId || regionIds[0],
        regionName: mockRegions.find(r => r.id === Number(body.regionId || regionIds[0]))?.name,
        multiRegionIds: regionIds,
        multiRegionNames: mockRegions.filter(r => regionIds.includes(r.id)).map(r => r.name),
        assignedShopIds: Array.isArray(body.assignedShopIds) ? body.assignedShopIds.map(Number) : [],
        assignedShopNames: db.shops.filter(s => Array.isArray(body.assignedShopIds) && body.assignedShopIds.map(Number).includes(s.id)).map(s => s.shopName),
        cityId: body.cityId,
        cityName: mockCities.find(c => c.id === Number(body.cityId))?.name,
        isActive: body.isActive !== false,
        createdAt: new Date().toISOString(),
      };
      if (Array.isArray(body.assignedShopIds)) {
        const assigned = new Set(body.assignedShopIds.map(Number));
        db.shops = db.shops.map(s => assigned.has(s.id) ? { ...s, assignedUserId: user.id, assignedUserName: user.fullName } : s);
      }
      db.users.unshift(user); saveDb(db); return ok(config, user, 201);
    }
    const userIdMatch = path.match(/^\/users\/(\d+)$/);
    if (userIdMatch) {
      const id = Number(userIdMatch[1]);
      const idx = db.users.findIndex(u => u.id === id);
      if (idx < 0) return msg(config, 'User not found', 404);
      if (method === 'get') return ok(config, db.users[idx]);
      if (method === 'put') {
        const regionIds = Array.isArray(body.regionIds) ? body.regionIds.map(Number) : db.users[idx].multiRegionIds || [];
        const assignedShopIds = Array.isArray(body.assignedShopIds) ? body.assignedShopIds.map(Number) : (db.users[idx].assignedShopIds || []);
        db.users[idx] = {
          ...db.users[idx],
          ...body,
          id,
          multiRegionIds: regionIds,
          multiRegionNames: mockRegions.filter(r => regionIds.includes(r.id)).map(r => r.name),
          assignedShopIds,
          assignedShopNames: db.shops.filter(s => assignedShopIds.includes(s.id)).map(s => s.shopName),
          regionName: mockRegions.find(r => r.id === Number(body.regionId || db.users[idx].regionId))?.name || db.users[idx].regionName,
          cityName: mockCities.find(c => c.id === Number(body.cityId || db.users[idx].cityId))?.name || db.users[idx].cityName,
        };
        if (Array.isArray(body.assignedShopIds)) {
          const assigned = new Set(assignedShopIds);
          db.shops = db.shops.map(s => ({
            ...s,
            assignedUserId: assigned.has(s.id) ? id : (s.assignedUserId === id ? undefined : s.assignedUserId),
            assignedUserName: assigned.has(s.id) ? db.users[idx].fullName : (s.assignedUserId === id ? undefined : s.assignedUserName),
          }));
        }
        saveDb(db); return ok(config, db.users[idx]);
      }
      if (method === 'delete') { db.users.splice(idx, 1); saveDb(db); return ok(config, { message: 'User deleted' }); }
    }

    // Shops CRUD
    if (method === 'get' && path === '/shops') {
      const userId = Number(url.searchParams.get('userId') || 0);
      if (!userId) return ok(config, db.shops);
      const user = db.users.find(u => u.id === userId);
      const regions = new Set([user?.regionId, ...(user?.multiRegionIds || [])].filter(Boolean));
      return ok(config, db.shops.filter(s => s.assignedUserId === userId || regions.has(s.regionId)));
    }
    if (method === 'post' && path === '/shops') {
      if (db.shops.some(s => s.shopName.trim().toLowerCase() === String(body.shopName).trim().toLowerCase())) return msg(config, 'Shop name already exists. Please use a unique shop name.');
      const user = db.users.find(u => u.id === Number(body.assignedUserId));
      const shop: Shop = {
        id: nextId(db.shops),
        ...body,
        shopName: String(body.shopName).trim(),
        cityName: mockCities.find(c => c.id === Number(body.cityId))?.name,
        regionName: mockRegions.find(r => r.id === Number(body.regionId))?.name,
        assignedUserName: user?.fullName,
        isActive: body.isActive !== false,
        createdAt: new Date().toISOString(),
      };
      db.shops.unshift(shop); saveDb(db); return ok(config, shop, 201);
    }
    const shopIdMatch = path.match(/^\/shops\/(\d+)$/);
    if (shopIdMatch) {
      const id = Number(shopIdMatch[1]); const idx = db.shops.findIndex(s => s.id === id);
      if (idx < 0) return msg(config, 'Shop not found', 404);
      if (method === 'get') return ok(config, db.shops[idx]);
      if (method === 'put') {
        if (body.shopName && db.shops.some(s => s.id !== id && s.shopName.trim().toLowerCase() === String(body.shopName).trim().toLowerCase())) return msg(config, 'Shop name already exists. Please use a unique shop name.');
        const user = db.users.find(u => u.id === Number(body.assignedUserId));
        db.shops[idx] = { ...db.shops[idx], ...body, assignedUserName: user?.fullName || db.shops[idx].assignedUserName };
        saveDb(db); return ok(config, db.shops[idx]);
      }
      if (method === 'delete') { db.shops.splice(idx, 1); saveDb(db); return ok(config, { message: 'Shop deleted' }); }
    }

    // Orders
    const deriveOrderStatus = (items: { status?: string }[]) => {
      if (!items.length) return 'Pending';
      const statuses = items.map(i => i.status || 'Pending');
      if (statuses.every(s => s === 'Pending')) return 'Pending';
      if (statuses.some(s => s === 'Pending')) return 'Partially Approved';
      if (statuses.every(s => s === 'Approved')) return 'Approved';
      if (statuses.every(s => s === 'Rejected')) return 'Rejected';
      return 'Partially Approved';
    };

    const formatOrder = (o: Order) => {
      const items = (o.items || [{ productName: o.productName, quantity: o.quantity, status: o.status }]).map((item, idx) => ({
        id: item.id ?? idx + 1,
        orderId: o.id,
        productName: item.productName,
        quantity: item.quantity,
        status: item.status || 'Pending',
        approvedBy: item.approvedBy,
        approvedByName: item.approvedByName,
        approvalRemarks: item.approvalRemarks,
      }));
      return { ...o, items, status: deriveOrderStatus(items) as Order['status'] };
    };

    const hasPendingItems = (o: Order) => formatOrder(o).items?.some(i => (i.status || 'Pending') === 'Pending');

    if (method === 'get' && path === '/orders') return ok(config, db.orders.map(formatOrder));
    if (method === 'get' && path === '/orders/my') return ok(config, db.orders.filter(o => o.userId === 5 || o.userId === 6 || o.userId === 8).map(formatOrder));
    if (method === 'get' && path === '/orders/pending') return ok(config, db.orders.filter(hasPendingItems).map(formatOrder));
    if (method === 'post' && path === '/orders') {
      const items = (body.items?.length ? body.items : [{ productName: body.productName, quantity: body.quantity }]).map((i: any, idx: number) => ({
        id: idx + 1,
        productName: i.productName,
        quantity: Number(i.quantity),
        status: 'Pending' as const,
      }));
      const shop = db.shops.find(s => s.id === Number(body.shopId));
      const user = db.users.find(u => u.id === Number(body.userId)) || db.users.find(u => u.email === 'promoter@fieldforce.com');
      const order: Order = {
        id: nextId(db.orders), userId: user?.id || 5, userName: user?.fullName, shopId: Number(body.shopId), shopName: shop?.shopName,
        orderType: body.orderType, productName: items.map((i: any) => i.productName).join(', '), quantity: items.reduce((a: number, i: any) => a + i.quantity, 0),
        items, remarks: body.remarks, status: 'Pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      db.orders.unshift(order); saveDb(db); return ok(config, formatOrder(order), 201);
    }
    const orderItemStatusMatch = path.match(/^\/orders\/(\d+)\/items\/(\d+)\/status$/);
    if (orderItemStatusMatch && method === 'put') {
      const orderIdx = db.orders.findIndex(o => o.id === Number(orderItemStatusMatch[1]));
      if (orderIdx < 0) return msg(config, 'Order not found', 404);
      const order = db.orders[orderIdx];
      const items = (order.items || [{ id: 1, productName: order.productName, quantity: order.quantity, status: order.status }]).map(item => ({ ...item }));
      const itemIdx = items.findIndex(i => i.id === Number(orderItemStatusMatch[2]));
      if (itemIdx < 0) return msg(config, 'Order item not found', 404);
      if (items[itemIdx].status && items[itemIdx].status !== 'Pending') return msg(config, 'This item has already been processed', 400);
      items[itemIdx] = {
        ...items[itemIdx],
        status: body.status,
        approvedBy: body.approvedBy,
        approvedByName: body.approvedByName || 'Demo Approver',
        approvalRemarks: body.approvalRemarks,
      };
      db.orders[orderIdx] = {
        ...order,
        items,
        status: deriveOrderStatus(items) as Order['status'],
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);
      return ok(config, formatOrder(db.orders[orderIdx]));
    }
    const orderStatusMatch = path.match(/^\/orders\/(\d+)\/status$/);
    if (orderStatusMatch && method === 'put') {
      const idx = db.orders.findIndex(o => o.id === Number(orderStatusMatch[1]));
      if (idx < 0) return msg(config, 'Order not found', 404);
      const order = db.orders[idx];
      const items = (order.items || [{ id: 1, productName: order.productName, quantity: order.quantity, status: order.status }]).map(item => ({
        ...item,
        status: item.status === 'Pending' ? body.status : item.status,
        approvedByName: item.status === 'Pending' ? (body.approvedByName || 'Demo Approver') : item.approvedByName,
        approvalRemarks: item.status === 'Pending' ? body.approvalRemarks : item.approvalRemarks,
      }));
      db.orders[idx] = {
        ...order,
        items,
        status: deriveOrderStatus(items) as Order['status'],
        approvalRemarks: body.approvalRemarks,
        approvedByName: body.approvedByName || 'Demo Approver',
        updatedAt: new Date().toISOString(),
      };
      saveDb(db); return ok(config, formatOrder(db.orders[idx]));
    }
    const orderIdMatch = path.match(/^\/orders\/(\d+)$/);
    if (orderIdMatch && method === 'get') return ok(config, formatOrder(db.orders.find(o => o.id === Number(orderIdMatch[1]))));

    // Reports and general data
    if (path.startsWith('/reports/dashboard')) return ok(config, url.searchParams.get('roleName') === 'Admin' ? mockAdminDashboardStats : mockDashboardStats);
    if (path === '/reports/visits' || path === '/visits') return ok(config, db.visits);
    if (path === '/reports/attendance' || path === '/attendance') return ok(config, db.attendance);
    if (path === '/reports/sales' || path === '/sales') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      return ok(config, filterSalesByDate(db.sales, from, to));
    }
    if (path === '/reports/orders') return ok(config, db.orders.map(formatOrder));
    if (path === '/reports/weekly-visits') return ok(config, [
      { day: 'Mon', visits: 4, completed: 3 }, { day: 'Tue', visits: 5, completed: 4 }, { day: 'Wed', visits: 3, completed: 3 },
      { day: 'Thu', visits: 6, completed: 5 }, { day: 'Fri', visits: 4, completed: 4 }, { day: 'Sat', visits: 2, completed: 2 }, { day: 'Sun', visits: 1, completed: 1 },
    ]);
    if (path === '/reports/monthly-sales') return ok(config, [
      { month: 'Jan', amount: 12000 }, { month: 'Feb', amount: 18000 }, { month: 'Mar', amount: 15000 }, { month: 'Apr', amount: 22000 }, { month: 'May', amount: 26000 }, { month: 'Jun', amount: 31000 },
    ]);
    if (path === '/attendance/my') return ok(config, db.attendance);
    if (path === '/attendance/today') return ok(config, db.attendance[0]);
    if (path === '/visits/my') return ok(config, db.visits);
    if (path === '/sales/my') return ok(config, db.sales);
    if (path === '/sales/summary/by-user') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      return ok(config, summarizeSalesByUser(filterSalesByDate(db.sales, from, to)));
    }

    // Location / HR minimal demo data
    if (path === '/location/countries') return ok(config, [{ id: 1, name: 'Pakistan', code: 'PK', phoneCode: '+92', isActive: true }]);
    if (path === '/location/regions') return ok(config, mockRegions);
    if (path === '/location/cities') return ok(config, mockCities);
    if (path === '/location/hierarchy') return ok(config, []);
    if (path === '/hr/employees') return ok(config, []);
    if (path.startsWith('/hr/')) return ok(config, Array.isArray(body) ? [] : []);
    if (path.startsWith('/uploads/')) return ok(config, { url: '', fullUrl: '', filename: 'demo.jpg' });


    // IMEI Verification
    if (method === 'post' && path === '/imei/verify') {
      const imei = String(body.IMEI || '').trim();
      const testImeis = ['865901088912346', '356789112233445', '490154203237518'];
      const dummyData = [
        { Region: 'Riyadh', City: 'Riyadh', ShopName: 'Ronin', CustomerName: 'Omar Al-Shamri', CompanyName: 'Siccotel', ProductName: 'Samsung Galaxy A15', ProductCategory: 'Mobile', IMEINo: '865901088912346', InvoiceNo: 'INV-1001', InvoiceDate: '2026-06-18' },
        { Region: 'Eastern Region', City: 'Dammam', ShopName: 'SF Traders', CustomerName: 'Ahmed Saleh', CompanyName: 'Siccotel', ProductName: 'iPhone 13', ProductCategory: 'Mobile', IMEINo: '356789112233445', InvoiceNo: 'INV-1002', InvoiceDate: '2026-06-17' },
        { Region: 'Makkah', City: 'Jeddah', ShopName: 'City Mobile Hub', CustomerName: 'Faisal Khan', CompanyName: 'Siccotel', ProductName: 'Infinix Note 40', ProductCategory: 'Mobile', IMEINo: '490154203237518', InvoiceNo: 'INV-1003', InvoiceDate: '2026-06-16' },
      ];
      const found = dummyData.find(d => d.IMEINo === imei);
      if (found) return ok(config, { status: '1', message: 'IMEI verified successfully.', data: found }, 200);
      return ok(config, { status: '0', message: 'No record found against this IMEI number.' }, 404);
    }
    if (path === '/imei/logs') {
      const logsKey = 'imei_logs_demo';
      try {
        const saved = localStorage.getItem(logsKey);
        if (saved) return ok(config, JSON.parse(saved));
      } catch {}
      return ok(config, []);
    }
    return ok(config, []);
  } catch (error: any) {
    return msg(config, error.message || 'Demo mock error', 500);
  }
};
