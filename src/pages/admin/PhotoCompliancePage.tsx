import React, { useState, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle, Search, Image } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { visitsApi } from '../../api/visitsApi';
import type { Visit } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const PhotoCompliancePage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'compliant' | 'missing'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const v = await visitsApi.getAll();
        setVisits(v.filter(vi => vi.status === 'Completed'));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load photo compliance data');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const getCompliance = (visit: Visit) => {
    const photoCount = visit.photos?.length || 0;
    const required = 3;
    const missing = required - photoCount;
    const types = ['OutsideShop', 'ShelfPhoto', 'SelfieWithShopkeeper'];
    const uploadedTypes = visit.photos?.map(p => p.photoType) || [];
    const missingTypes = types.filter(t => !uploadedTypes.includes(t as any));
    return { photoCount, missing, missingTypes, isCompliant: missing === 0 };
  };

  const filtered = visits.filter(v => {
    const matchSearch = v.shopName?.toLowerCase().includes(search.toLowerCase()) || v.userName?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'compliant') return matchSearch && getCompliance(v).isCompliant;
    if (filter === 'missing') return matchSearch && !getCompliance(v).isCompliant;
    return matchSearch;
  });

  const compliant = visits.filter(v => getCompliance(v).isCompliant).length;
  const missing = visits.filter(v => !getCompliance(v).isCompliant).length;
  const rate = visits.length ? Math.round((compliant / visits.length) * 100) : 0;

  if (loading) {
    return (
      <AppLayout title="Photo Compliance">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading photo data..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Photo Compliance">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Photo Compliance</h2>
          <p className="text-sm text-slate-500">Monitor visit photo submissions</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Compliance Rate" value={`${rate}%`} icon={<Camera className="w-5 h-5" />} color="blue" />
          <StatCard title="Fully Compliant" value={compliant} icon={<CheckCircle className="w-5 h-5" />} color="green" onClick={() => setFilter('compliant')} />
          <StatCard title="Missing Photos" value={missing} icon={<AlertCircle className="w-5 h-5" />} color="orange" onClick={() => setFilter('missing')} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search by shop or staff..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'compliant', 'missing'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No visits match your filter</p>
              </div>
            </Card>
          ) : (
            filtered.map(visit => {
              const { photoCount, missing, missingTypes, isCompliant } = getCompliance(visit);
              return (
                <Card key={visit.id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 text-sm">{visit.shopName}</p>
                          {isCompliant ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" />Compliant
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" />{missing} missing
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{visit.userName} · {format(new Date(visit.visitStartTime), 'dd MMM yyyy HH:mm:ss')}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{photoCount}/3</span>
                    </div>

                    {/* Photo Types Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {['OutsideShop', 'ShelfPhoto', 'SelfieWithShopkeeper'].map(type => {
                        const photo = visit.photos?.find(p => p.photoType === type);
                        const label = type === 'OutsideShop' ? 'Outside Shop' : type === 'ShelfPhoto' ? 'Shelf Photo' : 'Selfie';
                        return (
                          <div key={type} className={`rounded-xl border-2 overflow-hidden ${photo ? 'border-emerald-200' : 'border-dashed border-red-200'}`}>
                            {photo ? (
                              <div className="relative">
                                <div className="aspect-video">
                                  <img src={photo.photoUrl} alt={type} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] py-0.5 px-1 text-center">
                                  {label}
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-red-50 flex flex-col items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-400 mb-0.5" />
                                <p className="text-[9px] text-red-400 text-center px-1">{label}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};
