import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm', className }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-cyan-100 text-cyan-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={cn('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    Pending: { variant: 'warning', label: 'Pending' },
    Approved: { variant: 'success', label: 'Approved' },
    Rejected: { variant: 'danger', label: 'Rejected' },
    'Partially Approved': { variant: 'purple', label: 'Partially Approved' },
    Completed: { variant: 'info', label: 'Completed' },
    InProgress: { variant: 'primary', label: 'In Progress' },
    Cancelled: { variant: 'default', label: 'Cancelled' },
    CheckedIn: { variant: 'success', label: 'Checked In' },
    CheckedOut: { variant: 'info', label: 'Checked Out' },
    Absent: { variant: 'danger', label: 'Absent' },
    Late: { variant: 'warning', label: 'Late' },
    Present: { variant: 'success', label: 'Present' },
    Active: { variant: 'success', label: 'Active' },
    Inactive: { variant: 'default', label: 'Inactive' },
  };

  const config = statusMap[status] || { variant: 'default', label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
