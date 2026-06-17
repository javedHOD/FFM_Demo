import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Store, Users as UsersIcon } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { usersApi } from '../../api/usersApi';
import { shopsApi } from '../../api/shopsApi';
import type { City, Region, Shop, User } from '../../types';

export const RegionCityReportPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s, r, c] = await Promise.all([usersApi.getAll(), shopsApi.getAll(), usersApi.getRegions(), usersApi.getCities()]);
        setUsers(u); setShops(s); setRegions(r); setCities(c);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const filteredCities = regionFilter ? cities.filter(c => String(c.regionId) === regionFilter) : cities;
  const q = search.toLowerCase();

  const filteredUsers = users.filter(u => {
    const matchRegion = !regionFilter || String(u.regionId) === regionFilter;
    const matchCity = !cityFilter || String(u.cityId) === cityFilter;
    const matchSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
    return matchRegion && matchCity && matchSearch;
  });

  const filteredShops = shops.filter(s => {
    const matchRegion = !regionFilter || String(s.regionId) === regionFilter;
    const matchCity = !cityFilter || String(s.cityId) === cityFilter;
    const matchSearch = !q || s.shopName.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.assignedUserName?.toLowerCase().includes(q);
    return matchRegion && matchCity && matchSearch;
  });

  const summary = useMemo(() => ({
    users: filteredUsers.length,
    shops: filteredShops.length,
    regions: new Set([...filteredUsers.map(u => u.regionId), ...filteredShops.map(s => s.regionId)].filter(Boolean)).size,
    cities: new Set([...filteredUsers.map(u => u.cityId), ...filteredShops.map(s => s.cityId)].filter(Boolean)).size,
  }), [filteredUsers, filteredShops]);

  if (loading) return <AppLayout title="Region / City Report"><div className="min-h-[400px] flex items-center justify-center"><LoadingSpinner size="lg" text="Loading report..." /></div></AppLayout>;

  return (
    <AppLayout title="Region / City Report">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Region, City Wise User & Shop Report</h2>
          <p className="text-sm text-slate-500">Users and shops with addresses grouped/filterable by region and city.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Users" value={summary.users} icon={<UsersIcon className="w-5 h-5" />} color="blue" />
          <StatCard title="Shops" value={summary.shops} icon={<Store className="w-5 h-5" />} color="green" />
          <StatCard title="Regions" value={summary.regions} icon={<MapPin className="w-5 h-5" />} color="purple" />
          <StatCard title="Cities" value={summary.cities} icon={<MapPin className="w-5 h-5" />} color="orange" />
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1"><Input placeholder="Search user, shop, address..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} /></div>
          <select value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setCityFilter(''); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"><option value="">All Regions</option>{regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"><option value="">All Cities</option>{filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Users</h3></div>
          <Table columns={[
            { header: 'User', accessor: (u) => <div><p className="font-medium text-slate-800 text-sm">{u.fullName}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
            { header: 'Role', accessor: 'roleName' },
            { header: 'Phone', accessor: (u) => u.phone || '—' },
            { header: 'Region', accessor: (u) => u.regionName || '—' },
            { header: 'City', accessor: (u) => u.cityName || '—' },
            { header: 'Assigned Shops', accessor: (u) => u.assignedShopNames?.join(', ') || shops.filter(s => s.assignedUserId === u.id).map(s => s.shopName).join(', ') || '—' },
          ]} data={filteredUsers} keyExtractor={u => u.id} />
        </Card>

        <Card>
          <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Shops with Address</h3></div>
          <Table columns={[
            { header: 'Shop', accessor: (s) => <div><p className="font-medium text-slate-800 text-sm">{s.shopName}</p><p className="text-xs text-slate-500">{s.shopType}</p></div> },
            { header: 'Address', accessor: (s) => <span className="text-sm text-slate-700">{s.address}</span> },
            { header: 'Region', accessor: (s) => s.regionName || '—' },
            { header: 'City', accessor: (s) => s.cityName || '—' },
            { header: 'Assigned Promoter', accessor: (s) => s.assignedUserName || '—' },
            { header: 'Contact', accessor: (s) => <div><p className="text-sm">{s.contactPerson || '—'}</p><p className="text-xs text-slate-400">{s.contactNo || ''}</p></div> },
          ]} data={filteredShops} keyExtractor={s => s.id} />
        </Card>
      </div>
    </AppLayout>
  );
};
