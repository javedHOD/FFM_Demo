import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Search, Download, TrendingUp, Users, Calendar } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { salesApi } from '../../api/salesApi';
import type { SalesEntry } from '../../types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { csvFilename, downloadCsv } from '../../utils/exportCsv';

type DatePreset = 'all' | '10' | '30' | '60' | 'custom';

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: '10', label: 'Last 10 Days' },
  { id: '30', label: 'Last 30 Days' },
  { id: '60', label: 'Last 60 Days' },
  { id: 'custom', label: 'Custom Range' },
];

const getDateRange = (preset: DatePreset, customFrom: string, customTo: string) => {
  const today = endOfDay(new Date());

  if (preset === 'all') return null;
  if (preset === '10') return { start: startOfDay(subDays(today, 9)), end: today };
  if (preset === '30') return { start: startOfDay(subDays(today, 29)), end: today };
  if (preset === '60') return { start: startOfDay(subDays(today, 59)), end: today };

  if (!customFrom) return null;
  const start = startOfDay(new Date(customFrom));
  const end = customTo ? endOfDay(new Date(customTo)) : today;
  if (start > end) return { start: endOfDay(new Date(customTo || customFrom)), end: startOfDay(new Date(customFrom)) };
  return { start, end };
};

const getApiDateParams = (preset: DatePreset, customFrom: string, customTo: string) => {
  const range = getDateRange(preset, customFrom, customTo);
  if (!range) return undefined;
  return {
    from: format(range.start, 'yyyy-MM-dd'),
    to: format(range.end, 'yyyy-MM-dd'),
  };
};

export const AdminSalesPage: React.FC = () => {
  const [sales, setSales] = useState<SalesEntry[]>([]);
  const [salesByUser, setSalesByUser] = useState<{ userId: number; userName?: string; totalAmount: number; totalOrders: number }[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setRefreshing(true);
      try {
        const params = getApiDateParams(datePreset, appliedFrom, appliedTo);
        const [s, byUser] = await Promise.all([
          salesApi.getAll(params),
          salesApi.getSummaryByUser(params),
        ]);
        if (!cancelled) {
          setSales(s);
          setSalesByUser(byUser);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast.error('Failed to load sales data');
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
          setInitialLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [datePreset, appliedFrom, appliedTo]);

  const filtered = useMemo(
    () => sales.filter(s =>
      s.productName.toLowerCase().includes(search.toLowerCase()) ||
      s.shopName?.toLowerCase().includes(search.toLowerCase()) ||
      s.userName?.toLowerCase().includes(search.toLowerCase())
    ),
    [sales, search]
  );

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const key = format(new Date(s.createdAt), 'MMM yyyy');
      map.set(key, (map.get(key) || 0) + s.amount);
    });
    return Array.from(map.entries())
      .map(([month, amount]) => ({ month, amount }))
      .slice(-6);
  }, [sales]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    if (preset !== 'custom') {
      setAppliedFrom('');
      setAppliedTo('');
      setDraftFrom('');
      setDraftTo('');
    } else {
      setDraftFrom(appliedFrom);
      setDraftTo(appliedTo);
    }
  };

  const applyCustomDates = () => {
    if (draftFrom === appliedFrom && draftTo === appliedTo) return;
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setPage(1);
  };

  const preventDateInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyCustomDates();
      e.currentTarget.blur();
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No sales data to export');
      return;
    }

    downloadCsv(
      csvFilename('sales-report'),
      ['Product', 'Shop', 'Staff', 'Quantity', 'Amount (SAR)', 'Date'],
      filtered.map(s => [
        s.productName,
        s.shopName ?? '',
        s.userName ?? `User #${s.userId}`,
        s.quantity,
        s.amount,
        format(new Date(s.createdAt), 'dd MMM yyyy'),
      ])
    );
    toast.success(`Exported ${filtered.length} sales record${filtered.length !== 1 ? 's' : ''}`);
  };

  const rangeLabel = useMemo(() => {
    const range = getDateRange(datePreset, appliedFrom, appliedTo);
    if (!range) return 'All time';
    return `${format(range.start, 'dd MMM yyyy')} – ${format(range.end, 'dd MMM yyyy')}`;
  }, [datePreset, appliedFrom, appliedTo]);

  if (initialLoading) {
    return (
      <AppLayout title="Sales Reports">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading sales data..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Sales Reports">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sales Reports</h2>
            <p className="text-sm text-slate-500">
              {sales.length} entries · {rangeLabel}
            </p>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>

        {/* Date filter */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-slate-800">Date Filter</p>
            {refreshing && (
              <span className="text-xs text-blue-600 font-medium">Updating...</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <form
              onSubmit={(e) => { e.preventDefault(); applyCustomDates(); }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">From</label>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={e => setDraftFrom(e.target.value)}
                  onBlur={applyCustomDates}
                  onKeyDown={preventDateInputSubmit}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">To</label>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  onChange={e => setDraftTo(e.target.value)}
                  onBlur={applyCustomDates}
                  onKeyDown={preventDateInputSubmit}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </form>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Revenue" value={`SAR ${totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="cyan" />
          <StatCard title="Total Entries" value={sales.length} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
          <StatCard title="Total Qty Sold" value={totalQty} icon={<Users className="w-5 h-5" />} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Monthly Revenue" subtitle={rangeLabel} icon={<DollarSign className="w-4 h-4" />} />
            <div className="p-5">
              {monthlyData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No sales in selected period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                    <Bar dataKey="amount" fill="#2563eb" name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Sales by Staff" subtitle={rangeLabel} icon={<Users className="w-4 h-4" />} />
            <div className="divide-y divide-slate-50 max-h-[248px] overflow-y-auto">
              {salesByUser.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No sales in selected period</div>
              ) : (
                salesByUser.map(s => (
                  <div key={s.userId} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.userName || `User #${s.userId}`}</p>
                      <p className="text-xs text-slate-500">{s.totalOrders} entries</p>
                    </div>
                    <p className="font-bold text-cyan-700 text-sm">SAR {s.totalAmount.toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-100">
            <Input placeholder="Search sales..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <Table
            columns={[
              { header: 'Product', accessor: (s) => (
                <div>
                  <p className="font-medium text-slate-800 text-sm">{s.productName}</p>
                  <p className="text-xs text-slate-500">{s.shopName}</p>
                </div>
              )},
              { header: 'Staff', accessor: (s) => <span className="text-sm text-slate-600">{s.userName}</span> },
              { header: 'Qty', accessor: (s) => <span className="text-sm text-slate-700 font-medium">{s.quantity}</span> },
              { header: 'Amount', accessor: (s) => <span className="font-bold text-cyan-700 text-sm">SAR {s.amount.toLocaleString()}</span> },
              { header: 'Date', accessor: (s) => <span className="text-sm text-slate-600">{format(new Date(s.createdAt), 'dd MMM yyyy')}</span> },
            ]}
            data={paginated}
            keyExtractor={s => s.id}
            emptyMessage="No sales found for the selected date range"
          />
          <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
        </Card>
      </div>
    </AppLayout>
  );
};
