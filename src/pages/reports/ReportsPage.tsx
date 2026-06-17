import React, { useState, useEffect } from 'react';
import {
  Download, MapPin, Clock, DollarSign, ShoppingCart,
  Camera, Navigation, BarChart2, Users, Image, X, ChevronLeft, ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { reportsApi } from '../../api/reportsApi';
import { format, isValid } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { csvFilename, downloadCsv } from '../../utils/exportCsv';
import { getOrderLineItems, getItemStatus } from '../../utils/orderUtils';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Safe date formatter ─────────────────────────────────────
// Returns '—' instead of crashing when value is null / undefined / invalid
const safeFormat = (value: any, pattern: string, fallback = '—'): string => {
  if (!value) return fallback;
  const d = new Date(value);
  if (!isValid(d)) return fallback;
  return format(d, pattern);
};

// ─── Safe number formatter ────────────────────────────────────
const safeNum = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

// Photo type display labels
const PHOTO_LABELS: Record<string, string> = {
  OutsideShop:          'Outside Shop',
  ShelfPhoto:           'Shelf / Stock',
  SelfieWithShopkeeper: 'Selfie with Shopkeeper',
};

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visits' | 'attendance' | 'sales' | 'orders' | 'photos' | 'gps'>('visits');
  const [visits, setVisits]         = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sales, setSales]           = useState<any[]>([]);
  const [orders, setOrders]         = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Lightbox
  const [lightbox, setLightbox] = useState<{ photos: any[]; index: number } | null>(null);
  const openLightbox  = (photos: any[], index: number) => setLightbox({ photos, index });
  const closeLightbox = () => setLightbox(null);
  const prevPhoto     = () => setLightbox(lb => lb && lb.index > 0 ? { ...lb, index: lb.index - 1 } : lb);
  const nextPhoto     = () => setLightbox(lb => lb && lb.index < lb.photos.length - 1 ? { ...lb, index: lb.index + 1 } : lb);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, a, s, o, wd, md] = await Promise.all([
          reportsApi.getVisitReport(),
          reportsApi.getAttendanceReport(),
          reportsApi.getSalesReport(),
          reportsApi.getOrderReport(),
          reportsApi.getWeeklyVisitData(),
          reportsApi.getMonthlySalesData(),
        ]);
        console.log('see ', v)
        setVisits(Array.isArray(v) ? v : []);
        setAttendance(Array.isArray(a) ? a : []);
        setSales(Array.isArray(s) ? s : []);
        setOrders(Array.isArray(o) ? o : []);
        setWeeklyData(Array.isArray(wd) ? wd : []);
        setMonthlyData(Array.isArray(md) ? md.slice(-6) : []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived stats ─────────────────────────────────────────
  const totalSales = sales.reduce((sum, s) => sum + safeNum(s.amount), 0);

  const orderStatusData = [
    { name: 'Pending',   value: orders.filter(o => o.status === 'Pending').length },
    { name: 'Approved',  value: orders.filter(o => o.status === 'Approved').length },
    { name: 'Rejected',  value: orders.filter(o => o.status === 'Rejected').length },
    { name: 'Completed', value: orders.filter(o => o.status === 'Completed').length },
  ].filter(d => d.value > 0);

  const completedVisits = visits.filter(v => v.status === 'Completed');
  const visitsWithPhotos = completedVisits.filter(v => v.photos?.length > 0);
  const photoCompliance = completedVisits.length
    ? Math.round((visitsWithPhotos.length / completedVisits.length) * 100)
    : 0;

  const gpsCheckins     = attendance.filter(a => a.checkInLatitude).length;
  const gpsVisits       = visits.filter(v => v.latitude).length;
  const overallGps      = visits.length + attendance.length > 0
    ? Math.round(((gpsCheckins + gpsVisits) / (attendance.length + visits.length)) * 100)
    : 0;

  const tabs = [
    { id: 'visits',     label: 'Visits',      icon: <MapPin className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance',   icon: <Clock className="w-4 h-4" /> },
    { id: 'sales',      label: 'Sales',        icon: <DollarSign className="w-4 h-4" /> },
    { id: 'orders',     label: 'Orders',       icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'photos',     label: 'Photos',       icon: <Camera className="w-4 h-4" /> },
    { id: 'gps',        label: 'GPS',          icon: <Navigation className="w-4 h-4" /> },
  ];

  const handleExport = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let prefix = activeTab;

    switch (activeTab) {
      case 'visits':
        if (visits.length === 0) {
          toast.error('No visit data to export');
          return;
        }
        headers = ['Shop', 'Staff', 'Status', 'Visit Start', 'Duration (min)', 'Latitude', 'Longitude', 'Photos', 'GPS'];
        rows = visits.map(v => [
          v.shopName ?? '',
          v.userName ?? `User #${v.userId}`,
          v.status ?? '',
          safeFormat(v.visitStartTime, 'dd MMM yyyy, hh:mm a'),
          v.durationMinutes ?? '',
          v.latitude ?? '',
          v.longitude ?? '',
          v.photos?.length ?? 0,
          v.latitude ? 'Yes' : 'No',
        ]);
        break;

      case 'attendance':
        if (attendance.length === 0) {
          toast.error('No attendance data to export');
          return;
        }
        headers = ['Staff', 'Status', 'Check In', 'Check Out', 'Latitude', 'Longitude', 'Selfie'];
        rows = attendance.map(a => [
          a.userName ?? `User #${a.userId}`,
          a.status ?? '',
          safeFormat(a.checkInTime, 'dd MMM yyyy, hh:mm a'),
          safeFormat(a.checkOutTime, 'dd MMM yyyy, hh:mm a', ''),
          a.checkInLatitude ?? '',
          a.checkInLongitude ?? '',
          a.selfieUrl ? 'Yes' : 'No',
        ]);
        break;

      case 'sales':
        if (sales.length === 0) {
          toast.error('No sales data to export');
          return;
        }
        headers = ['Product', 'Shop', 'Staff', 'Quantity', 'Amount', 'Date'];
        rows = sales.map(s => [
          s.productName ?? '',
          s.shopName ?? '',
          s.userName ?? `User #${s.userId}`,
          s.quantity ?? '',
          safeNum(s.amount),
          safeFormat(s.createdAt, 'dd MMM yyyy'),
        ]);
        break;

      case 'orders':
        if (orders.length === 0) {
          toast.error('No order data to export');
          return;
        }
        headers = ['Order #', 'Product', 'Shop', 'Staff', 'Quantity', 'Item Status', 'Order Status', 'Date'];
        rows = orders.flatMap(o =>
          getOrderLineItems(o).map(item => [
            o.id,
            item.productName,
            o.shopName ?? '',
            o.userName ?? `User #${o.userId}`,
            item.quantity,
            getItemStatus(item),
            o.status ?? '',
            safeFormat(o.createdAt, 'dd MMM yyyy'),
          ])
        );
        break;

      case 'photos':
        if (visitsWithPhotos.length === 0) {
          toast.error('No photo compliance data to export');
          return;
        }
        headers = ['Shop', 'Staff', 'Visit Date', 'Photos Uploaded', 'Compliance'];
        rows = visitsWithPhotos.map(v => {
          const count = v.photos?.length ?? 0;
          return [
            v.shopName ?? '',
            v.userName ?? `User #${v.userId}`,
            safeFormat(v.visitStartTime, 'dd MMM yyyy'),
            count,
            count >= 3 ? 'Compliant' : 'Incomplete',
          ];
        });
        break;

      case 'gps': {
        const gpsRecords = [
          ...visits.map(v => ({ ...v, _type: 'Visit' as const })),
          ...attendance.map(a => ({
            ...a,
            shopName: 'Check-in Location',
            latitude: a.checkInLatitude,
            longitude: a.checkInLongitude,
            _type: 'Attendance' as const,
            visitStartTime: a.checkInTime,
          })),
        ].filter(r => r.latitude != null || r.checkInLatitude != null);

        if (gpsRecords.length === 0) {
          toast.error('No GPS data to export');
          return;
        }

        headers = ['Type', 'Location', 'Staff', 'Date & Time', 'Latitude', 'Longitude'];
        rows = gpsRecords.map(r => [
          r._type,
          r.shopName ?? '',
          r.userName ?? `User #${r.userId}`,
          safeFormat(r.visitStartTime ?? r.checkInTime, 'dd MMM yyyy, hh:mm a'),
          safeNum(r.latitude ?? r.checkInLatitude),
          safeNum(r.longitude ?? r.checkInLongitude),
        ]);
        prefix = 'gps';
        break;
      }
    }

    downloadCsv(csvFilename(`${prefix}-report`), headers, rows);
    toast.success(`Exported ${rows.length} record${rows.length !== 1 ? 's' : ''} to CSV`);
  };

  if (loading) {
    return (
      <AppLayout title="Reports">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading reports..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reports">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Reports</h2>
            <p className="text-sm text-slate-500">Field force performance analytics</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════
            VISITS TAB
        ═══════════════════════════════════════════ */}
        {activeTab === 'visits' && (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{visits.length}</p>
                <p className="text-xs text-slate-500 mt-1">Total Visits</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{completedVisits.length}</p>
                <p className="text-xs text-slate-500 mt-1">Completed</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {visits.filter(v => v.status === 'InProgress').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">In Progress</p>
              </div>
            </div>

            {/* Weekly chart */}
            {weeklyData.length > 0 && (
              <Card>
                <CardHeader title="Weekly Visit Activity" icon={<BarChart2 className="w-4 h-4" />} />
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={weeklyData} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,.1)', fontSize: '12px' }} />
                      <Bar dataKey="visits"    fill="#dbeafe" name="Total"     radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#2563eb" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Visit records — with inline photos */}
            <Card>
              <CardHeader
                title="Visit Records"
                subtitle={`${visits.length} visits · ${visitsWithPhotos.length} with photos`}
                icon={<MapPin className="w-4 h-4" />}
              />
              {visits.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No visit records found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {visits.map(v => {
                    const photos: any[] = v.photos ?? [];
                    const hasPhotos = photos.length > 0;
                    return (
                      <div key={v.id} className="p-4">
                        {/* Row header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Status dot */}
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                              v.status === 'Completed'  ? 'bg-emerald-500' :
                              v.status === 'InProgress' ? 'bg-blue-500 animate-pulse' :
                                                          'bg-slate-300'
                            }`} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {v.shopName || '—'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {v.userName || `User #${v.userId}`}
                                {v.visitStartTime ? ` · ${safeFormat(v.visitStartTime, 'dd MMM yyyy, hh:mm a')}` : ''}
                              </p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {v.durationMinutes != null && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="w-3 h-3" />{v.durationMinutes} min
                                  </span>
                                )}
                                {v.latitude && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                                    <Navigation className="w-3 h-3" />GPS
                                  </span>
                                )}
                                {hasPhotos && (
                                  <span className="flex items-center gap-1 text-xs text-blue-600">
                                    <Camera className="w-3 h-3" />{photos.length} photo{photos.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>

                        {/* Photo strip — only for visits that have photos */}
                        {hasPhotos && (
                          <div className="mt-3 ml-5">
                            <div className="flex gap-2 flex-wrap">
                              {photos.map((photo: any, idx: number) => (
                                <button
                                  key={photo.id ?? idx}
                                  onClick={() => openLightbox(photos, idx)}
                                  className="group relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-400 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  title={PHOTO_LABELS[photo.photoType] ?? photo.photoType}
                                >
                                  <img
                                    src={photo.photoUrl}
                                    alt={photo.photoType}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23f1f5f9" width="80" height="80"/><text x="50%" y="55%" text-anchor="middle" fill="%2394a3b8" font-size="11">No img</text></svg>'; }}
                                  />
                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                                    <Image className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  {/* Photo type label */}
                                  <div className="absolute bottom-0 inset-x-0 bg-black/50 py-0.5 px-1">
                                    <p className="text-[9px] text-white text-center leading-tight truncate">
                                      {PHOTO_LABELS[photo.photoType] ?? photo.photoType}
                                    </p>
                                  </div>
                                </button>
                              ))}

                              {/* Placeholder slots for missing photos (up to 3 required) */}
                              {v.status === 'Completed' && photos.length < 3 &&
                                Array.from({ length: 3 - photos.length }).map((_, i) => (
                                  <div
                                    key={`missing-${i}`}
                                    className="w-20 h-20 rounded-xl border-2 border-dashed border-red-200 bg-red-50 flex flex-col items-center justify-center gap-1"
                                    title="Missing photo"
                                  >
                                    <Camera className="w-5 h-5 text-red-300" />
                                    <p className="text-[9px] text-red-400 text-center">Missing</p>
                                  </div>
                                ))
                              }
                            </div>

                            {/* Compliance badge */}
                            {v.status === 'Completed' && (
                              <div className="mt-2">
                                {photos.length >= 3 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                    <CheckCircle className="w-3 h-3" />Photo compliance ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                    <Camera className="w-3 h-3" />{3 - photos.length} photo{3 - photos.length !== 1 ? 's' : ''} missing
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ATTENDANCE TAB
        ═══════════════════════════════════════════ */}
        {activeTab === 'attendance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{attendance.length}</p>
                <p className="text-xs text-slate-500 mt-1">Total Records</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {attendance.filter(a => a.status === 'CheckedIn').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Currently In</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {attendance.filter(a => a.selfieUrl).length}
                </p>
                <p className="text-xs text-slate-500 mt-1">With Selfie</p>
              </div>
            </div>

            <Card>
              <CardHeader
                title="Attendance Records"
                subtitle={`${attendance.length} records`}
                icon={<Clock className="w-4 h-4" />}
              />
              {attendance.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No attendance records found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {attendance.map(a => (
                    <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {a.selfieUrl ? (
                          <img
                            src={a.selfieUrl}
                            alt="Selfie"
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {a.userName || `User #${a.userId}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            In: {safeFormat(a.checkInTime, 'dd MMM · HH:mm')}
                            {a.checkOutTime ? ` · Out: ${safeFormat(a.checkOutTime, 'HH:mm')}` : ' · Still checked in'}
                          </p>
                          {a.checkInLatitude && (
                            <p className="text-xs text-emerald-600">GPS Verified</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SALES TAB
        ═══════════════════════════════════════════ */}
        {activeTab === 'sales' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{sales.length}</p>
                <p className="text-xs text-slate-500 mt-1">Total Entries</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-emerald-600">
                  {totalSales.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Total Amount</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-amber-600">
                  {sales.length ? Math.round(totalSales / sales.length).toLocaleString() : 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">Avg per Sale</p>
              </div>
            </div>

            {monthlyData.length > 0 && (
              <Card>
                <CardHeader title="Monthly Sales Trend" icon={<DollarSign className="w-4 h-4" />} />
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} barSize={30}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickFormatter={v => `${(safeNum(v) / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,.1)', fontSize: '12px' }}
                        formatter={(v: any) => [safeNum(v).toLocaleString(), 'Amount']}
                      />
                      <Bar dataKey="amount" fill="#2563eb" name="Sales" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <Card>
              <CardHeader
                title="Sales Records"
                subtitle={`${sales.length} entries · ${totalSales.toLocaleString()} total`}
                icon={<DollarSign className="w-4 h-4" />}
              />
              {sales.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No sales records found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {sales.map(s => (
                    <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.productName || '—'}</p>
                        <p className="text-xs text-slate-500">
                          {s.shopName || '—'} · By: {s.userName || `User #${s.userId}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          Qty: {s.quantity ?? '—'} · {safeFormat(s.createdAt, 'dd MMM yyyy')}
                        </p>
                      </div>
                      <p className="font-bold text-cyan-700 text-sm whitespace-nowrap">
                        {safeNum(s.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ORDERS TAB
        ═══════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total',     value: orders.length,                                           color: 'text-blue-600' },
                { label: 'Pending',   value: orders.filter(o => o.status === 'Pending').length,       color: 'text-amber-600' },
                { label: 'Approved',  value: orders.filter(o => o.status === 'Approved').length,      color: 'text-emerald-600' },
                { label: 'Rejected',  value: orders.filter(o => o.status === 'Rejected').length,      color: 'text-red-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {orderStatusData.length > 0 && (
              <Card>
                <CardHeader title="Order Status Distribution" icon={<ShoppingCart className="w-4 h-4" />} />
                <div className="p-5 flex justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={orderStatusData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100}
                        paddingAngle={4} dataKey="value"
                      >
                        {orderStatusData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Legend formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <Card>
              <CardHeader
                title="Order Records"
                subtitle={`${orders.length} total orders`}
                icon={<ShoppingCart className="w-4 h-4" />}
              />
              {orders.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No order records found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {orders.map(o => (
                    <div key={o.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">Order #{o.id}</p>
                          <p className="text-xs text-slate-500">
                            {o.shopName || '—'} · By: {o.userName || `User #${o.userId}`}
                          </p>
                          <p className="text-xs text-slate-400">{safeFormat(o.createdAt, 'dd MMM yyyy')}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="space-y-1.5">
                        {getOrderLineItems(o).map((item, idx) => (
                          <div key={item.id ?? idx} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                            <span className="text-slate-700">{item.productName} · Qty: {item.quantity}</span>
                            <StatusBadge status={getItemStatus(item)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            PHOTO COMPLIANCE TAB
        ═══════════════════════════════════════════ */}
        {activeTab === 'photos' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{photoCompliance}%</p>
                <p className="text-xs text-emerald-600 mt-1">Photo Compliance</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{visitsWithPhotos.length}</p>
                <p className="text-xs text-blue-600 mt-1">Visits with Photos</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {completedVisits.length - visitsWithPhotos.length}
                </p>
                <p className="text-xs text-red-600 mt-1">Missing Photos</p>
              </div>
            </div>

            <Card>
              <CardHeader
                title="Photo Compliance by Visit"
                subtitle="Completed visits with uploaded photos"
                icon={<Camera className="w-4 h-4" />}
              />
              {visitsWithPhotos.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No visits with photos found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {visitsWithPhotos.map(v => (
                    <div key={v.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{v.shopName || '—'}</p>
                          <p className="text-xs text-slate-500">
                            {v.userName || `User #${v.userId}`}
                            {v.visitStartTime ? ` · ${safeFormat(v.visitStartTime, 'dd MMM')}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          (v.photos?.length ?? 0) >= 3
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {v.photos?.length ?? 0}/3 photos
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {(v.photos ?? []).map((photo: any) => (
                          <div
                            key={photo.id}
                            className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(photo.photoUrl, '_blank')}
                            title={photo.photoType}
                          >
                            <img
                              src={photo.photoUrl}
                              alt={photo.photoType}
                              className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            GPS COMPLIANCE TAB
        ═══════════════════════════════════════════ */}
        {activeTab === 'gps' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{overallGps}%</p>
                <p className="text-sm text-slate-500 mt-1">Overall GPS Rate</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {attendance.length ? Math.round((gpsCheckins / attendance.length) * 100) : 0}%
                </p>
                <p className="text-sm text-slate-500 mt-1">Check-in GPS</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {visits.length ? Math.round((gpsVisits / visits.length) * 100) : 0}%
                </p>
                <p className="text-sm text-slate-500 mt-1">Visit GPS</p>
              </div>
            </div>

            <Card>
              <CardHeader title="GPS Activity Log" icon={<Navigation className="w-4 h-4" />} />
              {visits.length === 0 && attendance.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No GPS records found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {[
                    ...visits.map(v => ({ ...v, _type: 'visit' })),
                    ...attendance.map(a => ({
                      ...a,
                      shopName: 'Check-in Location',
                      latitude: a.checkInLatitude,
                      longitude: a.checkInLongitude,
                      _type: 'attendance',
                    })),
                  ]
                    .filter(r => r.latitude != null || r.checkInLatitude != null)
                    .slice(0, 15)
                    .map((record, i) => {
                      const lat = safeNum(record.latitude ?? record.checkInLatitude);
                      const lng = safeNum(record.longitude ?? record.checkInLongitude);
                      const hasGps = lat !== 0 || lng !== 0;
                      return (
                        <div key={i} className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {record.shopName || 'Unknown Location'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {record.userName || `User #${record.userId}`}
                              {record._type === 'visit' && record.visitStartTime
                                ? ` · ${safeFormat(record.visitStartTime, 'dd MMM, HH:mm')}`
                                : record.checkInTime
                                ? ` · ${safeFormat(record.checkInTime, 'dd MMM, HH:mm')}`
                                : ''}
                            </p>
                            {hasGps && (
                              <p className="text-xs text-emerald-600 mt-0.5 font-mono">
                                {lat.toFixed(4)}, {lng.toFixed(4)}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                            hasGps
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {hasGps ? '✓ GPS' : 'No GPS'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════
          PHOTO LIGHTBOX
      ═══════════════════════════════════════════ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Photo counter */}
            <p className="text-white/60 text-xs text-center mb-3">
              {lightbox.index + 1} / {lightbox.photos.length} &nbsp;·&nbsp;
              {PHOTO_LABELS[lightbox.photos[lightbox.index]?.photoType] ?? lightbox.photos[lightbox.index]?.photoType}
            </p>

            {/* Main image */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3]">
              <img
                src={lightbox.photos[lightbox.index]?.photoUrl}
                alt={lightbox.photos[lightbox.index]?.photoType}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Prev / Next */}
            {lightbox.photos.length > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={prevPhoto}
                  disabled={lightbox.index === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-xl text-white text-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {/* Thumbnail strip */}
                <div className="flex gap-2">
                  {lightbox.photos.map((p: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(lb => lb ? { ...lb, index: i } : lb)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                        i === lightbox.index ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p.photoUrl} alt={p.photoType} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={nextPhoto}
                  disabled={lightbox.index === lightbox.photos.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-xl text-white text-sm transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
};
