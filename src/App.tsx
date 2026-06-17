import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Field Staff
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { VisitsPage } from './pages/visits/VisitsPage';
import { SalesPage } from './pages/sales/SalesPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { OrderApprovalsPage } from './pages/orders/OrderApprovalsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

// Admin
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ShopsPage } from './pages/admin/ShopsPage';
import { AdminVisitsPage } from './pages/admin/AdminVisitsPage';
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminSalesPage } from './pages/admin/AdminSalesPage';
import { PhotoCompliancePage } from './pages/admin/PhotoCompliancePage';
import { LiveTrackingPage } from './pages/tracking/LiveTrackingPage';
import { LocationManagementPage } from './pages/admin/LocationManagementPage';
import { HRManagementPage } from './pages/admin/HRManagementPage';
import { ShiftsPage } from './pages/admin/ShiftsPage';
import { RegionCityReportPage } from './pages/admin/RegionCityReportPage';

// Guest-only route (redirect if already logged in)
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={user?.roleName === 'Admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.roleName)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Admin Route
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['Admin']}>{children}</ProtectedRoute>
);

// Home redirect based on role
const HomeRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.roleName === 'Admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/" element={<HomeRedirect />} />

        {/* Field Staff Routes */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager']}><AttendancePage /></ProtectedRoute>} />
        <Route path="/visits" element={<ProtectedRoute allowedRoles={['Promoter', 'City Manager']}><VisitsPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute allowedRoles={['Promoter', 'City Manager']}><SalesPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute allowedRoles={['Promoter', 'City Manager']}><OrdersPage /></ProtectedRoute>} />
        <Route path="/order-approvals" element={<ProtectedRoute allowedRoles={['Regional Manager', 'National Sales Manager']}><OrderApprovalsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/admin/shops" element={<AdminRoute><ShopsPage /></AdminRoute>} />
        <Route path="/admin/visits" element={<AdminRoute><AdminVisitsPage /></AdminRoute>} />
        <Route path="/admin/attendance" element={<AdminRoute><AdminAttendancePage /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
        <Route path="/admin/sales" element={<AdminRoute><AdminSalesPage /></AdminRoute>} />
        <Route path="/admin/photos" element={<AdminRoute><PhotoCompliancePage /></AdminRoute>} />
        <Route path="/tracking" element={<ProtectedRoute allowedRoles={['Admin', 'National Sales Manager']}><LiveTrackingPage /></ProtectedRoute>} />
        <Route path="/admin/locations" element={<AdminRoute><LocationManagementPage /></AdminRoute>} />
        <Route path="/admin/hr" element={<AdminRoute><HRManagementPage /></AdminRoute>} />
        <Route path="/admin/shifts" element={<AdminRoute><ShiftsPage /></AdminRoute>} />
        <Route path="/admin/region-city-report" element={<AdminRoute><RegionCityReportPage /></AdminRoute>} />

        {/* Unauthorized */}
        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">🚫</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800">Access Denied</h1>
              <p className="text-slate-500 mt-2 text-sm">You don't have permission to view this page.</p>
              <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Go Back
              </button>
            </div>
          </div>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
