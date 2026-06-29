import React, { useEffect, useMemo, useState } from 'react';
import {
  Package, Plus, Search, Edit2, Ban, RotateCw, RefreshCw,
  CheckCircle2, AlertCircle, AlertTriangle, Database, Settings2, Tags,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

import { productsApi } from '../../api/productsApi';
import { categoriesApi } from '../../api/categoriesApi';
import type {
  Product, ProductSyncReport, ProductSyncBlockedReport, Category,
} from '../../types';

const EMPTY_FORM = {
  name: '', code: '', description: '',
  unitPrice: '', uom: '',
  categoryId: '',
  isActive: true,
};

export const ProductsPage: React.FC = () => {
  // ── state ────────────────────────────────────────────────
  const [products,     setProducts]     = useState<Product[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'discontinued'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'MANUAL' | 'MIS'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page,         setPage]         = useState(1);
  const limit = 10;

  // create / edit
  const [editModal,    setEditModal]    = useState(false);
  const [selected,     setSelected]     = useState<Product | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [actionLoading,setActionLoading]= useState(false);

  // discontinue confirm
  const [discontinueModal, setDiscontinueModal] = useState(false);

  // sync
  const [syncing,        setSyncing]        = useState(false);
  const [okReport,       setOkReport]       = useState<ProductSyncReport | null>(null);
  const [okReportOpen,   setOkReportOpen]   = useState(false);
  const [blockedReport,  setBlockedReport]  = useState<ProductSyncBlockedReport | null>(null);
  const [blockedOpen,    setBlockedOpen]    = useState(false);

  // ── load ─────────────────────────────────────────────────
  const reload = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([productsApi.getAll(), categoriesApi.getAll()]);
      setProducts(prods);
      setCategories(cats);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load products');
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

  const openEdit = (p: Product) => {
    setSelected(p);
    setForm({
      name:        p.name,
      code:        p.code || '',
      description: p.description || '',
      unitPrice:   p.unitPrice != null ? String(p.unitPrice) : '',
      uom:         p.uom || '',
      categoryId:  String(p.categoryId),
      isActive:    p.isActive,
    });
    setErrors({});
    setEditModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.categoryId)  errs.categoryId = 'Category is required';
    if (form.unitPrice !== '' && isNaN(Number(form.unitPrice))) errs.unitPrice = 'Must be a number';
    // Duplicate name within same category, ignoring self
    if (form.name.trim() && form.categoryId) {
      const dup = products.some(p =>
        p.categoryId === Number(form.categoryId) &&
        p.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        p.id !== selected?.id
      );
      if (dup) errs.name = 'A product with this name already exists in the selected category';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setActionLoading(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        description: form.description,
        unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice),
        uom: form.uom,
        categoryId: Number(form.categoryId),
        isActive: form.isActive,
      };
      if (selected) {
        const updated = await productsApi.update(selected.id, payload as any);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        toast.success('Product updated');
      } else {
        const created = await productsApi.create(payload as any);
        setProducts(prev => [created, ...prev]);
        toast.success('Product created');
      }
      setEditModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscontinue = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await productsApi.discontinue(selected.id);
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success('Product discontinued');
      setDiscontinueModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to discontinue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (p: Product) => {
    try {
      const updated = await productsApi.reactivate(p.id);
      setProducts(prev => prev.map(x => x.id === updated.id ? updated : x));
      toast.success('Product reactivated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reactivate');
    }
  };

  // ── MIS sync ─────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    const tId = toast.loading('Syncing products from MIS…');
    try {
      const result = await productsApi.syncFromMIS();
      toast.dismiss(tId);

      if (result.blocked) {
        // ❌ Pre-check failed → categories must be synced first
        toast.error(result.message || 'Kindly sync category first');
        setBlockedReport(result.report);
        setBlockedOpen(true);
      } else {
        toast.success(result.message || 'Sync complete');
        setOkReport(result.report);
        setOkReportOpen(true);
        await reload();   // refresh table to show inserted/updated rows
      }
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ── filter + paginate ────────────────────────────────────
  const filtered = useMemo(() => products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || (p.code || '').toLowerCase().includes(q)
      || (p.misId || '').toLowerCase().includes(q)
      || (p.categoryName || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? p.isActive && !p.isDiscontinued :
      p.isDiscontinued;
    const matchSource = sourceFilter === 'all' ? true : p.source === sourceFilter;
    const matchCat    = !categoryFilter || String(p.categoryId) === categoryFilter;
    return matchSearch && matchStatus && matchSource && matchCat;
  }), [products, search, statusFilter, sourceFilter, categoryFilter]);

  const paginated  = filtered.slice((page - 1) * limit, page * limit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));

  // ── render ───────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Product Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading products..." />
        </div>
      </AppLayout>
    );
  }

  const counts = {
    total:         products.length,
    active:        products.filter(p => p.isActive && !p.isDiscontinued).length,
    discontinued:  products.filter(p => p.isDiscontinued).length,
    fromMIS:       products.filter(p => p.source === 'MIS').length,
  };

  const activeCategoryOptions = categories
    .filter(c => !c.isDiscontinued)
    .map(c => ({ value: c.id, label: c.name }));

  return (
    <AppLayout title="Product Management">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Product Management
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
              Add Product
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Search by name, code, MIS id or category…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.isDiscontinued ? ' (discontinued)' : ''}</option>
            ))}
          </select>
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
                header: 'Product',
                accessor: (p: Product) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.code ? `Code: ${p.code}` : 'No code'}</p>
                    </div>
                  </div>
                ),
              },
              {
                header: 'Category',
                accessor: (p: Product) => (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    <Tags className="w-3 h-3" /> {p.categoryName || '—'}
                  </span>
                ),
              },
              {
                header: 'MIS Sync ID',
                accessor: (p: Product) => p.misId
                  ? <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{p.misId}</span>
                  : <span className="text-xs text-slate-400">—</span>,
              },
              {
                header: 'Price',
                accessor: (p: Product) => p.unitPrice != null
                  ? <span className="text-sm text-slate-700">{p.unitPrice.toFixed(2)} <span className="text-xs text-slate-400">{p.uom || ''}</span></span>
                  : <span className="text-xs text-slate-400">—</span>,
              },
              {
                header: 'Source',
                accessor: (p: Product) => p.source === 'MIS'
                  ? <Badge variant="info"><Database className="w-3 h-3 inline mr-1" />MIS</Badge>
                  : <Badge variant="default"><Settings2 className="w-3 h-3 inline mr-1" />Manual</Badge>,
              },
              {
                header: 'Status',
                accessor: (p: Product) => p.isDiscontinued
                  ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      <Ban className="w-3 h-3" /> Discontinued
                    </span>
                  : <StatusBadge status={p.isActive ? 'Active' : 'Inactive'} />,
              },
              {
                header: 'Actions',
                accessor: (p: Product) => (
                  <div className="flex items-center gap-1">
                    <button
                      title="Edit"
                      onClick={() => openEdit(p)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {p.isDiscontinued ? (
                      <button
                        title="Reactivate"
                        onClick={() => handleReactivate(p)}
                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        title="Discontinue"
                        onClick={() => { setSelected(p); setDiscontinueModal(true); }}
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
            keyExtractor={(p: Product) => p.id}
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
        title={selected ? 'Edit Product' : 'Add New Product'}
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
            label="Product Name"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="e.g. iPhone 15 Pro"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="Optional"
            />
            <Select
              label="Category"
              required
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              options={activeCategoryOptions}
              placeholder="Select category"
              error={errors.categoryId}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Price"
              type="number"
              step="any"
              value={form.unitPrice}
              onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
              placeholder="0.00"
              error={errors.unitPrice}
            />
            <Input
              label="UOM"
              value={form.uom}
              onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
              placeholder="pcs / kg / box"
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Optional"
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="prodActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="prodActive" className="text-sm text-slate-700 font-medium">
              Active
            </label>
          </div>
          {selected?.source === 'MIS' && (
            <div className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
              <Database className="w-3.5 h-3.5 mt-0.5" />
              This product was synced from MIS — its Sync Primary Key
              (<code className="font-mono">{selected.misId}</code>) cannot be changed here.
              Next MIS sync will update this record in place.
            </div>
          )}
        </div>
      </Modal>

      {/* ── Discontinue Confirm ───────────────────────────── */}
      <ConfirmModal
        isOpen={discontinueModal}
        onClose={() => setDiscontinueModal(false)}
        onConfirm={handleDiscontinue}
        title="Discontinue Product"
        message={`Are you sure you want to discontinue “${selected?.name}”? It will be hidden from active lists but kept for historical records. You can reactivate it later.`}
        confirmLabel="Discontinue"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* ── BLOCKED: categories not synced yet ───────────── */}
      <Modal
        isOpen={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        title="Sync blocked — categories missing"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setBlockedOpen(false)}>Close</Button>
            <Button
              variant="primary"
              onClick={() => { setBlockedOpen(false); window.location.href = '/admin/categories'; }}
            >
              Go to Categories
            </Button>
          </>
        }
      >
        {blockedReport ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Kindly sync category first.</p>
                <p className="mt-1">
                  Out of <b>{blockedReport.totalReceived}</b> incoming products, they reference{' '}
                  <b>{blockedReport.missingCategoryCount}</b> MIS category id(s) that are not yet
                  present in our <code className="font-mono">categories.mis_id</code> column.
                  No products were imported. Sync categories first, then try again.
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                New categories that must be synced first
              </h4>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">MIS Category ID</th>
                      <th className="px-3 py-2 text-left">Affected Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedReport.missingCategories.map((c, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-mono text-xs">{c.categoryMisId}</td>
                        <td className="px-3 py-1.5">{c.productCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No data.</p>
        )}
      </Modal>

      {/* ── SUCCESS: full sync report ────────────────────── */}
      <Modal
        isOpen={okReportOpen}
        onClose={() => setOkReportOpen(false)}
        title="MIS Sync Report"
        size="lg"
        footer={<Button variant="primary" onClick={() => setOkReportOpen(false)}>Close</Button>}
      >
        {okReport ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Received</p>
                <p className="text-2xl font-bold text-slate-800">{okReport.totalReceived}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-700">Inserted</p>
                <p className="text-2xl font-bold text-emerald-700">{okReport.inserted}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-xs text-blue-700">Updated</p>
                <p className="text-2xl font-bold text-blue-700">{okReport.updated}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-700">Skipped</p>
                <p className="text-2xl font-bold text-amber-700">{okReport.skipped}</p>
              </div>
            </div>

            {/* Inserted */}
            <ReportSection
              title="Newly Inserted Records"
              count={okReport.insertedRecords.length}
              tone="emerald"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              rows={okReport.insertedRecords.map(r => ({
                left: r.misId, mid: r.name, right: r.categoryMisId,
              }))}
              headers={['MIS Sync ID', 'Name', 'Category MIS ID']}
              emptyText="No new records were inserted."
            />

            {/* Updated */}
            <ReportSection
              title="Updated Records (already in Sync PK column)"
              count={okReport.updatedRecords.length}
              tone="blue"
              icon={<Database className="w-4 h-4 text-blue-600" />}
              rows={okReport.updatedRecords.map(r => ({
                left: r.misId, mid: r.name, right: r.categoryMisId,
              }))}
              headers={['MIS Sync ID', 'Name', 'Category MIS ID']}
              emptyText="No existing records were updated."
            />

            {/* Skipped */}
            <ReportSection
              title="Skipped Records"
              count={okReport.skippedRecords.length}
              tone="amber"
              icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
              rows={okReport.skippedRecords.map(r => ({
                left: r.misId || '—', mid: r.name || '—', right: r.reason,
              }))}
              headers={['MIS Sync ID', 'Name', 'Reason']}
              emptyText="No records were skipped."
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">No sync data available.</p>
        )}
      </Modal>
    </AppLayout>
  );
};

// Small reusable report section for the success modal
const ReportSection: React.FC<{
  title: string;
  count: number;
  tone: 'emerald' | 'blue' | 'amber';
  icon: React.ReactNode;
  headers: [string, string, string];
  rows: Array<{ left: React.ReactNode; mid: React.ReactNode; right: React.ReactNode }>;
  emptyText: string;
}> = ({ title, count, icon, headers, rows, emptyText }) => (
  <div>
    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
      {icon} {title} ({count})
    </h4>
    {rows.length === 0 ? (
      <p className="text-xs text-slate-400 italic">{emptyText}</p>
    ) : (
      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">{headers[0]}</th>
              <th className="px-3 py-2 text-left">{headers[1]}</th>
              <th className="px-3 py-2 text-left">{headers[2]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-1.5 font-mono text-xs">{r.left}</td>
                <td className="px-3 py-1.5">{r.mid}</td>
                <td className="px-3 py-1.5 text-xs text-slate-500">{r.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
