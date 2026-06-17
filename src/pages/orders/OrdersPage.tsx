import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Package, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { ordersApi } from '../../api/ordersApi';
import { shopsApi } from '../../api/shopsApi';
import type { Order, OrderItem, Shop } from '../../types';
import { products } from '../../api/mockData';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getItemStatus } from '../../utils/orderUtils';

type DraftItem = { productName: string; quantity: string };

const emptyItem: DraftItem = { productName: '', quantity: '' };

export const OrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ shopId: '', orderType: 'RetailerToMD', remarks: '' });
  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [o, sh] = await Promise.all([
          ordersApi.getMy(user.id),
          shopsApi.getAll(user.id),
        ]);
        setOrders(o);
        setShops(sh);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load orders');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const resetForm = () => {
    setForm({ shopId: '', orderType: 'RetailerToMD', remarks: '' });
    setItems([{ ...emptyItem }]);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.shopId) errs.shopId = 'Shop is required';

    const validItems = items.filter(i => i.productName.trim() || i.quantity.trim());
    if (validItems.length === 0) errs.items = 'At least one item is required';

    items.forEach((item, index) => {
      if (!item.productName.trim()) errs[`product-${index}`] = 'Item is required';
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) errs[`quantity-${index}`] = 'Valid quantity required';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setFormLoading(true);
    try {
      const shop = shops.find(s => s.id === Number(form.shopId));
      const orderItems: OrderItem[] = items.map(item => ({
        productName: item.productName.trim(),
        quantity: Number(item.quantity),
      }));

      const newOrder = await ordersApi.create({
        userId: user.id,
        userName: user.fullName,
        shopId: Number(form.shopId),
        shopName: shop?.shopName,
        orderType: form.orderType as Order['orderType'],
        items: orderItems,
        remarks: form.remarks,
      });
      setOrders(prev => [newOrder, ...prev]);
      setAddModal(false);
      resetForm();
      toast.success('✅ Order submitted successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit order');
    } finally {
      setFormLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const addItemRow = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItemRow = (index: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const pending = orders.filter(o => o.status === 'Pending').length;
  const approved = orders.filter(o => o.status === 'Approved').length;
  const rejected = orders.filter(o => o.status === 'Rejected').length;

  const getOrderItemSummary = (order: Order) => {
    if (order.items?.length) {
      return order.items.map(item => `${item.productName} x ${item.quantity}`).join(', ');
    }
    return `${order.productName} x ${order.quantity}`;
  };

  const filtered = orders.filter(o => {
    const itemText = o.items?.map(i => i.productName).join(' ') || o.productName;
    const matchSearch = itemText.toLowerCase().includes(search.toLowerCase()) || o.shopName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'Approved': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'Rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'Completed': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default: return <Package className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <AppLayout title="Orders">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading orders..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Orders">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">My Orders</h2>
            <p className="text-sm text-slate-500">{orders.length} total orders</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>
            Place Order
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Pending" value={pending} icon={<Clock className="w-5 h-5" />} color="orange" />
          <StatCard title="Approved" value={approved} icon={<CheckCircle className="w-5 h-5" />} color="green" />
          <StatCard title="Rejected" value={rejected} icon={<XCircle className="w-5 h-5" />} color="red" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search orders/items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No orders found</p>
                <p className="text-slate-400 text-sm mt-1">Place your first order to get started</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={() => setAddModal(true)}>
                  Place Order
                </Button>
              </div>
            </Card>
          ) : (
            filtered.map(order => (
              <Card key={order.id} hover onClick={() => setSelectedOrder(order)}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                        {statusIcon(order.status)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{order.items?.length ? `${order.items.length} items` : order.productName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{order.shopName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Order #{order.id} · {getOrderItemSummary(order)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={order.status} />
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(order.createdAt), 'dd MMM')}</p>
                    </div>
                  </div>
                  {order.approvalRemarks && (
                    <div className="mt-2 pt-2 border-t border-slate-50">
                      <p className="text-xs text-slate-500">Approval Note: <span className="italic">{order.approvalRemarks}</span></p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => { setAddModal(false); resetForm(); }}
        title="Place New Order"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddModal(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={formLoading}>Submit Order</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Order Type"
            required
            value={form.orderType}
            onChange={e => setForm(f => ({ ...f, orderType: e.target.value }))}
            options={[
              { value: 'RetailerToMD', label: 'Retailer to MD' },
              { value: 'MDToDistributor', label: 'Distributor to MD' },
            ]}
          />
          <Select
            label="Shop"
            required
            value={form.shopId}
            onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))}
            options={shops.map(s => ({ value: s.id, label: s.shopName }))}
            placeholder="Select shop"
            error={errors.shopId}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Order Items <span className="text-red-500">*</span></label>
              <Button variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addItemRow}>Add Item</Button>
            </div>
            {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}

            {items.map((item, index) => {
              const suggestions = item.productName
                ? products.filter(p => p.toLowerCase().includes(item.productName.toLowerCase())).slice(0, 6)
                : [];

              return (
                <div key={index} className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-7 relative">
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
                    <div className="col-span-4">
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
                    <div className="col-span-1 pt-8">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
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

          <Textarea
            label="Remarks"
            placeholder="Any notes about this order..."
            value={form.remarks}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            rows={3}
          />
        </div>
      </Modal>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">Order #</p>
                <p className="font-semibold text-slate-800 mt-1">#{selectedOrder.id}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-slate-500">Items</p>
                <div className="mt-2 space-y-1">
                  {(selectedOrder.items?.length ? selectedOrder.items : [{ productName: selectedOrder.productName, quantity: selectedOrder.quantity, status: selectedOrder.status }]).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-white border border-slate-100 rounded-lg px-3 py-2 gap-3">
                      <div>
                        <span className="font-medium text-slate-800">{item.productName}</span>
                        <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <StatusBadge status={getItemStatus(item)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">Shop</p>
                <p className="font-medium text-slate-800 mt-1 text-sm">{selectedOrder.shopName}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">Order Type</p>
                <p className="font-medium text-slate-800 mt-1 text-sm">{selectedOrder.orderType === 'RetailerToMD' ? 'Retailer → MD' : 'MD → Distributor'}</p>
              </div>
            </div>
            {selectedOrder.remarks && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium">Remarks</p>
                <p className="text-sm text-slate-700 mt-1">{selectedOrder.remarks}</p>
              </div>
            )}
            {selectedOrder.approvalRemarks && (
              <div className={`rounded-xl p-3 border ${selectedOrder.status === 'Approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <p className={`text-xs font-medium ${selectedOrder.status === 'Approved' ? 'text-emerald-600' : 'text-red-600'}`}>Approval Note</p>
                <p className="text-sm text-slate-700 mt-1">{selectedOrder.approvalRemarks}</p>
                <p className="text-xs text-slate-500 mt-1">By: {selectedOrder.approvedByName}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
