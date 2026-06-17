const { query } = require('../db/connection');

const deriveOrderStatus = (items) => {
  if (!items.length) return 'Pending';

  const statuses = items.map(item => item.status || 'Pending');
  if (statuses.every(status => status === 'Pending')) return 'Pending';
  if (statuses.some(status => status === 'Pending')) return 'Partially Approved';
  if (statuses.every(status => status === 'Approved')) return 'Approved';
  if (statuses.every(status => status === 'Rejected')) return 'Rejected';
  return 'Partially Approved';
};

const getOrderItems = async (orderId) => {
  const { recordset } = await query(
    `SELECT oi.id, oi.order_id, oi.product_name, oi.quantity, oi.status,
            oi.approved_by, oi.approval_remarks, oi.updated_at,
            u.full_name as approved_by_name
     FROM order_items oi
     LEFT JOIN users u ON oi.approved_by = u.id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [orderId]
  );

  return recordset.map(row => ({
    id: row.id,
    orderId: row.order_id,
    productName: row.product_name,
    quantity: row.quantity,
    status: row.status || 'Pending',
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    approvalRemarks: row.approval_remarks,
    updatedAt: row.updated_at,
  }));
};

const formatOrderRow = (row, items = []) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  shopId: row.shop_id,
  shopName: row.shop_name,
  orderType: row.order_type,
  productName: row.product_name,
  quantity: row.quantity,
  items,
  remarks: row.remarks,
  status: deriveOrderStatus(items),
  approvedBy: row.approved_by,
  approvedByName: row.approved_by_name,
  approvalRemarks: row.approval_remarks,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const syncOrderStatus = async (orderId) => {
  const items = await getOrderItems(orderId);
  const status = deriveOrderStatus(items);
  await query('UPDATE orders SET [status]=?, updated_at=GETDATE() WHERE id=?', [status, orderId]);
  return status;
};

const formatOrdersWithItems = async (rows) => {
  const formatted = [];
  for (const row of rows) {
    const items = await getOrderItems(row.id);
    formatted.push(formatOrderRow(row, items));
  }
  return formatted;
};

module.exports = {
  deriveOrderStatus,
  getOrderItems,
  formatOrderRow,
  syncOrderStatus,
  formatOrdersWithItems,
};
