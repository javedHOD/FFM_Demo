import React, { useState, useEffect } from 'react';
import { QrCode, Search, Filter, Download, MapPin, User, ShoppingBag, Calendar, Navigation } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { imeiApi } from '../../api/imeiApi';
import type { IMEIVerificationLog } from '../../types/imei';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

type LogFilters = {
  dateFrom: string;
  dateTo: string;
  region: string;
  city: string;
  promoterId: string;
  shopId: string;
  imei: string;
  productCategory: string;
};

const toApiFilters = (filters: LogFilters) => ({
  ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
  ...(filters.dateTo && { dateTo: filters.dateTo }),
  ...(filters.region && { region: filters.region }),
  ...(filters.city && { city: filters.city }),
  ...(filters.promoterId && { promoterId: Number(filters.promoterId) }),
  ...(filters.shopId && { shopId: Number(filters.shopId) }),
  ...(filters.imei && { imei: filters.imei }),
  ...(filters.productCategory && { productCategory: filters.productCategory }),
});

const formatDateTime = (value?: string) =>
  value ? format(new Date(value), 'dd MMM yyyy · hh:mm a') : '—';

const formatDate = (value?: string) =>
  value ? format(new Date(value), 'dd MMM yyyy') : '—';

export const ImeiVerificationLogPage: React.FC = () => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<IMEIVerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IMEIVerificationLog | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    dateFrom: '', dateTo: '', region: '', city: '',
    promoterId: '', shopId: '', imei: '', productCategory: '',
  });
  const [search, setSearch] = useState('');

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await imeiApi.getLogs(toApiFilters(filters));
      setLogs(data);
      setPage(1);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load IMEI logs');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const url = await imeiApi.exportLogs(toApiFilters(filters));
      const a = document.createElement('a');
      a.href = url;
      a.download = `imei_verification_log_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export successful');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.ScanIMEI.toLowerCase().includes(q) ||
      log.ShopName?.toLowerCase().includes(q) ||
      log.PromoterName?.toLowerCase().includes(q) ||
      log.ProductName?.toLowerCase().includes(q) ||
      log.CustomerName?.toLowerCase().includes(q) ||
      log.Region?.toLowerCase().includes(q) ||
      log.City?.toLowerCase().includes(q)
    );
  });

  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateFilter = (key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  if (loading) {
    return (
      <AppLayout title="IMEI Verification Log">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading IMEI logs..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="IMEI Verification Log">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">IMEI Verification Log Report</h2>
            <p className="text-sm text-slate-500">{filteredLogs.length} records</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>Export CSV</Button>
            <Button variant="primary" size="sm" leftIcon={<Search className="w-4 h-4" />} onClick={loadLogs}>Refresh</Button>
          </div>
        </div>

        <Input
          placeholder="Search by IMEI, shop, promoter, product..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date From</label>
                <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date To</label>
                <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
                <input type="text" placeholder="Filter by region" value={filters.region} onChange={e => updateFilter('region', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <input type="text" placeholder="Filter by city" value={filters.city} onChange={e => updateFilter('city', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Promoter</label>
                <input type="text" placeholder="Filter by promoter ID" value={filters.promoterId} onChange={e => updateFilter('promoterId', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Product Category</label>
                <input type="text" placeholder="e.g. Mobile" value={filters.productCategory} onChange={e => updateFilter('productCategory', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">IMEI</label>
                <input type="text" placeholder="Search by IMEI number" value={filters.imei} onChange={e => updateFilter('imei', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" size="sm" onClick={loadLogs}>Apply Filters</Button>
            </div>
          </div>
        </Card>

        <Card>
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No IMEI verification logs found</p>
              <p className="text-slate-400 text-sm mt-1">Logs will appear when promoters verify IMEI numbers during visits</p>
            </div>
          ) : (
            <>
              <Table
                columns={[
                  {
                    header: 'IMEI / Shop',
                    accessor: (log) => (
                      <div className="min-w-[180px]">
                        <p className="font-mono text-sm font-medium text-slate-800">{log.ScanIMEI}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{log.ShopName || '—'}</p>
                      </div>
                    ),
                  },
                  {
                    header: 'Promoter',
                    accessor: (log) => (
                      <div className="flex items-center gap-1.5 min-w-[120px]">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{log.PromoterName || '—'}</span>
                      </div>
                    ),
                  },
                  {
                    header: 'Product',
                    accessor: (log) => (
                      <div className="min-w-[140px]">
                        <p className="text-sm text-slate-800 truncate">{log.ProductName || '—'}</p>
                        <p className="text-xs text-slate-500">{log.ProductCategory || '—'}</p>
                      </div>
                    ),
                  },
                  {
                    header: 'Location',
                    accessor: (log) => (
                      <div className="flex items-start gap-1.5 min-w-[120px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-700">{log.Region || '—'}</p>
                          <p className="text-xs text-slate-500">{log.City || '—'}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Invoice',
                    accessor: (log) => (
                      <div className="min-w-[100px]">
                        <p className="text-sm text-slate-700">{log.InvoiceNo || '—'}</p>
                        <p className="text-xs text-slate-500">{formatDate(log.InvoiceDate)}</p>
                      </div>
                    ),
                  },
                  {
                    header: 'Scanned',
                    accessor: (log) => (
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTime(log.ScanDatetime)}
                      </span>
                    ),
                  },
                  {
                    header: 'Details',
                    accessor: (log) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        className="text-blue-600 text-xs hover:underline font-medium"
                      >
                        View
                      </button>
                    ),
                  },
                ]}
                data={paginatedLogs}
                keyExtractor={log => log.IMEIVerificationLogId}
                onRowClick={setSelectedLog}
              />
              <Pagination
                page={page}
                totalPages={Math.ceil(filteredLogs.length / PAGE_SIZE)}
                onPageChange={setPage}
                total={filteredLogs.length}
                limit={PAGE_SIZE}
              />
            </>
          )}
        </Card>
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="IMEI Verification Details" size="lg">
        {selectedLog && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-mono font-semibold text-slate-800">{selectedLog.ScanIMEI}</p>
                <p className="text-sm text-slate-500 mt-0.5">{selectedLog.ShopName}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDateTime(selectedLog.ScanDatetime)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Promoter', value: selectedLog.PromoterName, icon: User },
                { label: 'Customer', value: selectedLog.CustomerName, icon: User },
                { label: 'Product', value: selectedLog.ProductName, icon: ShoppingBag },
                { label: 'Category', value: selectedLog.ProductCategory, icon: ShoppingBag },
                { label: 'Company', value: selectedLog.ApiCompanyName, icon: ShoppingBag },
                { label: 'Region', value: selectedLog.Region, icon: MapPin },
                { label: 'City', value: selectedLog.City, icon: MapPin },
                { label: 'Invoice No', value: selectedLog.InvoiceNo, icon: Calendar },
                { label: 'Invoice Date', value: formatDate(selectedLog.InvoiceDate), icon: Calendar },
                { label: 'Visit ID', value: selectedLog.VisitId, icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-2 p-3 border border-slate-100 rounded-lg">
                  <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedLog.Lat != null && selectedLog.Long != null && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg">
                <Navigation className="w-4 h-4" />
                GPS: {selectedLog.Lat}, {selectedLog.Long}
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
