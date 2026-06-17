import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Eye, EyeOff, KeyRound, UserCheck } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { usersApi } from '../../api/usersApi';
import { hrApi } from '../../api/hrApi';
import { shopsApi } from '../../api/shopsApi';
import type { User, Region, City, Shop } from '../../types';
import type { Employee } from '../../types/hr';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: 1, label: 'Promoter' },
  { value: 2, label: 'City Manager' },
  { value: 3, label: 'Regional Manager' },
  { value: 4, label: 'National Sales Manager' },
  { value: 5, label: 'Admin' },
];

const roleNameMap: Record<number, string> = {
  1: 'Promoter', 2: 'City Manager', 3: 'Regional Manager',
  4: 'National Sales Manager', 5: 'Admin',
};

const roleBadge: Record<string, 'primary' | 'purple' | 'info' | 'success' | 'warning'> = {
  'Admin': 'purple', 'National Sales Manager': 'primary',
  'Regional Manager': 'info', 'City Manager': 'success', 'Promoter': 'warning',
};

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopAssignSearch, setShopAssignSearch] = useState('');
  const [hrEmployees, setHrEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Create / Edit modal
  const [editModal, setEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    roleId: 1, regionId: '', regionIds: [] as string[], cityId: '', assignedShopIds: [] as string[], isActive: true,
    hrEmployeeId: '' as number | '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false);

  // Set-password modal (for existing users)
  const [pwModal, setPwModal] = useState(false);
  const [pwTarget, setPwTarget] = useState<User | null>(null);
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, r, c, emp, sh] = await Promise.all([
          usersApi.getAll(),
          usersApi.getRegions(),
          usersApi.getCities(),
          hrApi.getEmployees(),
          shopsApi.getAll(),
        ]);
        setUsers(u);
        setRegions(r);
        setCities(c);
        setHrEmployees(emp);
        setShops(sh);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load users');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const openEdit = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setForm({
        fullName: user.fullName, email: user.email, phone: user.phone,
        roleId: user.roleId, regionId: String(user.regionId || ''),
        regionIds: (user.multiRegionIds?.length ? user.multiRegionIds : (user.regionId ? [user.regionId] : [])).map(String),
        cityId: String(user.cityId || ''),
        assignedShopIds: (user.assignedShopIds?.length ? user.assignedShopIds : shops.filter(s => s.assignedUserId === user.id).map(s => s.id)).map(String),
        isActive: user.isActive,
        hrEmployeeId: '',
      });
    } else {
      setSelectedUser(null);
      setForm({ fullName: '', email: '', phone: '', roleId: 1, regionId: '', regionIds: [], cityId: '', assignedShopIds: [], isActive: true, hrEmployeeId: '' });
    }
    setPassword('');
    setConfirmPassword('');
    setShowPass(false);
    setShowConfirm(false);
    setErrors({});
    setShopAssignSearch('');
    setEditModal(true);
  };

  const openSetPassword = (user: User) => {
    setPwTarget(user);
    setNewPw('');
    setConfirmNewPw('');
    setShowNewPw(false);
    setShowConfirmNewPw(false);
    setPwModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!selectedUser) {
      // Creating new user — password required
      if (!password) errs.password = 'Password is required';
      else if (password.length < 6) errs.password = 'Minimum 6 characters';
      if (!confirmPassword) errs.confirmPassword = 'Please confirm password';
      else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setActionLoading(true);
    try {
      const selectedRegionIds = form.regionId ? [Number(form.regionId)] : [];
      const region = regions.find(r => r.id === Number(form.regionId || selectedRegionIds[0]));
      const city = cities.find(c => c.id === Number(form.cityId));
      const data: any = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        isActive: form.isActive,
        roleId: Number(form.roleId),
        roleName: roleNameMap[Number(form.roleId)],
        regionId: (form.regionId || selectedRegionIds[0]) ? Number(form.regionId || selectedRegionIds[0]) : undefined,
        regionIds: selectedRegionIds,
        regionName: region?.name,
        cityId: form.cityId ? Number(form.cityId) : undefined,
        cityName: city?.name,
        assignedShopIds: form.roleId === 1 ? form.assignedShopIds.map(Number).filter(Boolean) : [],
      };
      if (!selectedUser) {
        data.password = password;
        if (form.hrEmployeeId) data.employeeId = form.hrEmployeeId;
      }
      if (selectedUser) {
        const updated = await usersApi.update(selectedUser.id, data);
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        if (updated.roleName === 'Promoter') {
          const assignedIds = new Set(updated.assignedShopIds || []);
          setShops(prev => prev.map(s => ({
            ...s,
            assignedUserId: assignedIds.has(s.id) ? updated.id : (s.assignedUserId === updated.id ? undefined : s.assignedUserId),
            assignedUserName: assignedIds.has(s.id) ? updated.fullName : (s.assignedUserId === updated.id ? undefined : s.assignedUserName),
          })));
        }
        toast.success('User updated successfully!');
      } else {
        const created = await usersApi.create(data);
        setUsers(prev => [created, ...prev]);
        if (created.roleName === 'Promoter') {
          const assignedIds = new Set(created.assignedShopIds || []);
          setShops(prev => prev.map(s => assignedIds.has(s.id) ? { ...s, assignedUserId: created.id, assignedUserName: created.fullName } : s));
        }
        toast.success('User created successfully!');
      }
      setEditModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await usersApi.delete(selectedUser.id);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setDeleteModal(false);
      toast.success('User deleted successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!pwTarget) return;
    if (!newPw || newPw.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmNewPw) {
      toast.error('Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await usersApi.update(pwTarget.id, { password: newPw } as any);
      toast.success(`Password updated for ${pwTarget.fullName}`);
      setPwModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.roleName === roleFilter;
    return matchSearch && matchRole;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const filteredCities = form.regionId ? cities.filter(c => c.regionId === Number(form.regionId)) : cities;

  if (loading) {
    return (
      <AppLayout title="User Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading users..." />
        </div>
      </AppLayout>
    );
  }

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className="text-slate-400 hover:text-slate-600 transition-colors">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <AppLayout title="User Management">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">User Management</h2>
            <p className="text-sm text-slate-500">{users.length} total users · {users.filter(u => u.isActive).length} active</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openEdit()}>
            Add User
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Roles</option>
            {roleOptions.map(r => <option key={r.value} value={r.label}>{r.label}</option>)}
          </select>
        </div>

        <Card>
          <Table
            columns={[
              {
                header: 'User',
                accessor: (u) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{u.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{u.fullName}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                ),
              },
              { header: 'Role', accessor: (u) => <Badge variant={roleBadge[u.roleName] || 'default'}>{u.roleName}</Badge> },
              {
                header: 'Region / City',
                accessor: (u) => (
                  <div>
                    <p className="text-sm text-slate-700">{u.multiRegionNames?.length ? u.multiRegionNames.join(', ') : (u.regionName || '—')}</p>
                    <p className="text-xs text-slate-400">{u.cityName || '—'}</p>
                  </div>
                ),
              },
              {
                header: 'Assigned Shops',
                accessor: (u) => {
                  const assignedNames = u.assignedShopNames?.length ? u.assignedShopNames : shops.filter(s => s.assignedUserId === u.id).map(s => s.shopName);
                  return (
                    <div className="max-w-[180px]">
                      <p className="text-sm text-slate-700">{assignedNames.length ? `${assignedNames.length} shop(s)` : '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{assignedNames.join(', ')}</p>
                    </div>
                  );
                },
              },
              { header: 'Phone', accessor: 'phone' },
              { header: 'Status', accessor: (u) => <StatusBadge status={u.isActive ? 'Active' : 'Inactive'} /> },
              {
                header: 'Actions',
                accessor: (u) => (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openSetPassword(u)}
                      className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                      title="Set password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelectedUser(u); setDeleteModal(true); }}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={paginated}
            keyExtractor={u => u.id}
          />
          <Pagination
            page={page}
            totalPages={Math.ceil(filtered.length / limit)}
            onPageChange={setPage}
            total={filtered.length}
            limit={limit}
          />
        </Card>
      </div>

      {/* ── Create / Edit User Modal ── */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={selectedUser ? `Edit — ${selectedUser.fullName}` : 'Add New User'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={actionLoading}>
              {selectedUser ? 'Update User' : 'Create User'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* HR Employee Link — only shown when creating a new user */}
          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                Link HR Employee
                <span className="ml-1 text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <select
                value={form.hrEmployeeId}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : '';
                  if (id) {
                    const emp = hrEmployees.find(em => em.id === id);
                    if (emp) {
                      setForm(f => ({
                        ...f,
                        hrEmployeeId: id,
                        fullName: emp.fullName,
                        email: emp.email || '',
                        phone: emp.phone || '',
                      }));
                      return;
                    }
                  }
                  setForm(f => ({ ...f, hrEmployeeId: '' }));
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select HR Employee —</option>
                {hrEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
              {form.hrEmployeeId && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Fields auto-filled from HR record. You can still edit them below.
                </p>
              )}
            </div>
          )}

          <Input
            label="Full Name"
            required
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            placeholder="Enter full name"
            error={errors.fullName}
          />
          <Input
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="user@example.com"
            error={errors.email}
          />
          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+92XXXXXXXXXX"
            error={errors.phone}
          />
          <Select
            label="Role"
            required
            value={form.roleId}
            onChange={e => setForm(f => ({ ...f, roleId: Number(e.target.value), assignedShopIds: Number(e.target.value) === 1 ? f.assignedShopIds : [] }))}
            options={roleOptions}
          />
          <Select
            label="Region"
            value={form.regionId}
            onChange={e => setForm(f => ({ ...f, regionId: e.target.value, regionIds: e.target.value ? [e.target.value] : [], cityId: '', assignedShopIds: [] }))}
            options={regions.map(r => ({ value: r.id, label: r.name }))}
            placeholder="Select region"
          />
          <Select
            label="City"
            value={form.cityId}
            onChange={e => setForm(f => ({ ...f, cityId: e.target.value, assignedShopIds: [] }))}
            options={filteredCities.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Select city"
          />
          {form.roleId === 1 && (
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Multiple Shops to Promoter</label>
              <Input
                placeholder={form.cityId ? "Search shops for assignment..." : "Select city first to filter shops..."}
                value={shopAssignSearch}
                onChange={e => setShopAssignSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                disabled={!form.cityId}
              />
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                {shops
                  .filter(shop => !form.cityId || String(shop.cityId) === String(form.cityId))
                  .filter(shop => {
                    const q = shopAssignSearch.toLowerCase();
                    return !q || shop.shopName.toLowerCase().includes(q) || shop.address.toLowerCase().includes(q) || shop.cityName?.toLowerCase().includes(q);
                  })
                  .map(shop => (
                    <label key={shop.id} className="flex items-start gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={form.assignedShopIds.includes(String(shop.id))}
                        onChange={e => setForm(f => {
                          const id = String(shop.id);
                          const next = e.target.checked ? [...new Set([...f.assignedShopIds, id])] : f.assignedShopIds.filter(x => x !== id);
                          return { ...f, assignedShopIds: next };
                        })}
                        className="w-4 h-4 accent-blue-600 mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{shop.shopName}</span>
                        <span className="block text-xs text-slate-400">{shop.address} · Current: {shop.assignedUserName || 'Unassigned'}</span>
                      </span>
                    </label>
                  ))}
                {form.cityId && shops.filter(shop => String(shop.cityId) === String(form.cityId)).length === 0 && (
                  <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-3">No shops available in selected city.</p>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">Selected: {form.assignedShopIds.length} shop(s)</p>
            </div>
          )}

          {/* Password section — only shown when CREATING */}
          {!selectedUser && (
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Set Password</p>
              <div className="relative">
                <Input
                  label="Password"
                  required
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  error={errors.password}
                  rightIcon={<EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />}
                />
              </div>
              <div className="relative">
                <Input
                  label="Confirm Password"
                  required
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  error={errors.confirmPassword}
                  rightIcon={<EyeToggle show={showConfirm} onToggle={() => setShowConfirm(p => !p)} />}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">Active Account</label>
          </div>
        </div>
      </Modal>

      {/* ── Set Password Modal (for existing users) ── */}
      <Modal
        isOpen={pwModal}
        onClose={() => setPwModal(false)}
        title="Set New Password"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPwModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSetPassword} isLoading={pwLoading} leftIcon={<KeyRound className="w-4 h-4" />}>
              Update Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {pwTarget && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {pwTarget.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{pwTarget.fullName}</p>
                <p className="text-xs text-slate-500">{pwTarget.email}</p>
              </div>
            </div>
          )}

          <Input
            label="New Password"
            required
            type={showNewPw ? 'text' : 'password'}
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Min. 6 characters"
            rightIcon={
              <button type="button" onClick={() => setShowNewPw(p => !p)} className="text-slate-400 hover:text-slate-600">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <Input
            label="Confirm New Password"
            required
            type={showConfirmNewPw ? 'text' : 'password'}
            value={confirmNewPw}
            onChange={e => setConfirmNewPw(e.target.value)}
            placeholder="Re-enter new password"
            rightIcon={
              <button type="button" onClick={() => setShowConfirmNewPw(p => !p)} className="text-slate-400 hover:text-slate-600">
                {showConfirmNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <p className="text-xs text-slate-400">
            The user will be required to use this new password on their next login.
          </p>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={actionLoading}
      />
    </AppLayout>
  );
};
