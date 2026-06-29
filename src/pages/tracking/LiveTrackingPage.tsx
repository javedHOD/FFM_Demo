import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Activity, Clock, AlertCircle, Filter, RefreshCw, Eye, EyeOff, Navigation, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { trackingApi } from '../../api/trackingApi';
import type { User, Attendance, Visit } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';

// Fix Leaflet default marker icons broken by Vite's asset bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored marker factory
const coloredMarker = (color: string) =>
  new L.DivIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });

const onlineMarker  = coloredMarker('#10b981');
const offlineMarker = coloredMarker('#94a3b8');
const visitMarker   = coloredMarker('#3b82f6');

// Auto-fit map bounds to visible markers
const FitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
    } else {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [positions.length]);
  return null;
};

interface FieldStaffTracking {
  user: User;
  attendance: Attendance | null;
  activeVisit: Visit | null;
  lastUpdate: string;
}

export const LiveTrackingPage: React.FC = () => {
  const [staffTracking, setStaffTracking] = useState<FieldStaffTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<FieldStaffTracking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapView, setMapView] = useState(false);

  const limit = 10;

  // Load tracking data
  const loadTrackingData = async () => {
    try {
      const { staffTracking } = await trackingApi.getLiveTrackingPage();
      setStaffTracking(staffTracking as FieldStaffTracking[]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tracking data');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadTrackingData();
      setLoading(false);
    };
    init();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshing(true);
      loadTrackingData().then(() => setRefreshing(false));
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrackingData();
    setRefreshing(false);
  };

  // Filter staff
  const filtered = staffTracking.filter(st => {
    const matchSearch = st.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchActive = !filterActive || st.attendance?.status === 'CheckedIn';
    return matchSearch && matchActive;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  // Calculate stats
  const onlineStaff = staffTracking.filter(st => st.attendance?.status === 'CheckedIn').length;
  const activeVisits = staffTracking.filter(st => st.activeVisit).length;
  const offlineStaff = staffTracking.filter(st => !st.attendance).length;

  if (loading) {
    return (
      <AppLayout title="Live Field Force Tracking">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading tracking data..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Live Field Force Tracking">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Live Field Force Tracking</h2>
            <span className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
              Real-time monitoring of field staff
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Updating...' : 'Refresh'}
            </Button>
            <Button
              variant={autoRefresh ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<Activity className="w-4 h-4" />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto On' : 'Auto Off'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="Total Field Staff"
            value={staffTracking.length}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Checked In"
            value={onlineStaff}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            onClick={() => setFilterActive(true)}
          />
          <StatCard
            title="Active Visits"
            value={activeVisits}
            icon={<MapPin className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="Offline/Late"
            value={offlineStaff}
            icon={<AlertCircle className="w-5 h-5" />}
            color="orange"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
            />
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setFilterActive(!filterActive); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterActive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Online Only
            </button>
            <button
              onClick={() => setMapView(!mapView)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mapView ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              {mapView ? 'List View' : 'Map View'}
            </button>
          </div>
        </div>

        {/* Tracking Table */}
        <Card>
          <Table
            columns={[
              {
                header: 'Staff Member',
                accessor: (st) => (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      st.attendance?.status === 'CheckedIn' ? 'bg-emerald-50' : 'bg-slate-50'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        st.attendance?.status === 'CheckedIn' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-slate-400'
                      }`}>
                        {st.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{st.user.fullName}</p>
                      <p className="text-xs text-slate-500">{st.user.roleName}</p>
                    </div>
                  </div>
                ),
              },
              {
                header: 'Location',
                accessor: (st) => {
                  if (st.attendance?.checkInLatitude) {
                    return (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600">
                          {st.attendance.checkInLatitude.toFixed(4)}, {st.attendance.checkInLongitude?.toFixed(4)}
                        </span>
                      </div>
                    );
                  }
                  return <span className="text-xs text-slate-400">No GPS data</span>;
                },
              },
              {
                header: 'Current Activity',
                accessor: (st) => {
                  if (st.activeVisit) {
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs text-blue-600 font-medium">{st.activeVisit.shopName}</span>
                      </div>
                    );
                  }
                  return <span className="text-xs text-slate-400">No active visit</span>;
                },
              },
              {
                header: 'Check-In Time',
                accessor: (st) => st.attendance ? (
                  <div>
                    <p className="text-xs font-medium text-slate-700">{format(new Date(st.attendance.checkInTime), 'HH:mm')}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{formatDistanceToNow(new Date(st.attendance.checkInTime), { addSuffix: true })}</p>
                  </div>
                ) : (
                  <span className="text-xs text-red-500">Not checked in</span>
                ),
              },
              {
                header: 'Status',
                accessor: (st) => {
                  if (!st.attendance) {
                    return <Badge variant="danger">Offline</Badge>;
                  }
                  if (st.attendance.status === 'CheckedIn') {
                    return <Badge variant="success">Online</Badge>;
                  }
                  return <StatusBadge status={st.attendance.status} />;
                },
              },
              {
                header: 'Action',
                accessor: (st) => (
                  <button
                    onClick={() => { setSelectedStaff(st); setShowDetails(true); }}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                ),
              },
            ]}
            data={paginated}
            keyExtractor={(st) => st.user.id}
          />
          <Pagination
            page={page}
            totalPages={Math.ceil(filtered.length / limit)}
            onPageChange={setPage}
            total={filtered.length}
            limit={limit}
          />
        </Card>

        {/* Live Map — Leaflet + OpenStreetMap (free, no API key) */}
        {mapView && (() => {
          const staffWithGps = staffTracking.filter(
            st => st.attendance?.checkInLatitude && st.attendance?.checkInLongitude,
          );
          const positions: [number, number][] = staffWithGps.map(
            st => [st.attendance!.checkInLatitude!, st.attendance!.checkInLongitude!],
          );
          const defaultCenter: [number, number] = positions.length > 0 ? positions[0] : [30.3753, 69.3451];

          return (
            <Card>
              <CardHeader
                title="Live Map View"
                subtitle={`${staffWithGps.length} staff with GPS data • OpenStreetMap`}
                icon={<MapPin className="w-4 h-4" />}
              />

              {/* Legend */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />Checked In</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Active Visit</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />Offline</span>
              </div>

              {staffWithGps.length === 0 ? (
                <div className="p-10 text-center">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No GPS data available yet</p>
                  <p className="text-slate-400 text-xs mt-1">Staff GPS coordinates appear here after check-in</p>
                </div>
              ) : (
                <div className="rounded-b-xl overflow-hidden" style={{ height: 480 }}>
                  <MapContainer
                    center={defaultCenter}
                    zoom={11}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitBounds positions={positions} />
                    {staffWithGps.map(st => {
                      const lat = st.attendance!.checkInLatitude!;
                      const lng = st.attendance!.checkInLongitude!;
                      const icon = st.activeVisit
                        ? visitMarker
                        : st.attendance?.status === 'CheckedIn'
                          ? onlineMarker
                          : offlineMarker;
                      return (
                        <Marker key={st.user.id} position={[lat, lng]} icon={icon}>
                          <Popup>
                            <div className="min-w-[160px]">
                              <p className="font-semibold text-slate-800 text-sm">{st.user.fullName}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{st.user.roleName}</p>
                              <div className="mt-2 space-y-1 text-xs text-slate-600">
                                <p>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</p>
                                {st.attendance?.checkInTime && (
                                  <p>🕐 In: {format(new Date(st.attendance.checkInTime), 'HH:mm')}</p>
                                )}
                                {st.activeVisit && (
                                  <p>🏪 {st.activeVisit.shopName}</p>
                                )}
                                <p className={`font-medium mt-1 ${
                                  st.activeVisit ? 'text-blue-600'
                                  : st.attendance?.status === 'CheckedIn' ? 'text-emerald-600'
                                  : 'text-slate-400'
                                }`}>
                                  {st.activeVisit ? 'Active Visit' : st.attendance?.status === 'CheckedIn' ? 'Checked In' : 'Offline'}
                                </p>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
              )}
            </Card>
          );
        })()}
      </div>

      {/* Staff Detail Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={selectedStaff?.user.fullName || 'Staff Details'}
        size="lg"
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {selectedStaff.user.email}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Phone</p>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedStaff.user.phone}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Role</p>
                <p className="text-sm font-medium text-slate-800">{selectedStaff.user.roleName}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Region / City</p>
                <p className="text-sm font-medium text-slate-800">{selectedStaff.user.regionName} / {selectedStaff.user.cityName}</p>
              </div>
            </div>

            {/* Attendance Status */}
            {selectedStaff.attendance ? (
              <div className={`rounded-xl p-4 border-2 ${selectedStaff.attendance.status === 'CheckedIn' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800">Today's Attendance</p>
                  <StatusBadge status={selectedStaff.attendance.status} />
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-600">Check-In</p>
                    <p className="font-medium text-slate-800 mt-1">{format(new Date(selectedStaff.attendance.checkInTime), 'HH:mm:ss')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Check-Out</p>
                    <p className="font-medium text-slate-800 mt-1">{selectedStaff.attendance.checkOutTime ? format(new Date(selectedStaff.attendance.checkOutTime), 'HH:mm:ss') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Selfie</p>
                    <div className="mt-1 flex items-center gap-1">
                      {selectedStaff.attendance.selfieUrl ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-emerald-700">Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-xs text-red-600">Missing</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* GPS Info */}
                {selectedStaff.attendance.checkInLatitude && (
                  <div className="mt-3 p-2 bg-white/50 rounded-lg flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      GPS: {selectedStaff.attendance.checkInLatitude.toFixed(6)}, {selectedStaff.attendance.checkInLongitude?.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700">Not checked in today</p>
                </div>
              </div>
            )}

            {/* Active Visit */}
            {selectedStaff.activeVisit ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800">Active Visit</p>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-600">Shop</p>
                    <p className="font-medium text-slate-800 mt-1">{selectedStaff.activeVisit.shopName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Started</p>
                    <p className="font-medium text-slate-800 mt-1">{formatDistanceToNow(new Date(selectedStaff.activeVisit.visitStartTime), { addSuffix: true })}</p>
                  </div>
                </div>
                {selectedStaff.activeVisit.latitude && (
                  <div className="mt-3 p-2 bg-white/50 rounded-lg flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      {selectedStaff.activeVisit.latitude.toFixed(6)}, {selectedStaff.activeVisit.longitude?.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-600">No active visit at the moment</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1">Contact Staff</Button>
              <Button variant="outline" className="flex-1">View History</Button>
              <Button variant="outline" className="flex-1">Send Alert</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
