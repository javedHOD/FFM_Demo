import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { performLogout } from '../../utils/logout';
import {
  LayoutDashboard, Users, Store, MapPin, Clock, ShoppingCart,
  BarChart3, FileText, Shield, LogOut, ChevronDown, ChevronRight,
  Menu, X, Briefcase, CheckSquare, Camera, Package, Navigation,
  Globe, Building2, Landmark, AlarmClock, Tags, QrCode
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" />, roles: ['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager'] },
  { label: 'Attendance', path: '/attendance', icon: <Clock className="w-4.5 h-4.5" />, roles: ['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager'] },
  { label: 'Shop Visits', path: '/visits', icon: <MapPin className="w-4.5 h-4.5" />, roles: ['Promoter', 'City Manager'] },
  { label: 'Sales Entry', path: '/sales', icon: <BarChart3 className="w-4.5 h-4.5" />, roles: ['Promoter', 'City Manager'] },
  { label: 'Orders', path: '/orders', icon: <ShoppingCart className="w-4.5 h-4.5" />, roles: ['Promoter', 'City Manager'] },
  { label: 'Order Approvals', path: '/order-approvals', icon: <CheckSquare className="w-4.5 h-4.5" />, roles: ['Regional Manager', 'National Sales Manager'] },
  { label: 'Reports', path: '/reports', icon: <FileText className="w-4.5 h-4.5" />, roles: ['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager'] },
  // Admin routes
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'User Management', path: '/admin/users', icon: <Users className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Shop Management', path: '/admin/shops', icon: <Store className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Categories', path: '/admin/categories', icon: <Tags className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Products', path: '/admin/products', icon: <Package className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Visit Monitoring', path: '/admin/visits', icon: <MapPin className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Attendance', path: '/admin/attendance', icon: <Clock className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Orders Management', path: '/admin/orders', icon: <Package className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Sales Reports', path: '/admin/sales', icon: <BarChart3 className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Region/City Report', path: '/admin/region-city-report', icon: <FileText className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Photo Compliance', path: '/admin/photos', icon: <Camera className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Live Tracking', path: '/tracking', icon: <Navigation className="w-4.5 h-4.5" />, roles: ['Admin', 'National Sales Manager'] },
  { label: 'IMEI Verification Log', path: '/admin/imei-logs', icon: <QrCode className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Locations', path: '/admin/locations', icon: <Globe className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'HR Management', path: '/admin/hr', icon: <Users className="w-4.5 h-4.5" />, roles: ['Admin'] },
  { label: 'Shift Management', path: '/admin/shifts', icon: <AlarmClock className="w-4.5 h-4.5" />, roles: ['Admin'] },
];

const roleColors: Record<string, string> = {
  'Admin': 'bg-purple-100 text-purple-700',
  'National Sales Manager': 'bg-blue-100 text-blue-700',
  'Regional Manager': 'bg-cyan-100 text-cyan-700',
  'City Manager': 'bg-emerald-100 text-emerald-700',
  'Promoter': 'bg-orange-100 text-orange-700',
};

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.roleName);
  });

  const handleLogout = async () => {
    await performLogout();
    navigate('/login', { replace: true });
  };

  const initials = user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'FF';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-50 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out',
        'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">FieldForce</p>
              <p className="text-slate-400 text-xs">Enterprise</p>
            </div>
            <button onClick={onClose} className="ml-auto lg:hidden p-1 hover:bg-slate-700 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', roleColors[user?.roleName || ''] || 'bg-slate-700 text-slate-300')}>
                {user?.roleName}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profile & Logout */}
        <div className="p-3 border-t border-slate-700/50 space-y-0.5">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
            )}
          >
            <Shield className="w-4 h-4" />
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};
