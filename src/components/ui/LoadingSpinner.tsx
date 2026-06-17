import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, text }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin', sizes[size])} />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  );
};

export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="w-11 h-11 bg-slate-200 rounded-xl" />
      <div className="w-12 h-5 bg-slate-200 rounded-full" />
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-7 w-20 bg-slate-200 rounded" />
      <div className="h-4 w-32 bg-slate-100 rounded" />
    </div>
  </div>
);
