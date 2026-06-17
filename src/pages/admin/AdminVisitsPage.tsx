import React, { useState, useEffect } from 'react';
import { MapPin, Search, Image, Clock, Navigation } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { visitsApi } from '../../api/visitsApi';
import type { Visit } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const AdminVisitsPage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const limit = 10;

  useEffect(() => {
    const load = async () => {
      try {
        const v = await visitsApi.getAll();
        setVisits(v);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load visits');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = visits.filter(v => {
    const matchSearch = v.shopName?.toLowerCase().includes(search.toLowerCase()) || v.userName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  if (loading) {
    return (
      <AppLayout title="Visit Monitoring">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading visits..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Visit Monitoring">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Visit Monitoring</h2>
          <p className="text-sm text-slate-500">{visits.length} total visits recorded</p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search by shop or user..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All Status</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <Card>
          <Table
            columns={[
              { header: 'Shop', accessor: (v) => (
                <div>
                  <p className="font-medium text-slate-800 text-sm">{v.shopName}</p>
                  <p className="text-xs text-slate-500">{v.userName}</p>
                </div>
              )},
              { header: 'Start Time', accessor: (v) => <span className="text-sm text-slate-600">{format(new Date(v.visitStartTime), 'dd MMM, HH:mm')}</span> },
              { header: 'Duration', accessor: (v) => (
                <span className="text-sm text-slate-600">
                  {v.durationMinutes ? `${v.durationMinutes} min` : <span className="text-blue-600 font-medium animate-pulse">{`Live(${v.durationMinutes} min)`}</span>}
                </span>
              )},
              { header: 'GPS', accessor: (v) => v.latitude ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs">
                  <Navigation className="w-3 h-3" />
                  {v.latitude.toFixed(3)}, {v.longitude?.toFixed(3)}
                </div>
              ) : <span className="text-xs text-slate-400">No GPS</span> },
              { header: 'Photos', accessor: (v) => (
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Image className="w-3.5 h-3.5" />{v.photos?.length || 0}/3
                </span>
              )},
              { header: 'Status', accessor: (v) => <StatusBadge status={v.status} /> },
              { header: 'Details', accessor: (v) => (
                <button onClick={() => setSelectedVisit(v)} className="text-blue-600 text-xs hover:underline font-medium">View</button>
              )},
            ]}
            data={paginated}
            keyExtractor={v => v.id}
          />
          <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
        </Card>
      </div>

      <Modal isOpen={!!selectedVisit} onClose={() => setSelectedVisit(null)} title="Visit Details" size="lg">
        {selectedVisit && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Shop', value: selectedVisit.shopName },
                { label: 'Field Staff', value: selectedVisit.userName },
                { label: 'Start Time', value: format(new Date(selectedVisit.visitStartTime), 'dd MMM yyyy · HH:mm') },
                { label: 'End Time', value: selectedVisit.visitEndTime ? format(new Date(selectedVisit.visitEndTime), 'dd MMM yyyy · HH:mm') : 'In Progress' },
                { label: 'Duration', value: selectedVisit.durationMinutes ? `${selectedVisit.durationMinutes} minutes` : 'In Progress' },
                { label: 'Status', value: <StatusBadge status={selectedVisit.status} /> },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
                </div>
              ))}
            </div>
            {selectedVisit.latitude && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs text-emerald-600 font-medium mb-1 flex items-center gap-1"><Navigation className="w-3 h-3" />GPS Location</p>
                <p className="text-sm text-slate-700">{selectedVisit.latitude?.toFixed(6)}, {selectedVisit.longitude?.toFixed(6)}</p>
              </div>
            )}
            {selectedVisit.remarks && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Remarks</p>
                <p className="text-sm text-slate-700">{selectedVisit.remarks}</p>
              </div>
            )}
            {selectedVisit.photos && selectedVisit.photos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Visit Photos ({selectedVisit.photos.length})</p>
                <div className="grid grid-cols-3 gap-3">
                  {selectedVisit.photos.map(photo => (
                    <div key={photo.id} className="space-y-1">
                      <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                        <img src={photo.photoUrl} alt={photo.photoType} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs text-slate-500 text-center">{photo.photoType.replace(/([A-Z])/g, ' $1').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
