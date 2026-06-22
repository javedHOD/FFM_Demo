import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, TrendingUp, Package, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { salesApi } from '../../api/salesApi';
import { shopsApi } from '../../api/shopsApi';
import type { SalesEntry, Shop } from '../../types';
import { products } from '../../api/mockData';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type SaleItem = { productName: string; quantity: string; amount: string };
const emptyItem: SaleItem = { productName: '', quantity: '', amount: '' };

export const SalesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [sales, setSales] = useState<SalesEntry[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ shopId: '', remarks: '' });
  const [items, setItems] = useState<SaleItem[]>([{ ...emptyItem }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [s, sh] = await Promise.all([
          salesApi.getMy(user.id),
          shopsApi.getAll(user.id),
        ]);
        setSales(s);
        setShops(sh);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load sales data');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const resetForm = () => {
    setForm({ shopId: '', remarks: '' });
    setItems([{ ...emptyItem }]);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.shopId) errs.shopId = 'Shop is required';
    if (items.length === 0) errs.items = 'At least one item is required';
    items.forEach((item, index) => {
      if (!item.productName.trim()) errs[`product-${index}`] = 'Product is required';
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) errs[`quantity-${index}`] = 'Valid quantity required';
      if (!item.amount || isNaN(Number(item.amount)) || Number(item.amount) <= 0) errs[`amount-${index}`] = 'Valid price required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setFormLoading(true);
    try {
      const shop = shops.find(s => s.id === Number(form.shopId));
      const created = await Promise.all(items.map(item => salesApi.create({
        userId: user.id,
        userName: user.fullName,
        shopId: Number(form.shopId),
        shopName: shop?.shopName,
        productName: item.productName,
        quantity: Number(item.quantity),
        amount: Number(item.quantity) * Number(item.amount),
        remarks: form.remarks,
      })));
      setSales(prev => [...created.reverse(), ...prev]);
      setAddModal(false);
      resetForm();
      toast.success(`✅ ${created.length} sales item(s) submitted!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    } finally {
      setFormLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<SaleItem>) => setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));

  // ── Validation before adding a new row ────────────────────────────────
  const addItem = () => {
    const lastItem = items[items.length - 1];
    if (!lastItem.productName.trim() || !lastItem.quantity.trim() || !lastItem.amount.trim()) {
      toast.error('Please complete Item, Quantity, and Price before adding a new item.');
      return;
    }
    setItems(prev => [...prev, { ...emptyItem }]);
    setErrors({});
  };

  const removeItem = (index: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0);
  const filtered = sales.filter(s =>
    s.productName.toLowerCase().includes(search.toLowerCase()) ||
    s.shopName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout title="Sales Entry">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading sales..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Sales Entry">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sales Entry</h2>
            <p className="text-sm text-slate-500">{sales.length} items recorded</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>
            Add Sale
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Sales Amount" value={`SAR ${totalSales.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="cyan" />
          <StatCard title="Total Items" value={sales.length} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
          <StatCard title="Total Quantity" value={totalQty} icon={<Package className="w-5 h-5" />} color="green" />
        </div>

        <Input placeholder="Search by product or shop..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card><div className="p-12 text-center"><DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">No sales entries found</p><p className="text-slate-400 text-sm mt-1">Start adding sales to track performance</p><Button variant="primary" size="sm" className="mt-4" onClick={() => setAddModal(true)}>Add First Sale</Button></div></Card>
          ) : filtered.map(sale => (
            <Card key={sale.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3"><div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-cyan-600" /></div><div><p className="font-semibold text-slate-800 text-sm">{sale.productName}</p><p className="text-xs text-slate-500 mt-0.5">{sale.shopName}</p></div></div>
                  <div className="text-right"><p className="font-bold text-cyan-700 text-sm">SAR {sale.amount.toLocaleString()}</p><p className="text-xs text-slate-500">Qty: {sale.quantity}</p></div>
                </div>
                {sale.remarks && <p className="text-xs text-slate-400 mt-2 italic">"{sale.remarks}"</p>}
                <p className="text-xs text-slate-400 mt-2">{format(new Date(sale.createdAt), 'dd MMM yyyy · hh:mm a')}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        isOpen={addModal}
        onClose={() => { setAddModal(false); resetForm(); }}
        title="New Sales Entry"
        size="lg"
        footer={<><Button variant="outline" onClick={() => { setAddModal(false); resetForm(); }}>Cancel</Button><Button variant="primary" onClick={handleSubmit} isLoading={formLoading}>Submit Entry</Button></>}
      >
        <div className="space-y-4">
          <Select label="Shop" required value={form.shopId} onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))} options={shops.map(s => ({ value: s.id, label: s.shopName }))} placeholder="Select shop" error={errors.shopId} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Sales Items <span className="text-red-500">*</span></label>
              <Button variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addItem}>Add Item</Button>
            </div>
            {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}

            {items.map((item, index) => {
              const suggestions = item.productName ? products.filter(p => p.toLowerCase().includes(item.productName.toLowerCase())).slice(0, 6) : [];
              return (
                <div key={index} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  {/*
                    Mobile  (default)  → flex-col  → each field stacks vertically
                    Tablet+ (md and up) → flex-row  → fields sit side by side
                  */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-2">

                    {/* Row 1 (mobile) / Col 1 (desktop): Item */}
                    <div className="flex-1 relative">
                      <Input
                        label={index === 0 ? 'Item Search' : undefined}
                        required
                        placeholder="Type item name..."
                        value={item.productName}
                        onChange={e => updateItem(index, { productName: e.target.value })}
                        leftIcon={<Search className="w-4 h-4" />}
                        error={errors[`product-${index}`]}
                      />
                      {suggestions.length > 0 && !products.includes(item.productName) && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {suggestions.map(product => (
                            <button
                              key={product}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700"
                              onClick={() => updateItem(index, { productName: product })}
                            >
                              {product}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Row 2 (mobile) / Col 2 (desktop): Quantity */}
                    <div className="w-full md:w-28">
                      <Input
                        label={index === 0 ? 'Qty' : undefined}
                        required
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.quantity}
                        onChange={e => updateItem(index, { quantity: e.target.value })}
                        error={errors[`quantity-${index}`]}
                      />
                    </div>

                    {/* Row 3 (mobile) / Col 3 (desktop): Price */}
                    <div className="w-full md:w-32">
                      <Input
                        label={index === 0 ? 'Price' : undefined}
                        required
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.amount}
                        onChange={e => updateItem(index, { amount: e.target.value })}
                        error={errors[`amount-${index}`]}
                      />
                    </div>

                    {/* Remove button */}
                    <div className="flex md:pt-8">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="p-2 text-red-500 hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-transparent rounded-lg"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Textarea label="Remarks" placeholder="Any notes..." value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={3} />
        </div>
      </Modal>
    </AppLayout>
  );
};
