import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Shield, LogOut, Building, ChevronRight } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { performLogout } from '../../utils/logout';
import toast from 'react-hot-toast';

const roleColors: Record<string, 'primary' | 'purple' | 'info' | 'success' | 'warning'> = {
  'Admin': 'purple',
  'National Sales Manager': 'primary',
  'Regional Manager': 'info',
  'City Manager': 'success',
  'Promoter': 'warning',
};

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await performLogout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const initials = user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'FF';

  const profileItems = [
    { icon: <Mail className="w-4 h-4" />, label: 'Email', value: user?.email },
    { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: user?.phone },
    { icon: <Shield className="w-4 h-4" />, label: 'Role', value: user?.roleName },
    { icon: <MapPin className="w-4 h-4" />, label: 'Region', value: user?.regionName || 'Not assigned' },
    { icon: <Building className="w-4 h-4" />, label: 'City', value: user?.cityName || 'Not assigned' },
    { icon: <User className="w-4 h-4" />, label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive' },
  ];

  const quickActions = [
    { label: 'View My Visits', path: '/visits', icon: <MapPin className="w-4 h-4" />, roles: ['Promoter', 'City Manager'] },
    { label: 'Attendance History', path: '/attendance', icon: <Shield className="w-4 h-4" />, roles: ['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager'] },
    { label: 'My Orders', path: '/orders', icon: <Shield className="w-4 h-4" />, roles: ['Promoter', 'City Manager'] },
    { label: 'Reports', path: '/reports', icon: <Shield className="w-4 h-4" />, roles: ['Promoter', 'City Manager', 'Regional Manager', 'National Sales Manager'] },
    { label: 'Admin Panel', path: '/admin/dashboard', icon: <Shield className="w-4 h-4" />, roles: ['Admin'] },
  ].filter(a => !user || a.roles.includes(user.roleName));

  return (
    <AppLayout title="Profile">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Profile Header */}
        <Card>
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{user?.fullName}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant={roleColors[user?.roleName || ''] || 'default'} size="md">
                {user?.roleName}
              </Badge>
            </div>
            {user?.cityName && (
              <p className="text-sm text-slate-500 mt-2 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{user.cityName}, {user.regionName}
              </p>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className={`w-2 h-2 rounded-full ${user?.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-xs text-slate-500">{user?.isActive ? 'Account Active' : 'Account Inactive'}</span>
            </div>
          </div>
        </Card>

        {/* Profile Details */}
        <Card>
          <div className="divide-y divide-slate-50">
            {profileItems.map(item => (
              <div key={item.label} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <Card>
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {quickActions.map(action => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-3 p-4 w-full text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                    {action.icon}
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* App Info */}
        <Card>
          <div className="p-4">
            <div className="text-center space-y-1">
              <p className="text-xs text-slate-400">FieldForce Enterprise</p>
              <p className="text-xs text-slate-400">Version 2.0.0 · Build 2024.12</p>
              <p className="text-xs text-slate-300">© 2024 FieldForce Inc. All rights reserved.</p>
            </div>
          </div>
        </Card>

        {/* Logout */}
        <Button
          variant="danger"
          className="w-full"
          size="lg"
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={handleLogout}
        >
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
};
