import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Building2, Clock, Plus, Search, Edit2, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { hrApi } from '../../api/hrApi';
import type { Shift, Designation, Department, Employee, AttendanceRecord, ApprovalRequest } from '../../types/hr';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type HRTab = 'employees' | 'designations' | 'departments' | 'attendance' | 'approvals';

export const HRManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<HRTab>('employees');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const limit = 10;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emp, des, dept, shiftData, att, appr] = await Promise.all([
        hrApi.getEmployees(),
        hrApi.getDesignations(),
        hrApi.getDepartments(),
        hrApi.getShifts(),
        hrApi.getAttendanceRecords(),
        hrApi.getApprovalRequests(),
      ]);
      setEmployees(emp);
      setDesignations(des);
      setDepartments(dept);
      setShifts(shiftData);
      setAttendanceRecords(att);
      setApprovalRequests(appr);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load HR data');
    } finally { setLoading(false); }
  };

  const openEdit = async (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setForm({ ...item });
    } else {
      setSelectedItem(null);
      // Auto-generate employee code for new employees
      if (activeTab === 'employees') {
        try {
          const code = await hrApi.getNextEmployeeCode();
          setForm({ isActive: true, joinDate: new Date().toISOString().split('T')[0], employeeCode: code });
        } catch {
          setForm({ isActive: true, joinDate: new Date().toISOString().split('T')[0] });
        }
      } else {
        setForm({ isActive: true });
      }
    }
    setErrors({});
    setEditModal(true);
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      if (activeTab === 'designations') {
        if (selectedItem) {
          await hrApi.updateDesignation(selectedItem.id, form);
          toast.success('Designation updated!');
        } else {
          await hrApi.createDesignation(form);
          toast.success('Designation created!');
        }
      } else if (activeTab === 'departments') {
        if (selectedItem) {
          await hrApi.updateDepartment(selectedItem.id, form);
          toast.success('Department updated!');
        } else {
          await hrApi.createDepartment(form);
          toast.success('Department created!');
        }
      } else if (activeTab === 'employees') {
        if (selectedItem) {
          await hrApi.updateEmployee(selectedItem.id, form);
          toast.success('Employee updated!');
        } else {
          await hrApi.createEmployee(form);
          toast.success('Employee created!');
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
      if (activeTab === 'designations') {
        await hrApi.deleteDesignation(selectedItem.id);
      } else if (activeTab === 'departments') {
        await hrApi.deleteDepartment(selectedItem.id);
      } else if (activeTab === 'employees') {
        await hrApi.deleteEmployee(selectedItem.id);
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

  const handleApprove = async (request: ApprovalRequest) => {
    setActionLoading(true);
    try {
      const approverId = user?.id ?? 1;
      const approverName = user?.name ?? 'Admin';
      await hrApi.approveRequest(request.id, approverId, approverName, 'Approved by admin');
      toast.success('Request approved!');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (request: ApprovalRequest) => {
    setActionLoading(true);
    try {
      const approverId = user?.id ?? 1;
      const approverName = user?.name ?? 'Admin';
      await hrApi.rejectRequest(request.id, approverId, approverName, 'Rejected by admin');
      toast.success('Request rejected!');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const generateNewCode = async () => {
    setCodeGenerating(true);
    try {
      const code = await hrApi.getNextEmployeeCode();
      setForm((f: any) => ({ ...f, employeeCode: code }));
    } catch {
      toast.error('Could not generate code');
    } finally {
      setCodeGenerating(false);
    }
  };

  const getFilteredData = () => {
    if (activeTab === 'employees') {
      return employees.filter(e => e.fullName.toLowerCase().includes(search.toLowerCase()) || e.employeeCode.toLowerCase().includes(search.toLowerCase()));
    } else if (activeTab === 'designations') {
      return designations.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    } else if (activeTab === 'departments') {
      return departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    } else if (activeTab === 'attendance') {
      return attendanceRecords.filter(r => r.employeeName?.toLowerCase().includes(search.toLowerCase()));
    } else {
      return approvalRequests.filter(r => r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.title.toLowerCase().includes(search.toLowerCase()));
    }
  };

  const filtered = getFilteredData();
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const tabs = [
    { id: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" />, count: employees.length },
    { id: 'designations', label: 'Designations', icon: <Briefcase className="w-4 h-4" />, count: designations.length },
    { id: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" />, count: departments.length },
    { id: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" />, count: attendanceRecords.length },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle className="w-4 h-4" />, count: approvalRequests.filter(r => r.status === 'Pending').length },
  ];

  if (loading) {
    return (
      <AppLayout title="HR Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading HR data..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="HR Management">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Employees" value={employees.length} icon={<Users className="w-5 h-5" />} color="blue" />
          <StatCard title="Departments" value={departments.length} icon={<Building2 className="w-5 h-5" />} color="purple" />
          <StatCard title="Present Today" value={attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'Present').length} icon={<CheckCircle className="w-5 h-5" />} color="green" />
          <StatCard title="Pending Approvals" value={approvalRequests.filter(r => r.status === 'Pending').length} icon={<Clock className="w-5 h-5" />} color="orange" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as HRTab); setPage(1); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
            <p className="text-sm text-slate-500">{filtered.length} records</p>
          </div>
          {activeTab !== 'attendance' && activeTab !== 'approvals' && (
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openEdit()}>
              Add {activeTab === 'employees' ? 'Employee' : activeTab === 'designations' ? 'Designation' : 'Department'}
            </Button>
          )}
        </div>

        {/* Search */}
        <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />

        {/* Table */}
        <Card>
          {activeTab === 'employees' && (
            <Table
              columns={[
                { header: 'Employee', accessor: (e: Employee) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-bold">{e.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{e.fullName}</p>
                      <p className="text-xs text-slate-500">{e.employeeCode}</p>
                    </div>
                  </div>
                )},
                { header: 'Designation', accessor: (e: Employee) => <span className="text-sm text-slate-600">{e.designationName || '—'}</span> },
                { header: 'Department', accessor: (e: Employee) => <span className="text-sm text-slate-600">{e.departmentName || '—'}</span> },
                { header: 'Shift', accessor: (e: Employee) => <span className="text-sm text-slate-600">{e.shiftTitle || <span className="text-slate-400">—</span>}</span> },
                { header: 'Join Date', accessor: (e: Employee) => <span className="text-sm text-slate-600">{format(new Date(e.joinDate), 'dd MMM yyyy')}</span> },
                { header: 'Status', accessor: (e: Employee) => <StatusBadge status={e.isActive ? 'Active' : 'Inactive'} /> },
                { header: 'Actions', accessor: (e: Employee) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(e)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(e); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={paginated as Employee[]}
              keyExtractor={e => e.id}
            />
          )}
          {activeTab === 'designations' && (
            <Table
              columns={[
                { header: 'Designation', accessor: (d: Designation) => (
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.code || '—'}</p>
                  </div>
                )},
                { header: 'Department', accessor: (d: Designation) => <span className="text-sm text-slate-600">{d.departmentName || '—'}</span> },
                { header: 'Level', accessor: (d: Designation) => <Badge variant="primary">Level {d.level}</Badge> },
                { header: 'Status', accessor: (d: Designation) => <StatusBadge status={d.isActive ? 'Active' : 'Inactive'} /> },
                { header: 'Actions', accessor: (d: Designation) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(d); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={paginated as Designation[]}
              keyExtractor={d => d.id}
            />
          )}
          {activeTab === 'departments' && (
            <Table
              columns={[
                { header: 'Department', accessor: (d: Department) => (
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.code || '—'}</p>
                  </div>
                )},
                { header: 'Head', accessor: (d: Department) => <span className="text-sm text-slate-600">{d.headUserName || '—'}</span> },
                { header: 'Status', accessor: (d: Department) => <StatusBadge status={d.isActive ? 'Active' : 'Inactive'} /> },
                { header: 'Actions', accessor: (d: Department) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(d); setDeleteModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={paginated as Department[]}
              keyExtractor={d => d.id}
            />
          )}
          {activeTab === 'attendance' && (
            <Table
              columns={[
                { header: 'Employee', accessor: (r: AttendanceRecord) => (
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.employeeName}</p>
                    <p className="text-xs text-slate-500">{r.employeeCode}</p>
                  </div>
                )},
                { header: 'Date', accessor: (r: AttendanceRecord) => <span className="text-sm text-slate-600">{format(new Date(r.date), 'dd MMM yyyy')}</span> },
                { header: 'Check-In', accessor: (r: AttendanceRecord) => <span className="text-sm text-slate-600">{r.checkInTime ? format(new Date(r.checkInTime), 'HH:mm') : '—'}</span> },
                { header: 'Check-Out', accessor: (r: AttendanceRecord) => <span className="text-sm text-slate-600">{r.checkOutTime ? format(new Date(r.checkOutTime), 'HH:mm') : '—'}</span> },
                { header: 'Hours', accessor: (r: AttendanceRecord) => <span className="text-sm text-slate-600">{r.workingHours ? `${r.workingHours}h` : '—'}</span> },
                { header: 'Status', accessor: (r: AttendanceRecord) => <StatusBadge status={r.status} /> },
              ]}
              data={paginated as AttendanceRecord[]}
              keyExtractor={r => r.id}
            />
          )}
          {activeTab === 'approvals' && (
            <Table
              columns={[
                { header: 'Request', accessor: (r: ApprovalRequest) => (
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.requestId}</p>
                  </div>
                )},
                { header: 'Employee', accessor: (r: ApprovalRequest) => (
                  <div>
                    <p className="text-sm text-slate-700">{r.employeeName}</p>
                    <p className="text-xs text-slate-500">{r.employeeCode}</p>
                  </div>
                )},
                { header: 'Type', accessor: (r: ApprovalRequest) => <Badge variant="info">{r.requestType}</Badge> },
                { header: 'Status', accessor: (r: ApprovalRequest) => <StatusBadge status={r.status} /> },
                { header: 'Actions', accessor: (r: ApprovalRequest) => r.status === 'Pending' ? (
                  <div className="flex gap-1">
                    <Button variant="success" size="sm" onClick={() => handleApprove(r)}>Approve</Button>
                    <Button variant="danger" size="sm" onClick={() => handleReject(r)}>Reject</Button>
                  </div>
                ) : <span className="text-xs text-slate-400">{r.approvedByName || '—'}</span> },
              ]}
              data={paginated as ApprovalRequest[]}
              keyExtractor={r => r.id}
            />
          )}
          <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={selectedItem ? 'Edit' : 'Add'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={actionLoading}>{selectedItem ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {activeTab === 'employees' && (
            <>
              <Input
                label="Full Name *"
                value={form.fullName || ''}
                onChange={e => setForm((f: any) => ({ ...f, fullName: e.target.value }))}
                placeholder="Employee full name"
              />
              <Input
                label="Email *"
                type="email"
                value={form.email || ''}
                onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
                placeholder="employee@company.com"
              />
              <Input
                label="Phone"
                value={form.phone || ''}
                onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))}
                placeholder="+92300000000"
              />

              {/* Employee Code — read-only with Generate button */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employee Code
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={form.employeeCode || ''}
                    placeholder="Auto-generated"
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 font-mono cursor-not-allowed select-all"
                  />
                  <button
                    type="button"
                    onClick={generateNewCode}
                    disabled={codeGenerating}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${codeGenerating ? 'animate-spin' : ''}`} />
                    Generate
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Read-only. Click Generate to assign a new code.</p>
              </div>

              <Input
                label="Join Date *"
                type="date"
                value={form.joinDate || ''}
                onChange={e => setForm((f: any) => ({ ...f, joinDate: e.target.value }))}
              />

              {/* Shift assignment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Shift</label>
                <select
                  value={form.shiftId || ''}
                  onChange={e => setForm((f: any) => ({ ...f, shiftId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Shift Assigned --</option>
                  {shifts.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {activeTab === 'designations' && (
            <>
              <Input label="Designation Name" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              <Input label="Code" value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} />
              <Input label="Level" type="number" value={form.level} onChange={e => setForm((f: any) => ({ ...f, level: Number(e.target.value) }))} />
            </>
          )}
          {activeTab === 'departments' && (
            <>
              <Input label="Department Name" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              <Input label="Code" value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} />
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        isLoading={actionLoading}
      />
    </AppLayout>
  );
};
