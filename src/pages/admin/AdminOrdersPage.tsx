import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, CheckCircle, Package, User, Store, Calendar } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { OrderItemRow } from '../../components/orders/OrderItemRow';
import { useAuthStore } from '../../store/authStore';
import { ordersApi } from '../../api/ordersApi';
import type { Order, OrderItem } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getOrderLineItems, getOrderTotalQuantity, getItemStatus, hasPendingItems, orderMatchesSearch } from '../../utils/orderUtils';

export const AdminOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<{
    order: Order;
    item: OrderItem;
    action: 'approve' | 'reject';
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 8;

  useEffect(() => {
    const load = async () => {
      try {
        const o = await ordersApi.getAll();
        setOrders(o);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load orders');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const updateOrderInList = (updated: Order) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  };

  const handleItemAction = async () => {
    if (!actionModal || !user || !actionModal.item.id) return;
    setActionLoading(true);
    try {
      const status = actionModal.action === 'approve' ? 'Approved' : 'Rejected';
      const updated = await ordersApi.updateItemStatus(
        actionModal.order.id,
        actionModal.item.id,
        status,
        user.id,
        user.fullName,
        remarks
      );
      updateOrderInList(updated);
      setActionModal(null);
      setRemarks('');
      toast.success(`${actionModal.item.productName} ${actionModal.action === 'approve' ? 'approved' : 'rejected'}!`);
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch = orderMatchesSearch(o, search);
    const matchStatus = !statusFilter
      || o.status === statusFilter
      || (statusFilter === 'Pending' && hasPendingItems(o));
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const pending = orders.filter(hasPendingItems).length;
  const approved = orders.filter(o => o.status === 'Approved').length;
  const totalQty = orders.reduce((sum, o) => sum + getOrderTotalQuantity(o), 0);

  if (loading) {
    return (
      <AppLayout title="Orders Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading orders..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Orders Management">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Orders Management</h2>
          <p className="text-sm text-slate-500">{orders.length} total orders · approve or reject each item individually</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Orders with Pending Items" value={pending} icon={<ShoppingCart className="w-5 h-5" />} color="orange" onClick={() => setStatusFilter('Pending')} />
          <StatCard title="Fully Approved" value={approved} icon={<CheckCircle className="w-5 h-5" />} color="green" onClick={() => setStatusFilter('Approved')} />
          <StatCard title="Total Qty" value={totalQty} icon={<Package className="w-5 h-5" />} color="blue" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input placeholder="Search by product, shop, or staff..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white sm:min-w-[180px]">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partially Approved">Partially Approved</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <Card className="overflow-hidden">
          {paginated.length === 0 ? (
            <div className="p-14 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No orders found</p>
              <p className="text-sm text-slate-400 mt-1">Try changing your search or filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginated.map(order => {
                const items = getOrderLineItems(order);
                const pendingCount = items.filter(i => getItemStatus(i) === 'Pending').length;

                return (
                  <div key={order.id} className="p-4 sm:p-5 hover:bg-slate-50/40 transition-colors">
                    {/* Order header */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-xs font-bold">#{order.id}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-800 text-sm">{order.shopName || 'Unknown shop'}</h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {order.orderType === 'RetailerToMD' ? 'Retailer → MD' : 'MD → Distributor'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{order.userName}</span>
                            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(order.createdAt), 'dd MMM yyyy')}</span>
                            <span className="inline-flex items-center gap-1"><Package className="w-3 h-3" />{items.length} item{items.length !== 1 ? 's' : ''} · {getOrderTotalQuantity(order)} qty</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 lg:ml-auto">
                        {pendingCount > 0 && (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                            {pendingCount} pending
                          </span>
                        )}
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">Order Items</p>
                      {items.map((item, idx) => (
                        <OrderItemRow
                          key={item.id ?? idx}
                          item={item}
                          variant="card"
                          showActions
                          onApprove={() => setActionModal({ order, item, action: 'approve' })}
                          onReject={() => setActionModal({ order, item, action: 'reject' })}
                        />
                      ))}
                    </div>

                    {order.remarks && (
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                        <Store className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600"><span className="font-medium text-blue-700">Remarks:</span> {order.remarks}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
          )}
        </Card>
      </div>

      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setRemarks(''); }}
        title={actionModal?.action === 'approve' ? 'Approve Item' : 'Reject Item'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setActionModal(null); setRemarks(''); }}>Cancel</Button>
            <Button variant={actionModal?.action === 'approve' ? 'success' : 'danger'} onClick={handleItemAction} isLoading={actionLoading}>
              {actionModal?.action === 'approve' ? 'Approve Item' : 'Reject Item'}
            </Button>
          </>
        }
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm font-semibold text-slate-800">{actionModal.item.productName}</p>
              <p className="text-xs text-slate-500 mt-1">Quantity: {actionModal.item.quantity}</p>
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1">
                <p className="text-xs text-slate-500">Order #{actionModal.order.id} · {actionModal.order.shopName}</p>
                <p className="text-xs text-slate-500">Requested by {actionModal.order.userName}</p>
              </div>
            </div>
            <Textarea
              label="Remarks"
              placeholder={`Add ${actionModal.action === 'approve' ? 'approval' : 'rejection'} notes for this item...`}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
