import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, CheckCircle, ShoppingCart, DollarSign,
  Camera, Navigation, AlertCircle, TrendingUp, ArrowRight,
  Users, Store, Package, BarChart2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatCard, Card, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { reportsApi } from '../../api/reportsApi';
import type { DashboardStats, Visit, Order } from '../../types';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; visits: number; completed: number }[]>([]);
  const [salesData, setSalesData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Not Checked In');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const isNSM = user.roleName === 'National Sales Manager';
        const data = isNSM
          ? await reportsApi.getDashboardPageManager()
          : await reportsApi.getDashboardPage();

        setStats(data.stats);
        setRecentVisits(data.recentVisits);
        setRecentOrders(data.recentOrders);
        setWeeklyData(data.weeklyData);
        setSalesData(data.salesData);
        if (data.todayAttendance) {
          setAttendanceStatus(data.todayAttendance.status === 'CheckedIn' ? 'Checked In' : 'Checked Out');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, user?.roleName]);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </AppLayout>
    );
  }

  const isAdmin = user?.roleName === 'Admin';
  const isNSM = user?.roleName === 'National Sales Manager';
  const isRM = user?.roleName === 'Regional Manager';
  const isFieldStaff = user?.roleName === 'Promoter' || user?.roleName === 'City Manager';

  return (
    <AppLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 right-24 w-32 h-32 bg-white/5 rounded-full translate-y-12" />
        <div className="relative">
          <p className="text-blue-200 text-sm font-medium">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
          <h2 className="text-2xl font-bold text-white mt-1">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.fullName.split(' ')[0]}! 👋
          </h2>
          <p className="text-blue-200 text-sm mt-2">
            {isAdmin ? 'Overview of all field operations' : `Your performance dashboard · ${user?.cityName || user?.regionName}`}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-2 h-2 rounded-full ${attendanceStatus !== 'Not Checked In' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-white text-xs font-medium">Attendance: {attendanceStatus}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(isAdmin || isNSM) && (
          <>
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users className="w-5 h-5" />} color="blue" trend={{ value: 8, label: 'vs last month' }} />
            <StatCard title="Active Staff" value={stats?.activeFieldStaff || 0} icon={<Users className="w-5 h-5" />} color="green" />
            <StatCard title="Total Shops" value={stats?.totalShops || 0} icon={<Store className="w-5 h-5" />} color="purple" />
            <StatCard title="Pending Approvals" value={stats?.pendingApprovals || 0} icon={<AlertCircle className="w-5 h-5" />} color="orange" onClick={() => navigate(isAdmin ? '/admin/orders' : '/order-approvals')} />
          </>
        )}
        <StatCard title="Today's Visits" value={stats?.todayVisits || 0} icon={<MapPin className="w-5 h-5" />} color="blue" onClick={() => navigate(isAdmin ? '/admin/visits' : '/visits')} />
        <StatCard title="Completed Visits" value={stats?.completedVisits || 0} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={<ShoppingCart className="w-5 h-5" />} color="purple" onClick={() => navigate(isAdmin ? '/admin/orders' : '/orders')} />
        <StatCard title="Sales Amount" value={`SAR ${(stats?.salesAmount || 0).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="cyan" trend={{ value: 12, label: 'vs last week' }} />
        {!isAdmin && (
          <>
            <StatCard title="Photos Uploaded" value={stats?.photosUploaded || 0} icon={<Camera className="w-5 h-5" />} color="pink" />
            <StatCard title="GPS Compliance" value={`${stats?.gpsCompliance || 0}%`} icon={<Navigation className="w-5 h-5" />} color="indigo" />
          </>
        )}
        {(isAdmin || isNSM || isRM) && (
          <StatCard title="Pending Orders" value={stats?.pendingOrders || 0} icon={<Package className="w-5 h-5" />} color="orange" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly Visits Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Weekly Visit Performance"
              subtitle="Visits vs Completed"
              icon={<BarChart2 className="w-4 h-4" />}
            />
            <div className="p-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="visits" fill="#dbeafe" name="Total Visits" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#2563eb" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Sales Trend */}
        <Card>
          <CardHeader title="Sales Trend" subtitle="Monthly performance" icon={<TrendingUp className="w-4 h-4" />} />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`SAR ${Number(v).toLocaleString()}`, 'Sales']} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visits */}
        <Card>
          <CardHeader
            title="Recent Visits"
            subtitle="Latest field visits"
            icon={<MapPin className="w-4 h-4" />}
            action={
              <button
                onClick={() => navigate(isAdmin ? '/admin/visits' : '/visits')}
                className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {recentVisits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No visits recorded today</div>
            ) : (
              recentVisits.map(visit => (
                <div key={visit.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{visit.shopName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{visit.userName}</p>
                    </div>
                    <StatusBadge status={visit.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(visit.visitStartTime), 'hh:mm a')}
                    </span>
                    {visit.durationMinutes && (
                      <span>{visit.durationMinutes} min</span>
                    )}
                    {visit.latitude && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Navigation className="w-3 h-3" />GPS
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader
            title="Recent Orders"
            subtitle="Latest order submissions"
            icon={<ShoppingCart className="w-4 h-4" />}
            action={
              <button
                onClick={() => navigate(isAdmin ? '/admin/orders' : isFieldStaff ? '/orders' : '/order-approvals')}
                className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No orders yet</div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{order.productName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.shopName} · Qty: {order.quantity}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{order.userName}</span>
                    <span>·</span>
                    <span>{format(new Date(order.createdAt), 'dd MMM')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};
