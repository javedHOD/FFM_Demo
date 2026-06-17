import React, { useState, useEffect } from 'react';
import { Search, LogIn, LogOut, Navigation, Camera, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { attendanceApi } from '../../api/attendanceApi';
import type { Attendance } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const AdminAttendancePage: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const load = async () => {
      try {
        const a = await attendanceApi.getAll();
        setAttendance(a);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load attendance records');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = attendance.filter(a => {
    const matchSearch = a.userName?.toLowerCase().includes(search.toLowerCase()) || String(a.userId).includes(search);
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const present = attendance.filter(a => a.status !== 'Absent').length;
  const checkedIn = attendance.filter(a => a.status === 'CheckedIn').length;
  const absent = attendance.filter(a => a.status === 'Absent').length;

  if (loading) {
    return (
      <AppLayout title="Attendance Monitoring">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading attendance..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Attendance Monitoring">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Attendance Monitoring</h2>
          <p className="text-sm text-slate-500">Daily check-in/out records</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Present Today" value={present} icon={<LogIn className="w-5 h-5" />} color="green" />
          <StatCard title="Currently In" value={checkedIn} icon={<Navigation className="w-5 h-5" />} color="blue" />
          <StatCard title="Absent" value={absent} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search by user..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All Status</option>
            <option value="CheckedIn">Checked In</option>
            <option value="CheckedOut">Checked Out</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <Card>
          <Table
            columns={[
              { header: 'Employee', accessor: (a) => (
                <div className="flex items-center gap-2.5">
                  {a.selfieUrl ? (
                    <img src={a.selfieUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-slate-400">?</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{a.userName || `User #${a.userId}`}</p>
                    <p className="text-xs text-slate-400">ID: {a.userId}</p>
                  </div>
                </div>
              )},
              { header: 'Date', accessor: (a) => <span className="text-sm text-slate-600">{format(new Date(a.createdAt), 'EEE, dd MMM yyyy')}</span> },
              { header: 'Check-In', accessor: (a) => (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <LogIn className="w-3.5 h-3.5" />
                  {format(new Date(a.checkInTime), 'HH:mm')}
                </span>
              )},
              { header: 'Check-Out', accessor: (a) => a.checkOutTime ? (
                <span className="flex items-center gap-1.5 text-sm text-blue-700">
                  <LogOut className="w-3.5 h-3.5" />
                  {format(new Date(a.checkOutTime), 'HH:mm')}
                </span>
              ) : <span className="text-sm text-amber-600 animate-pulse">Still In</span> },
              { header: 'GPS', accessor: (a) => a.checkInLatitude ? (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />Verified
                </span>
              ) : <span className="text-xs text-slate-400">No GPS</span> },
              { header: 'Selfie', accessor: (a) => a.selfieUrl ? (
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-500">Missing</span>
                </div>
              )},
              { header: 'Status', accessor: (a) => <StatusBadge status={a.status} /> },
            ]}
            data={paginated}
            keyExtractor={a => a.id}
          />
          <Pagination page={page} totalPages={Math.ceil(filtered.length / limit)} onPageChange={setPage} total={filtered.length} limit={limit} />
        </Card>
      </div>
    </AppLayout>
  );
};
