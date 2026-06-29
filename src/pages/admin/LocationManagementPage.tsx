import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, Globe, Building, Landmark } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { locationApi } from '../../api/locationApi';
import type { Country, Region, City } from '../../types/hr';
import toast from 'react-hot-toast';

type TabType = 'countries' | 'regions' | 'cities';

export const LocationManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Country | Region | City | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const limit = 10;

  const [form, setForm] = useState<any>({
    name: '',
    code: '',
    phoneCode: '',
    countryId: '',
    regionId: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await locationApi.getLocationManagementPage();
      setCountries(data.countries);
      setRegions(data.regions);
      setCities(data.cities);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load location data');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      if (activeTab === 'countries') {
        setForm((f: any) => ({ ...f, name: item.name, code: item.code, phoneCode: item.phoneCode, isActive: item.isActive }));
      } else if (activeTab === 'regions') {
        setForm((f: any) => ({ ...f, name: item.name, code: item.code, countryId: String(item.countryId), isActive: item.isActive }));
      } else {
        setForm((f: any) => ({ ...f, name: item.name, code: item.code, countryId: String(item.countryId), regionId: String(item.regionId), isActive: item.isActive }));
      }
    } else {
      setSelectedItem(null);
      setForm({ name: '', code: '', phoneCode: '', countryId: '', regionId: '', isActive: true });
    }
    setErrors({});
    setEditModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = 'Name is required';
    if (activeTab === 'regions' && !form.countryId) errs.countryId = 'Country is required';
    if (activeTab === 'cities' && !form.countryId) errs.countryId = 'Country is required';
    if (activeTab === 'cities' && !form.regionId) errs.regionId = 'Region is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setActionLoading(true);
    try {
      if (activeTab === 'countries') {
        if (selectedItem) {
          await locationApi.updateCountry((selectedItem as Country).id, form);
          toast.success('Country updated!');
        } else {
          await locationApi.createCountry(form);
          toast.success('Country created!');
        }
      } else if (activeTab === 'regions') {
        if (selectedItem) {
          await locationApi.updateRegion((selectedItem as Region).id, form);
          toast.success('Region updated!');
        } else {
          await locationApi.createRegion({ ...form, countryId: Number(form.countryId) });
          toast.success('Region created!');
        }
      } else {
        if (selectedItem) {
          await locationApi.updateCity((selectedItem as City).id, form);
          toast.success('City updated!');
        } else {
          await locationApi.createCity({ ...form, countryId: Number(form.countryId), regionId: Number(form.regionId) });
          toast.success('City created!');
        }
      }
      setEditModal(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      if (activeTab === 'countries') {
        await locationApi.deleteCountry((selectedItem as Country).id);
      } else if (activeTab === 'regions') {
        await locationApi.deleteRegion((selectedItem as Region).id);
      } else {
        await locationApi.deleteCity((selectedItem as City).id);
      }
      toast.success('Deleted successfully!');
      setDeleteModal(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  const getFilteredData = () => {
    let data: any[] = [];
    if (activeTab === 'countries') {
      data = countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    } else if (activeTab === 'regions') {
      data = regions.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
        const matchCountry = !countryFilter || String(r.countryId) === countryFilter;
        return matchSearch && matchCountry;
      });
    } else {
      data = cities.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
        const matchCountry = !countryFilter || String(c.countryId) === countryFilter;
        const matchRegion = !regionFilter || String(c.regionId) === regionFilter;
        return matchSearch && matchCountry && matchRegion;
      });
    }
    return data;
  };

  const filtered = getFilteredData();
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const tabs = [
    { id: 'countries', label: 'Countries', icon: <Globe className="w-4 h-4" />, count: countries.length },
    { id: 'regions', label: 'Regions', icon: <Building className="w-4 h-4" />, count: regions.length },
    { id: 'cities', label: 'Cities', icon: <Landmark className="w-4 h-4" />, count: cities.length },
  ];

  if (loading) {
    return (
      <AppLayout title="Location Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading locations..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Location Management">
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setPage(1); setSearch(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.icon}{tab.label}
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">{activeTab}</h2>
            <p className="text-sm text-slate-500">{filtered.length} total {activeTab}</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openEdit()}>
            Add {activeTab === 'countries' ? 'Country' : activeTab === 'regions' ? 'Region' : 'City'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          {activeTab === 'regions' && (
            <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Countries</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {activeTab === 'cities' && (
            <>
              <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setRegionFilter(''); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">All Countries</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" disabled={!countryFilter}>
                <option value="">All Regions</option>
                {regions.filter(r => String(r.countryId) === countryFilter).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Table */}
        <Card>
          {activeTab === 'countries' && (
            <Table
              columns={[
                { header: 'Country', accessor: (c: Country) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Globe className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.code}</p>
                    </div>
                  </div>
                )},
                { header: 'Phone Code', accessor: (c: Country) => <span className="text-sm text-slate-600">{c.phoneCode}</span> },
                { header: 'Status', accessor: (c: Country) => <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} /> },
                { header: 'Actions', accessor: (c: Country) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(c); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={paginated as Country[]}
              keyExtractor={c => c.id}
            />
          )}
          {activeTab === 'regions' && (
            <Table
              columns={[
                { header: 'Region', accessor: (r: Region) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Building className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.code || '—'}</p>
                    </div>
                  </div>
                )},
                { header: 'Country', accessor: (r: Region) => <span className="text-sm text-slate-600">{r.countryName}</span> },
                { header: 'Status', accessor: (r: Region) => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
                { header: 'Actions', accessor: (r: Region) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(r); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={paginated as Region[]}
              keyExtractor={r => r.id}
            />
          )}
          {activeTab === 'cities' && (
            <Table
              columns={[
                { header: 'City', accessor: (c: any) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Landmark className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.code || '—'}</p>
                    </div>
                  </div>
                )},
                { header: 'Region', accessor: (c: City) => <span className="text-sm text-slate-600">{c.regionName}</span> },
                { header: 'Country', accessor: (c: City) => <span className="text-sm text-slate-600">{c.countryName}</span> },
                { header: 'Status', accessor: (c: City) => <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} /> },
                { header: 'Actions', accessor: (c: City) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(c); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={paginated as City[]}
              keyExtractor={c => c.id}
            />
          )}
          <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
        </Card>
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={selectedItem ? `Edit ${activeTab === 'countries' ? 'Country' : activeTab === 'regions' ? 'Region' : 'City'}` : `Add ${activeTab === 'countries' ? 'Country' : activeTab === 'regions' ? 'Region' : 'City'}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={actionLoading}>{selectedItem ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} error={errors.name} />
          <Input label="Code" value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} placeholder="Optional short code" />
          {activeTab === 'countries' && (
            <Input label="Phone Code" value={form.phoneCode} onChange={e => setForm((f: any) => ({ ...f, phoneCode: e.target.value }))} placeholder="+92, +966, +971..." />
          )}
          {activeTab === 'regions' && (
            <Select label="Country" required value={form.countryId} onChange={e => setForm((f: any) => ({ ...f, countryId: e.target.value }))} options={countries.map(c => ({ value: c.id, label: c.name }))} placeholder="Select country" error={errors.countryId} />
          )}
          {activeTab === 'cities' && (
            <>
              <Select label="Country" required value={form.countryId} onChange={e => setForm((f: any) => ({ ...f, countryId: e.target.value, regionId: '' }))} options={countries.map(c => ({ value: c.id, label: c.name }))} placeholder="Select country" error={errors.countryId} />
              <Select label="Region" required value={form.regionId} onChange={e => setForm((f: any) => ({ ...f, regionId: e.target.value }))} options={regions.filter(r => String(r.countryId) === form.countryId).map(r => ({ value: r.id, label: r.name }))} placeholder="Select region" disabled={!form.countryId} error={errors.regionId} />
            </>
          )}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">Active</label>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Delete ${activeTab === 'countries' ? 'Country' : activeTab === 'regions' ? 'Region' : 'City'}`}
        message={`Are you sure you want to delete "${(selectedItem as any)?.name}"?`}
        confirmLabel="Delete"
        isLoading={actionLoading}
      />
    </AppLayout>
  );
};
