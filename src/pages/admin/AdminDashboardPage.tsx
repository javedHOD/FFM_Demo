import React, { useEffect, useState } from 'react';
import { Users, Store, MapPin, Clock, ShoppingCart, DollarSign, TrendingUp, ArrowRight, AlertCircle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatCard, Card, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { reportsApi } from '../../api/reportsApi';
import { visitsApi } from '../../api/visitsApi';
import { ordersApi } from '../../api/ordersApi';
import { attendanceApi } from '../../api/attendanceApi';
import type { DashboardStats, Visit, Order } from '../../types';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; visits: number; completed: number }[]>([]);
  const [salesData, setSalesData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reportsApi.getAdminDashboard(user?.id);
        setStats(data.stats);
        setRecentVisits(data.recentVisits);
        setPendingOrders(data.pendingOrders);
        setWeeklyData(data.weeklyData);
        setSalesData(data.salesData);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load dashboard data');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <AppLayout title="Admin Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin Dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -translate-y-24 translate-x-24" />
        <div className="relative">
          <p className="text-slate-400 text-sm">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
          <h2 className="text-2xl font-bold text-white mt-1">System Overview</h2>
          <p className="text-slate-400 text-sm mt-1">FieldForce Enterprise · Admin Control Panel</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              All services running
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {stats?.pendingApprovals || 0} pending approvals
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users className="w-5 h-5" />} color="blue" trend={{ value: 8, label: 'vs last month' }} onClick={() => navigate('/admin/users')} />
        <StatCard title="Active Field Staff" value={stats?.activeFieldStaff || 0} icon={<Users className="w-5 h-5" />} color="green" onClick={() => navigate('/admin/users')} />
        <StatCard title="Total Shops" value={stats?.totalShops || 0} icon={<Store className="w-5 h-5" />} color="purple" onClick={() => navigate('/admin/shops')} />
        <StatCard title="Pending Approvals" value={stats?.pendingApprovals || 0} icon={<AlertCircle className="w-5 h-5" />} color="orange" onClick={() => navigate('/admin/orders')} />
        <StatCard title="Today's Visits" value={stats?.todayVisits || 0} icon={<MapPin className="w-5 h-5" />} color="cyan" onClick={() => navigate('/admin/visits')} />
        <StatCard title="Completed Visits" value={stats?.completedVisits || 0} icon={<MapPin className="w-5 h-5" />} color="blue" />
        <StatCard title="Total Sales" value={`SAR ${((stats?.salesAmount || 0) / 1000).toFixed(0)}k`} icon={<DollarSign className="w-5 h-5" />} color="cyan" onClick={() => navigate('/admin/sales')} />
        <StatCard title="Photo Compliance" value={`${stats?.gpsCompliance || 0}%`} icon={<Camera className="w-5 h-5" />} color="pink" onClick={() => navigate('/admin/photos')} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Weekly Field Activity" subtitle="Visits tracking" icon={<TrendingUp className="w-4 h-4" />} />
            <div className="p-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Bar dataKey="visits" fill="#dbeafe" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#2563eb" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Sales Trend" subtitle="Monthly revenue" icon={<DollarSign className="w-4 h-4" />} />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="adminSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#adminSalesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visits */}
        <Card>
          <CardHeader
            title="Recent Visits"
            icon={<MapPin className="w-4 h-4" />}
            action={
              <button onClick={() => navigate('/admin/visits')} className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {recentVisits.map(v => (
              <div key={v.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{v.shopName}</p>
                  <p className="text-xs text-slate-500">{v.userName} · {format(new Date(v.createdAt), 'dd MMM, HH:mm')}</p>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader
            title="Pending Orders"
            icon={<ShoppingCart className="w-4 h-4" />}
            action={
              <button onClick={() => navigate('/admin/orders')} className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No pending orders</div>
            ) : (
              pendingOrders.map(o => (
                <div key={o.id} className="p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{o.productName}</p>
                    <p className="text-xs text-slate-500">{o.userName} · Qty: {o.quantity}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};
