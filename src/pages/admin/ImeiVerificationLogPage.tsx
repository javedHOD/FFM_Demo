import React, { useState, useEffect } from 'react';
import { QrCode, Search, Filter, Download, Calendar, MapPin, User, ShoppingBag } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { imeiApi } from '../../api/imeiApi';
import type { IMEIVerificationLog } from '../../types/imei';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const ImeiVerificationLogPage: React.FC = () => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<IMEIVerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', region: '', city: '',
    promoterId: '', shopId: '', imei: '', productCategory: '',
  });
  const [search, setSearch] = useState('');

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await imeiApi.getLogs(filters);
      setLogs(data);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load IMEI logs');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const url = await imeiApi.exportLogs(filters);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imei_verification_log_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('✅ Export successful!');
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

  const updateFilter = (key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

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

        <Input placeholder="Search by IMEI, shop, promoter, product..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />

        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-700">Filters</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Date From</label><input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Date To</label><input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Region</label><input type="text" placeholder="Filter by region" value={filters.region} onChange={e => updateFilter('region', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label><input type="text" placeholder="Filter by city" value={filters.city} onChange={e => updateFilter('city', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Promoter</label><input type="text" placeholder="Filter by promoter ID" value={filters.promoterId} onChange={e => updateFilter('promoterId', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Product Category</label><input type="text" placeholder="e.g. Mobile" value={filters.productCategory} onChange={e => updateFilter('productCategory', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">IMEI</label><input type="text" placeholder="Search by IMEI number" value={filters.imei} onChange={e => updateFilter('imei', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" text="Loading IMEI logs..." /></div>
        ) : filteredLogs.length === 0 ? (
          <Card><div className="p-12 text-center"><QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">No IMEI verification logs found</p><p className="text-slate-400 text-sm mt-1">Logs will appear when promoters verify IMEI numbers during visits</p></div></Card>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map(log => (
              <Card key={log.IMEIVerificationLogId}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.IsDummy ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                        <QrCode className={`w-5 h-5 ${log.IsDummy ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{log.ShopName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">IMEI: <span className="font-mono">{log.ScanIMEI}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      {log.IsDummy && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">TEST</span>}
                      <p className="text-xs text-slate-400 mt-1">{log.ScanDatetime ? format(new Date(log.ScanDatetime), 'dd MMM · hh:mm a') : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs"><User className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="text-slate-500">Promoter:</span><span className="text-slate-800 font-medium truncate">{log.PromoterName}</span></div>
                    <div className="flex items-center gap-2 text-xs"><ShoppingBag className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="text-slate-500">Product:</span><span className="text-slate-800 font-medium truncate">{log.ProductName}</span></div>
                    <div className="flex items-center gap-2 text-xs"><MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="text-slate-500">Region:</span><span className="text-slate-800 font-medium truncate">{log.Region}</span></div>
                    <div className="flex items-center gap-2 text-xs"><Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="text-slate-500">Invoice:</span><span className="text-slate-800 font-medium truncate">{log.InvoiceNo}</span></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
                    <div><span className="text-slate-500">Customer: </span><span className="text-slate-800">{log.CustomerName}</span></div>
                    <div><span className="text-slate-500">Company: </span><span className="text-slate-800">{log.ApiCompanyName}</span></div>
                    <div><span className="text-slate-500">Category: </span><span className="text-slate-800">{log.ProductCategory}</span></div>
                    <div><span className="text-slate-500">City: </span><span className="text-slate-800">{log.City}</span></div>
                    {log.Lat && <div><span className="text-slate-500">GPS: </span><span className="text-slate-800">{log.Lat}, {log.Long}</span></div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
