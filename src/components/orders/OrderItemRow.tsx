import React from 'react';
import { CheckCircle, XCircle, Package } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import type { OrderItem } from '../../types';
import { getItemStatus } from '../../utils/orderUtils';

interface OrderItemRowProps {
  item: OrderItem;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
  variant?: 'inline' | 'card';
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  showActions = false,
  onApprove,
  onReject,
  className = '',
  variant = 'inline',
}) => {
  const status = getItemStatus(item);
  const isPending = status === 'Pending';

  if (variant === 'card') {
    return (
      <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border bg-white transition-colors ${
        isPending ? 'border-amber-100 hover:border-amber-200' : 'border-slate-100'
      } ${className}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isPending ? 'bg-amber-50' : status === 'Approved' ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            <Package className={`w-4 h-4 ${
              isPending ? 'text-amber-600' : status === 'Approved' ? 'text-emerald-600' : 'text-red-500'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 text-sm truncate">{item.productName}</p>
            <p className="text-xs text-slate-500 mt-0.5">Quantity: <span className="font-semibold text-slate-700">{item.quantity}</span></p>
            {!isPending && item.approvalRemarks && (
              <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-1">{item.approvalRemarks}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={status} />
          {showActions && isPending && onApprove && onReject && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-100">
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                title="Approve item"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Approve</span>
              </button>
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                title="Reject item"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reject</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 text-sm">{item.productName}</p>
        <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
        {!isPending && item.approvalRemarks && (
          <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-2">{item.approvalRemarks}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <StatusBadge status={status} />
        {showActions && isPending && onApprove && onReject && (
          <>
            <button
              type="button"
              onClick={onApprove}
              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
              title="Approve item"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onReject}
              className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
              title="Reject item"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
