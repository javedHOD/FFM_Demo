import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Search, AlarmClock } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { hrApi } from '../../api/hrApi';
import type { Shift } from '../../types/hr';
import toast from 'react-hot-toast';

const emptyForm = (): Partial<Shift> => ({
  title: '',
  startTime: '09:00',
  lateStartTime: '09:30',
  earlyGoTime: '17:00',
  endTime: '18:00',
  isActive: true,
});

const TimeDisplay: React.FC<{ label: string; time: string; color: string }> = ({ label, time, color }) => (
  <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${color}`}>
    <span className="text-xs font-medium opacity-70">{label}</span>
    <span className="text-sm font-bold">{time}</span>
  </div>
);

export const ShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [form, setForm] = useState<Partial<Shift>>(emptyForm());
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 10;

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await hrApi.getShifts();
      setShifts(data);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setSelectedShift(null);
    setForm(emptyForm());
    setEditModal(true);
  };

  const openEdit = (shift: Shift) => {
    setSelectedShift(shift);
    setForm({ ...shift });
    setEditModal(true);
  };

  const openDelete = (shift: Shift) => {
    setSelectedShift(shift);
    setDeleteModal(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Shift title is required'); return; }
    if (!form.startTime)     { toast.error('Start time is required'); return; }
    if (!form.lateStartTime) { toast.error('Late start time is required'); return; }
    if (!form.earlyGoTime)   { toast.error('Early go time is required'); return; }
    if (!form.endTime)       { toast.error('End time is required'); return; }

    setActionLoading(true);
    try {
      if (selectedShift) {
        await hrApi.updateShift(selectedShift.id, form);
        toast.success('Shift updated successfully!');
      } else {
        await hrApi.createShift(form);
        toast.success('Shift created successfully!');
      }
      setEditModal(false);
      loadShifts();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save shift');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShift) return;
    setActionLoading(true);
    try {
      await hrApi.deleteShift(selectedShift.id);
      toast.success('Shift deleted successfully!');
      setDeleteModal(false);
      loadShifts();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete shift');
    } finally {
      setActionLoading(false);
    }
  };

  const setField = (key: keyof Shift, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const filtered = shifts.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const activeCount = shifts.filter(s => s.isActive).length;

  if (loading) {
    return (
      <AppLayout title="Shift Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading shifts..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Shift Management">
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard title="Total Shifts"  value={shifts.length}  icon={<AlarmClock className="w-5 h-5" />} color="blue" />
          <StatCard title="Active Shifts" value={activeCount}    icon={<Clock className="w-5 h-5" />}      color="green" />
          <StatCard title="Inactive"      value={shifts.length - activeCount} icon={<Clock className="w-5 h-5" />} color="orange" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Shifts</h2>
            <p className="text-sm text-slate-500">{filtered.length} shift{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Add Shift
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search shifts..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search className="w-4 h-4" />}
        />

        {/* Table */}
        <Card>
          <Table
            columns={[
              {
                header: 'Shift Title',
                accessor: (s: Shift) => (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlarmClock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold text-slate-800 text-sm">{s.title}</span>
                  </div>
                ),
              },
              {
                header: 'Timing Overview',
                accessor: (s: Shift) => (
                  <div className="flex gap-2 flex-wrap">
                    <TimeDisplay label="Start"      time={s.startTime}      color="bg-green-50 text-green-700" />
                    <TimeDisplay label="Late Start"  time={s.lateStartTime}  color="bg-yellow-50 text-yellow-700" />
                    <TimeDisplay label="Early Go"    time={s.earlyGoTime}    color="bg-orange-50 text-orange-700" />
                    <TimeDisplay label="End"         time={s.endTime}        color="bg-red-50 text-red-700" />
                  </div>
                ),
              },
              {
                header: 'Duration',
                accessor: (s: Shift) => {
                  const [sh, sm] = s.startTime.split(':').map(Number);
                  const [eh, em] = s.endTime.split(':').map(Number);
                  const mins = (eh * 60 + em) - (sh * 60 + sm);
                  const h = Math.floor(Math.abs(mins) / 60);
                  const m = Math.abs(mins) % 60;
                  return <span className="text-sm text-slate-600 font-medium">{h}h {m > 0 ? `${m}m` : ''}</span>;
                },
              },
              {
                header: 'Status',
                accessor: (s: Shift) => <StatusBadge status={s.isActive ? 'Active' : 'Inactive'} />,
              },
              {
                header: 'Actions',
                accessor: (s: Shift) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDelete(s)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={paginated}
            keyExtractor={s => s.id}
            emptyMessage="No shifts found. Click 'Add Shift' to create the first one."
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={selectedShift ? `Edit Shift — ${selectedShift.title}` : 'Add New Shift'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={actionLoading}>
              {selectedShift ? 'Update Shift' : 'Create Shift'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Shift Title *"
            value={form.title || ''}
            onChange={e => setField('title', e.target.value)}
            placeholder="e.g. Morning Shift, Night Shift"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time *"
              type="time"
              value={form.startTime || ''}
              onChange={e => setField('startTime', e.target.value)}
              hint="Official shift start"
            />
            <Input
              label="Late Start Time *"
              type="time"
              value={form.lateStartTime || ''}
              onChange={e => setField('lateStartTime', e.target.value)}
              hint="After this = late arrival"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Early Go Time *"
              type="time"
              value={form.earlyGoTime || ''}
              onChange={e => setField('earlyGoTime', e.target.value)}
              hint="Before this = early departure"
            />
            <Input
              label="End Time *"
              type="time"
              value={form.endTime || ''}
              onChange={e => setField('endTime', e.target.value)}
              hint="Official shift end"
            />
          </div>

          {/* Time summary preview */}
          {form.startTime && form.endTime && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-2">Timing Preview</p>
              <div className="flex gap-2 flex-wrap">
                <TimeDisplay label="Start"     time={form.startTime || '—'}      color="bg-green-100 text-green-700" />
                <TimeDisplay label="Late Start" time={form.lateStartTime || '—'} color="bg-yellow-100 text-yellow-700" />
                <TimeDisplay label="Early Go"  time={form.earlyGoTime || '—'}    color="bg-orange-100 text-orange-700" />
                <TimeDisplay label="End"       time={form.endTime || '—'}        color="bg-red-100 text-red-700" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!form.isActive}
                onChange={e => setField('isActive', e.target.checked)}
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-slate-700">Active Shift</span>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Shift"
        message={`Are you sure you want to delete "${selectedShift?.title}"? This will unassign it from all employees.`}
        confirmLabel="Delete"
        isLoading={actionLoading}
      />
    </AppLayout>
  );
};
