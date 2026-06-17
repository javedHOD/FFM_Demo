import type { Order, OrderItem } from '../types';

export const getOrderLineItems = (order: Order): OrderItem[] => {
  if (order.items?.length) return order.items;
  return [{
    productName: order.productName,
    quantity: order.quantity,
    status: order.status === 'Partially Approved' ? 'Pending' : order.status as OrderItem['status'],
  }];
};

export const getOrderTotalQuantity = (order: Order): number =>
  getOrderLineItems(order).reduce((sum, item) => sum + item.quantity, 0);

export const getItemStatus = (item: OrderItem): OrderItem['status'] =>
  item.status || 'Pending';

export const hasPendingItems = (order: Order): boolean =>
  getOrderLineItems(order).some(item => getItemStatus(item) === 'Pending');

export const orderMatchesSearch = (order: Order, search: string): boolean => {
  const q = search.trim().toLowerCase();
  if (!q) return true;

  return (
    getOrderLineItems(order).some(item => item.productName.toLowerCase().includes(q)) ||
    order.shopName?.toLowerCase().includes(q) ||
    order.userName?.toLowerCase().includes(q) ||
    order.productName.toLowerCase().includes(q)
  );
};
