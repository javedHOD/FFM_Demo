import React, { useEffect, useMemo, useState } from 'react';
import {
  Tags, Plus, Search, Edit2, Ban, RotateCw, RefreshCw,
  CheckCircle2, AlertCircle, Database, Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

import { categoriesApi } from '../../api/categoriesApi';
import type { Category, CategorySyncReport } from '../../types';

const EMPTY_FORM = { name: '', code: '', description: '', isActive: true };

export const CategoriesPage: React.FC = () => {
  // ── state ────────────────────────────────────────────────
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'discontinued'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'MANUAL' | 'MIS'>('all');
  const [page,         setPage]         = useState(1);
  const limit = 10;

  // create / edit
  const [editModal,    setEditModal]    = useState(false);
  const [selected,     setSelected]     = useState<Category | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [actionLoading,setActionLoading]= useState(false);

  // discontinue confirm
  const [discontinueModal, setDiscontinueModal] = useState(false);

  // sync
  const [syncing,    setSyncing]    = useState(false);
  const [syncReport, setSyncReport] = useState<CategorySyncReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // ── load ─────────────────────────────────────────────────
  const reload = async () => {
    try {
      setLoading(true);
      const list = await categoriesApi.getAll();
      setCategories(list);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  // ── helpers ──────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setEditModal(true);
  };

  const openEdit = (c: Category) => {
    setSelected(c);
    setForm({
      name:        c.name,
      code:        c.code || '',
      description: c.description || '',
      isActive:    c.isActive,
    });
    setErrors({});
    setEditModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Category name is required';
    else if (categories.some(c =>
      c.name.trim().toLowerCase() === form.name.trim().toLowerCase() && c.id !== selected?.id
    )) errs.name = 'Category name already exists';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setActionLoading(true);
    try {
      if (selected) {
        const updated = await categoriesApi.update(selected.id, form);
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Category updated');
      } else {
        const created = await categoriesApi.create(form);
        setCategories(prev => [created, ...prev]);
        toast.success('Category created');
      }
      setEditModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscontinue = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await categoriesApi.discontinue(selected.id);
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success('Category discontinued');
      setDiscontinueModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to discontinue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (c: Category) => {
    try {
      const updated = await categoriesApi.reactivate(c.id);
      setCategories(prev => prev.map(x => x.id === updated.id ? updated : x));
      toast.success('Category reactivated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reactivate');
    }
  };

  // ── MIS sync ─────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    const tId = toast.loading('Syncing categories from MIS…');
    try {
      const { message, report } = await categoriesApi.syncFromMIS();
      toast.dismiss(tId);
      toast.success(message || 'Sync complete');
      setSyncReport(report);
      setReportOpen(true);
      await reload();   // refresh list to show newly inserted rows
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ── filter + paginate ────────────────────────────────────
  const filtered = useMemo(() => categories.filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.code || '').toLowerCase().includes(q)
      || (c.misId || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? c.isActive && !c.isDiscontinued :
      c.isDiscontinued;
    const matchSource = sourceFilter === 'all' ? true : c.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  }), [categories, search, statusFilter, sourceFilter]);

  const paginated  = filtered.slice((page - 1) * limit, page * limit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));

  // ── render ───────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Category Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading categories..." />
        </div>
      </AppLayout>
    );
  }

  const counts = {
    total:         categories.length,
    active:        categories.filter(c => c.isActive && !c.isDiscontinued).length,
    discontinued:  categories.filter(c => c.isDiscontinued).length,
    fromMIS:       categories.filter(c => c.source === 'MIS').length,
  };

  return (
    <AppLayout title="Category Management">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Tags className="w-5 h-5 text-blue-600" /> Category Management
            </h2>
            <p className="text-sm text-slate-500">
              {counts.total} total · {counts.active} active · {counts.discontinued} discontinued · {counts.fromMIS} from MIS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
              onClick={handleSync}
              isLoading={syncing}
            >
              Sync from MIS
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Category
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Search by name, code or MIS id…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All status</option>
            <option value="active">Active only</option>
            <option value="discontinued">Discontinued only</option>
          </select>
          <select
            value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value as any); setPage(1); }}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All sources</option>
            <option value="MANUAL">Created in App</option>
            <option value="MIS">Synced from MIS</option>
          </select>
        </div>

        {/* Table */}
        <Card>
          <Table
            columns={[
              {
                header: 'Category',
                accessor: (c: Category) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tags className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400">
                        {c.code ? `Code: ${c.code}` : 'No code'}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                header: 'MIS Sync ID',
                accessor: (c: Category) => c.misId
                  ? <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{c.misId}</span>
                  : <span className="text-xs text-slate-400">—</span>,
              },
              {
                header: 'Source',
                accessor: (c: Category) => c.source === 'MIS'
                  ? <Badge variant="info"><Database className="w-3 h-3 inline mr-1" />MIS</Badge>
                  : <Badge variant="default"><Settings2 className="w-3 h-3 inline mr-1" />Manual</Badge>,
              },
              {
                header: 'Description',
                accessor: (c: Category) => (
                  <span className="text-sm text-slate-600 line-clamp-2 max-w-[280px]">
                    {c.description || '—'}
                  </span>
                ),
              },
              {
                header: 'Status',
                accessor: (c: Category) => c.isDiscontinued
                  ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      <Ban className="w-3 h-3" /> Discontinued
                    </span>
                  : <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />,
              },
              {
                header: 'Actions',
                accessor: (c: Category) => (
                  <div className="flex items-center gap-1">
                    <button
                      title="Edit"
                      onClick={() => openEdit(c)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {c.isDiscontinued ? (
                      <button
                        title="Reactivate"
                        onClick={() => handleReactivate(c)}
                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        title="Discontinue"
                        onClick={() => { setSelected(c); setDiscontinueModal(true); }}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            data={paginated}
            keyExtractor={(c: Category) => c.id}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={filtered.length}
            limit={limit}
          />
        </Card>
      </div>

      {/* ── Create / Edit Modal ───────────────────────────── */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={selected ? 'Edit Category' : 'Add New Category'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={actionLoading}>
              {selected ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="e.g. Mobile Phones"
          />
          <Input
            label="Code"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            placeholder="Short internal code (optional)"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="What does this category contain?"
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="catActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="catActive" className="text-sm text-slate-700 font-medium">
              Active
            </label>
          </div>
          {selected?.source === 'MIS' && (
            <div className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
              <Database className="w-3.5 h-3.5 mt-0.5" />
              This category was synced from MIS — its Sync Primary Key
              (<code className="font-mono">{selected.misId}</code>) cannot be edited here.
            </div>
          )}
        </div>
      </Modal>

      {/* ── Discontinue Confirm ───────────────────────────── */}
      <ConfirmModal
        isOpen={discontinueModal}
        onClose={() => setDiscontinueModal(false)}
        onConfirm={handleDiscontinue}
        title="Discontinue Category"
        message={`Are you sure you want to discontinue “${selected?.name}”? It will be hidden from active lists but kept for historical records. You can reactivate it later.`}
        confirmLabel="Discontinue"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* ── MIS Sync Report Modal ─────────────────────────── */}
      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="MIS Sync Report"
        size="lg"
        footer={<Button variant="primary" onClick={() => setReportOpen(false)}>Close</Button>}
      >
        {syncReport ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Received from MIS</p>
                <p className="text-2xl font-bold text-slate-800">{syncReport.totalReceived}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-700">Saved</p>
                <p className="text-2xl font-bold text-emerald-700">{syncReport.saved}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-700">Skipped (already exists)</p>
                <p className="text-2xl font-bold text-amber-700">{syncReport.skipped}</p>
              </div>
            </div>

            {/* Saved */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Newly Saved Records ({syncReport.savedRecords.length})
              </h4>
              {syncReport.savedRecords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No new records were inserted.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">MIS Sync ID</th>
                        <th className="px-3 py-2 text-left">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncReport.savedRecords.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-mono text-xs">{r.misId}</td>
                          <td className="px-3 py-1.5">{r.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Skipped */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Skipped Records — Already in Sync PK column ({syncReport.skippedRecords.length})
              </h4>
              {syncReport.skippedRecords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No duplicates — every record was new.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">MIS Sync ID</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncReport.skippedRecords.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-mono text-xs">{r.misId || '—'}</td>
                          <td className="px-3 py-1.5">{r.name || '—'}</td>
                          <td className="px-3 py-1.5 text-xs text-slate-500">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No sync data available.</p>
        )}
      </Modal>
    </AppLayout>
  );
};
