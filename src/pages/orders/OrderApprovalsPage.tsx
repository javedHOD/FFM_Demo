import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, ShoppingCart } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { OrderItemRow } from '../../components/orders/OrderItemRow';
import { useAuthStore } from '../../store/authStore';
import { ordersApi } from '../../api/ordersApi';
import type { Order, OrderItem } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getOrderLineItems, getItemStatus, hasPendingItems, orderMatchesSearch } from '../../utils/orderUtils';

export const OrderApprovalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionModal, setActionModal] = useState<{
    order: Order;
    item: OrderItem;
    action: 'approve' | 'reject';
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
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
      toast.success(`✅ ${actionModal.item.productName} ${actionModal.action === 'approve' ? 'approved' : 'rejected'}!`);
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const pending = orders.filter(hasPendingItems).length;
  const approved = orders.filter(o => o.status === 'Approved').length;
  const rejected = orders.filter(o => o.status === 'Rejected').length;

  const filtered = orders.filter(o => {
    const matchSearch = orderMatchesSearch(o, search);
    const matchStatus = !statusFilter || o.status === statusFilter
      || (statusFilter === 'Pending' && hasPendingItems(o));
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <AppLayout title="Order Approvals">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading orders..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Order Approvals">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Order Approvals</h2>
          <p className="text-sm text-slate-500">Approve or reject each product line individually</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Pending Items" value={pending} icon={<Clock className="w-5 h-5" />} color="orange" onClick={() => setStatusFilter('Pending')} />
          <StatCard title="Fully Approved" value={approved} icon={<CheckCircle className="w-5 h-5" />} color="green" onClick={() => setStatusFilter('Approved')} />
          <StatCard title="Fully Rejected" value={rejected} icon={<XCircle className="w-5 h-5" />} color="red" onClick={() => setStatusFilter('Rejected')} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by product, shop, or user..."
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
            <option value="Partially Approved">Partially Approved</option>
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
                <p className="text-slate-500 font-medium">No orders to review</p>
                <p className="text-slate-400 text-sm mt-1">All orders have been processed</p>
              </div>
            </Card>
          ) : (
            filtered.map(order => (
              <Card key={order.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">Order #{order.id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{order.shopName} · By: {order.userName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {order.orderType === 'RetailerToMD' ? 'Retailer → MD' : 'MD → Distributor'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={order.status} />
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(order.createdAt), 'dd MMM')}</p>
                    </div>
                  </div>

                  {order.remarks && (
                    <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 italic">"{order.remarks}"</p>
                    </div>
                  )}

                  <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    {getOrderLineItems(order).map((item, idx) => (
                      <OrderItemRow
                        key={item.id ?? idx}
                        item={item}
                        showActions
                        className={idx > 0 ? 'pt-2 border-t border-slate-100' : ''}
                        onApprove={() => setActionModal({ order, item, action: 'approve' })}
                        onReject={() => setActionModal({ order, item, action: 'reject' })}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setRemarks(''); }}
        title={actionModal?.action === 'approve' ? 'Approve Item' : 'Reject Item'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setActionModal(null); setRemarks(''); }}>Cancel</Button>
            <Button
              variant={actionModal?.action === 'approve' ? 'success' : 'danger'}
              onClick={handleItemAction}
              isLoading={actionLoading}
            >
              {actionModal?.action === 'approve' ? 'Approve Item' : 'Reject Item'}
            </Button>
          </>
        }
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm font-medium text-slate-700">{actionModal.item.productName}</p>
              <p className="text-xs text-slate-500 mt-1">Qty: {actionModal.item.quantity}</p>
              <p className="text-xs text-slate-500 mt-2">{actionModal.order.shopName} · Order #{actionModal.order.id}</p>
              <p className="text-xs text-slate-500">Requested by: {actionModal.order.userName}</p>
            </div>
            <Textarea
              label={`${actionModal.action === 'approve' ? 'Approval' : 'Rejection'} Remarks`}
              placeholder={`Add ${actionModal.action === 'approve' ? 'approval' : 'rejection'} notes for this item...`}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Order #', value: `#${selectedOrder.id}` },
                { label: 'Status', value: <StatusBadge status={selectedOrder.status} /> },
                { label: 'Shop', value: selectedOrder.shopName },
                { label: 'Requested By', value: selectedOrder.userName },
                { label: 'Order Type', value: selectedOrder.orderType === 'RetailerToMD' ? 'Retailer → MD' : 'MD → Distributor' },
                { label: 'Date', value: format(new Date(selectedOrder.createdAt), 'dd MMM yyyy') },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-2">Items</p>
              <div className="space-y-2">
                {getOrderLineItems(selectedOrder).map((item, idx) => (
                  <div key={item.id ?? idx} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2 text-sm gap-3">
                    <div>
                      <span className="font-medium text-slate-800">{item.productName}</span>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <StatusBadge status={getItemStatus(item)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
