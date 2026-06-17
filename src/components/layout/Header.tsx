import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, title = 'FieldForce Enterprise' }) => {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3.5 flex items-center gap-4 sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1">
        <h1 className="text-base font-semibold text-slate-800 hidden lg:block">{title}</h1>
        <div className="relative lg:hidden">
          <p className="text-sm font-semibold text-slate-800">FieldForce</p>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-64">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full"
        />
      </div>

      {/* <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button> */}

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </span>
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-medium text-slate-700">{user?.fullName}</p>
          <p className="text-xs text-slate-500">{user?.cityName || user?.regionName}</p>
        </div>
      </div>
    </header>
  );
};
