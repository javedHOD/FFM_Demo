import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Edit2, Trash2, MapPin } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { shopsApi } from '../../api/shopsApi';
import type { Shop, Region, City, User } from '../../types';
import toast from 'react-hot-toast';

const shopTypes = ['Electronics', 'Mobile', 'Digital', 'Accessories', 'General Trade', 'Supermarket', 'Pharmacy'];

export const ShopsPage: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 8;
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({ shopName: '', shopType: '', address: '', cityId: '', regionId: '', latitude: '', longitude: '', assignedUserId: '', contactPerson: '', contactNo: '', contactNo2: '', ntnNo: '', isActive: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await shopsApi.getShopsPage();
        setShops(data.shops);
        setRegions(data.regions);
        setCities(data.cities);
        setUsers(data.users as User[]);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load shops');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const openEdit = (shop?: Shop) => {
    if (shop) {
      setSelectedShop(shop);
      setForm({
        shopName: shop.shopName, shopType: shop.shopType, address: shop.address,
        cityId: String(shop.cityId), regionId: String(shop.regionId),
        latitude: String(shop.latitude || ''), longitude: String(shop.longitude || ''),
        assignedUserId: String(shop.assignedUserId || ''), contactPerson: shop.contactPerson || '', contactNo: shop.contactNo || '', contactNo2: shop.contactNo2 || '', ntnNo: shop.ntnNo || '', isActive: shop.isActive,
      });
    } else {
      setSelectedShop(null);
      setForm({ shopName: '', shopType: '', address: '', cityId: '', regionId: '', latitude: '', longitude: '', assignedUserId: '', contactPerson: '', contactNo: '', contactNo2: '', ntnNo: '', isActive: true });
    }
    setErrors({});
    setEditModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.shopName.trim()) errs.shopName = 'Shop name is required';
    else if (shops.some(s => s.shopName.trim().toLowerCase() === form.shopName.trim().toLowerCase() && s.id !== selectedShop?.id)) errs.shopName = 'Shop name already exists';
    if (!form.shopType) errs.shopType = 'Shop type is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.regionId) errs.regionId = 'Region is required';
    if (!form.cityId) errs.cityId = 'City is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setActionLoading(true);
    try {
      const region = regions.find(r => r.id === Number(form.regionId));
      const city = cities.find(c => c.id === Number(form.cityId));
      const assignedUser = users.find(u => u.id === Number(form.assignedUserId));
      const data = {
        ...form,
        cityId: Number(form.cityId), cityName: city?.name,
        regionId: Number(form.regionId), regionName: region?.name,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        assignedUserId: form.assignedUserId ? Number(form.assignedUserId) : undefined,
        assignedUserName: assignedUser?.fullName,
      };
      if (selectedShop) {
        const updated = await shopsApi.update(selectedShop.id, data);
        setShops(prev => prev.map(s => s.id === updated.id ? updated : s));
        toast.success('Shop updated!');
      } else {
        const created = await shopsApi.create(data);
        setShops(prev => [created, ...prev]);
        toast.success('Shop created!');
      }
      setEditModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save shop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShop) return;
    setActionLoading(true);
    try {
      await shopsApi.delete(selectedShop.id);
      setShops(prev => prev.filter(s => s.id !== selectedShop.id));
      setDeleteModal(false);
      toast.success('Shop deleted!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete shop');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = shops.filter(s => {
    const matchSearch = s.shopName.toLowerCase().includes(search.toLowerCase()) || s.address.toLowerCase().includes(search.toLowerCase());
    const matchRegion = !regionFilter || String(s.regionId) === regionFilter;
    const matchCity = !cityFilter || String(s.cityId) === cityFilter;
    return matchSearch && matchRegion && matchCity;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const filteredCities = form.regionId ? cities.filter(c => c.regionId === Number(form.regionId)) : cities;
  const listCities = regionFilter ? cities.filter(c => c.regionId === Number(regionFilter)) : cities;

  if (loading) {
    return (
      <AppLayout title="Shop Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading shops..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Shop Management">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Shop Management</h2>
            <p className="text-sm text-slate-500">{shops.length} total shops · {shops.filter(s => s.isActive).length} active</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openEdit()}>
            Add Shop
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search shops..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <select value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setCityFilter(''); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All Regions</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All Cities</option>
            {listCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <Card>
          <Table
            columns={[
              { header: 'Shop', accessor: (s) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{s.shopName}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{s.address}</p>
                  </div>
                </div>
              )},
              { header: 'Type', accessor: (s) => <Badge variant="default">{s.shopType}</Badge> },
              { header: 'Contact', accessor: (s) => (
                <div>
                  <p className="text-sm text-slate-700">{s.contactPerson || '—'}</p>
                  <p className="text-xs text-slate-400">{s.contactNo || '—'}</p>
                </div>
              )},
              { header: 'Location', accessor: (s) => (
                <div>
                  <p className="text-sm text-slate-700">{s.cityName}</p>
                  <p className="text-xs text-slate-400">{s.regionName}</p>
                </div>
              )},
              { header: 'Assigned To', accessor: (s) => <span className="text-sm text-slate-600">{s.assignedUserName || '—'}</span> },
              { header: 'GPS', accessor: (s) => s.latitude ? (
                <span className="text-xs text-emerald-600 flex items-center gap-1"><MapPin className="w-3 h-3" />Set</span>
              ) : <span className="text-xs text-slate-400">Not set</span> },
              { header: 'Status', accessor: (s) => <StatusBadge status={s.isActive ? 'Active' : 'Inactive'} /> },
              { header: 'Actions', accessor: (s) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setSelectedShop(s); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )},
            ]}
            data={paginated}
            keyExtractor={s => s.id}
          />
          <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
        </Card>
      </div>

      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={selectedShop ? 'Edit Shop' : 'Add New Shop'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={actionLoading}>{selectedShop ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Shop Name" required value={form.shopName} onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))} error={errors.shopName} />
            <Select label="Shop Type" required value={form.shopType} onChange={e => setForm(f => ({ ...f, shopType: e.target.value }))} options={shopTypes.map(t => ({ value: t, label: t }))} placeholder="Select type" error={errors.shopType} />
          </div>
          <Input label="Address" required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} error={errors.address} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Person" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Owner/manager name" />
            <Input label="Contact No" value={form.contactNo} onChange={e => setForm(f => ({ ...f, contactNo: e.target.value }))} placeholder="Primary phone" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact No 2" value={form.contactNo2} onChange={e => setForm(f => ({ ...f, contactNo2: e.target.value }))} placeholder="Secondary phone" />
            <Input label="NTN No" value={form.ntnNo} onChange={e => setForm(f => ({ ...f, ntnNo: e.target.value }))} placeholder="NTN number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Region" required value={form.regionId} onChange={e => setForm(f => ({ ...f, regionId: e.target.value, cityId: '' }))} options={regions.map(r => ({ value: r.id, label: r.name }))} placeholder="Select region" error={errors.regionId} />
            <Select label="City" required value={form.cityId} onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))} options={filteredCities.map(c => ({ value: c.id, label: c.name }))} placeholder="Select city" error={errors.cityId} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="24.7136" />
            <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="46.6753" />
          </div>
          <Select label="Assigned Staff" value={form.assignedUserId} onChange={e => setForm(f => ({ ...f, assignedUserId: e.target.value }))} options={users.map(u => ({ value: u.id, label: `${u.fullName} (${u.roleName})` }))} placeholder="Select staff member" />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="shopActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="shopActive" className="text-sm text-slate-700 font-medium">Active Shop</label>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Shop"
        message={`Are you sure you want to delete "${selectedShop?.shopName}"?`}
        confirmLabel="Delete"
        isLoading={actionLoading}
      />
    </AppLayout>
  );
};
