import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapPin, Clock, Camera, CheckCircle, Search, Play, Navigation, Image, X, RefreshCw, FlipHorizontal, QrCode } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource, CameraPermissionState } from '@capacitor/camera';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { visitsApi } from '../../api/visitsApi';
import { shopsApi } from '../../api/shopsApi';
import { uploadsApi } from '../../api/uploadsApi';
import { imeiApi } from '../../api/imeiApi';
import type { Visit, Shop } from '../../types';
import type { IMEIVerificationResult } from '../../types/imei';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const IS_NATIVE = Capacitor.isNativePlatform();

type PhotoSlot = 'OutsideShop' | 'ShelfPhoto' | 'SelfieWithShopkeeper';

const PHOTO_SLOTS: { key: PhotoSlot; label: string }[] = [
  { key: 'OutsideShop', label: 'Outside Shop with Board' },
  { key: 'ShelfPhoto', label: 'Shelf / Stock Photo' },
  { key: 'SelfieWithShopkeeper', label: 'Selfie with Shopkeeper' },
];

// ─── Module-level cache (persists across navigations) ───────────────────────
let visitsCache: { data: Visit[]; ts: number; userId: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// ─── Skeleton card ───────────────────────────────────────────────────────────
const VisitSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 rounded w-2/3" />
        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="h-5 w-16 bg-slate-200 rounded-full" />
    </div>
    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-50">
      <div className="h-2.5 bg-slate-100 rounded w-14" />
      <div className="h-2.5 bg-slate-100 rounded w-20" />
    </div>
  </div>
);

export const VisitsPage: React.FC = () => {
  const { user } = useAuthStore();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [visits, setVisits] = useState<Visit[]>(() => {
    if (visitsCache && user && visitsCache.userId === user.id &&
        Date.now() - visitsCache.ts < CACHE_TTL_MS) {
      return visitsCache.data;
    }
    return [];
  });
  const [shops, setShops] = useState<Shop[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(visits.length === 0);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [startVisitModal, setStartVisitModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // ── Photo capture state ──────────────────────────────────────────────────
  const [capturedPhotos, setCapturedPhotos] = useState<Partial<Record<PhotoSlot, string>>>({});
  const [activeCameraSlot, setActiveCameraSlot] = useState<PhotoSlot | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [reviewPhoto, setReviewPhoto] = useState<{ slot: PhotoSlot; dataUrl: string } | null>(null);

  // ── IMEI Verification state ──────────────────────────────────────────────
  const [imeiModal, setImeiModal] = useState(false);
  const [imeiInput, setImeiInput] = useState('');
  const [imeiLoading, setImeiLoading] = useState(false);
  const [imeiResult, setImeiResult] = useState<IMEIVerificationResult | null>(null);
  const [imeiError, setImeiError] = useState('');
  const [scannedIMEIs, setScannedIMEIs] = useState<Set<string>>(new Set());
  const imeiInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearch(val), 250);
  };

  // ── GPS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── Load visits (with stale-while-revalidate) ────────────────────────────
  const loadVisits = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setVisitsLoading(true); else setRefreshing(true);
    try {
      const v = await visitsApi.getMy(user.id);
      setVisits(v);
      visitsCache = { data: v, ts: Date.now(), userId: user.id };
    } catch (e) {
      console.error(e);
      if (!silent) toast.error('Failed to load visits');
    } finally {
      setVisitsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const isCacheFresh = visitsCache && visitsCache.userId === user.id &&
      Date.now() - visitsCache.ts < CACHE_TTL_MS;

    if (isCacheFresh) {
      loadVisits(true);
    } else {
      loadVisits(false);
    }
  }, [user, loadVisits]);

  // ── Lazy load shops ──────────────────────────────────────────────────────
  const openStartVisitModal = useCallback(async () => {
    setStartVisitModal(true);
    if (shops.length > 0) return;
    setShopsLoading(true);
    try {
      const s = await shopsApi.getAll(user?.id);
      setShops(s);
    } catch {
      toast.error('Failed to load shops');
    } finally {
      setShopsLoading(false);
    }
  }, [shops.length, user?.id]);

  // ── Camera helpers ───────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActiveCameraSlot(null);
    setCameraError('');
    setCountdown(0);
  }, []);

  const openCamera = useCallback(async (slot: PhotoSlot) => {
    setCameraError('');

    if (IS_NATIVE) {
      try {
        const perms = await CapCamera.requestPermissions({ permissions: ['camera', 'photos'] });
        const cameraGranted: CameraPermissionState = perms.camera;
        if (cameraGranted === 'denied') {
          toast.error('Camera permission denied. Please enable it in Settings.');
          return;
        }

        const photo = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          saveToGallery: false,
          correctOrientation: true,
        });

        if (photo.dataUrl) {
          setReviewPhoto({ slot, dataUrl: photo.dataUrl });
        }
      } catch (err: any) {
        if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
        toast.error('Could not open camera: ' + (err?.message ?? 'Unknown error'));
      }
      return;
    }

    setActiveCameraSlot(slot);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setCameraError('Camera access denied.');
      else if (err.name === 'NotFoundError') setCameraError('No camera found.');
      else setCameraError('Could not start camera.');
    }
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !activeCameraSlot) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const slot = activeCameraSlot;
    stopCamera();
    setReviewPhoto({ slot, dataUrl });
  }, [activeCameraSlot, facingMode, stopCamera]);

  const captureWithCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); capturePhoto(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const confirmReviewPhoto = () => {
    if (!reviewPhoto) return;
    setCapturedPhotos(prev => ({ ...prev, [reviewPhoto.slot]: reviewPhoto.dataUrl }));
    setReviewPhoto(null);
  };

  const retakeReviewPhoto = () => {
    if (!reviewPhoto) return;
    const slot = reviewPhoto.slot;
    setReviewPhoto(null);
    openCamera(slot);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleStartVisit = async () => {
    if (!user || !selectedShop) return;
    setActionLoading(true);
    try {
      const visit = await visitsApi.startVisit({
        userId: user.id,
        shopId: selectedShop.id,
        shopName: selectedShop.shopName,
        latitude: location?.lat,
        longitude: location?.lng,
      });
      setVisits(prev => [visit, ...prev]);
      visitsCache = null;
      setStartVisitModal(false);
      setSelectedShop(null);
      toast.success(`✅ Visit started at ${selectedShop.shopName}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to start visit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!activeVisit) return;
    const capturedCount = Object.keys(capturedPhotos).length;
    if (capturedCount < PHOTO_SLOTS.length) {
      toast.error(`Please capture all ${PHOTO_SLOTS.length} required photos before completing`);
      return;
    }
    setActionLoading(true);
    try {
      const photoPayload: { photoType: PhotoSlot; photoUrl: string }[] = [];
      for (const { key } of PHOTO_SLOTS) {
        const base64 = capturedPhotos[key]!;
        let url = base64;
        try {
          const res = await uploadsApi.uploadBase64(base64, key === 'SelfieWithShopkeeper' ? 'selfie' : 'visit-photo');
          url = res.fullUrl;
        } catch {
          // keep Base64 as fallback
        }
        photoPayload.push({ photoType: key, photoUrl: url });
      }
      await visitsApi.uploadPhotos(activeVisit.id, photoPayload);
      const updated = await visitsApi.completeVisit(activeVisit.id, { remarks });
      setVisits(prev => prev.map(v => v.id === updated.id ? updated : v));
      visitsCache = null;
      setCompleteModal(false);
      setRemarks('');
      setCapturedPhotos({});
      setScannedIMEIs(new Set());
      toast.success('✅ Visit completed successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to complete visit');
    } finally {
      setActionLoading(false);
    }
  };

  // ── IMEI Verification ────────────────────────────────────────────────────
  const openImeiModal = () => {
    if (!activeVisit) {
      toast.error('No active visit found. Please start a visit first.');
      return;
    }
    setImeiModal(true);
    setImeiInput('');
    setImeiResult(null);
    setImeiError('');
    setTimeout(() => imeiInputRef.current?.focus(), 200);
  };

  const handleImeiVerify = async () => {
    const imei = imeiInput.trim();
    if (!imei) {
      setImeiError('Please scan or enter a valid IMEI number.');
      return;
    }
    if (!/^\d+$/.test(imei)) {
      setImeiError('IMEI must contain only numeric digits.');
      return;
    }
    if (imei.length < 14 || imei.length > 16) {
      setImeiError('Please enter a valid IMEI number (14-16 digits).');
      return;
    }
    // if (scannedIMEIs.has(imei)) {
    //   toast.error('This IMEI has already been verified in this visit.');
    //   return;
    // }

    setImeiLoading(true);
    setImeiError('');
    setImeiResult(null);

    try {
      const resp = await imeiApi.verify({
        visitId: activeVisit!.id,
        shopId: activeVisit!.shopId,
        shopName: activeVisit!.shopName || '',
        IMEI: imei,
        Lat: location?.lat,
        Long: location?.lng,
      });

      if (resp.status === '1' && resp.data) {
        setImeiResult(resp.data);
        setScannedIMEIs(prev => new Set([...prev, imei]));
        toast.success('✅ IMEI verified successfully!');
      } else {
        setImeiError(resp.message || 'No record found against this IMEI number.');
        if (resp.message?.toLowerCase().includes('no record')) {
          toast.error('No record found for this IMEI.');
        }
      }
    } catch (e: any) {
      setImeiError('Unable to verify IMEI. Please try again.');
      toast.error(e.message || 'Verification failed');
    } finally {
      setImeiLoading(false);
    }
  };

  const closeImeiModal = () => {
    setImeiModal(false);
    setImeiInput('');
    setImeiResult(null);
    setImeiError('');
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return visits;
    const q = search.toLowerCase();
    return visits.filter(v =>
      v.shopName?.toLowerCase().includes(q) || v.status.toLowerCase().includes(q)
    );
  }, [visits, search]);

  const activeVisit = useMemo(() => visits.find(v => v.status === 'InProgress'), [visits]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Shop Visits">
      <div className="space-y-5">

        {/* Active Visit Banner */}
        {activeVisit && (
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Visit In Progress</p>
                <p className="text-emerald-200 text-xs">
                  {activeVisit.shopName} · Started {formatDistanceToNow(new Date(activeVisit.visitStartTime))} ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" leftIcon={<QrCode className="w-3.5 h-3.5" />} onClick={openImeiModal} className="text-white border-white hover:bg-white/10">
                IMEI Verification
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setCapturedPhotos({}); setCompleteModal(true); }}>
                Complete Visit
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Shop Visits</h2>
            <p className="text-sm text-slate-500">
              {visitsLoading ? 'Loading…' : `${filtered.length} visits recorded`}
              {refreshing && <span className="ml-2 text-blue-400 text-xs animate-pulse">Refreshing…</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadVisits(false)}
              disabled={visitsLoading || refreshing}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors"
              title="Refresh visits"
            >
              <RefreshCw className={`w-4 h-4 ${(visitsLoading || refreshing) ? 'animate-spin' : ''}`} />
            </button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={openStartVisitModal}
              disabled={!!activeVisit}
            >
              Start Visit
            </Button>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search visits..."
          value={rawSearch}
          onChange={handleSearchChange}
          leftIcon={<Search className="w-4 h-4" />}
        />

        {/* Visits List */}
        <div className="space-y-3">
          {visitsLoading ? (
            <>
              <VisitSkeleton />
              <VisitSkeleton />
              <VisitSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No visits found</p>
                <p className="text-slate-400 text-sm mt-1">Start a new visit to assigned shops</p>
              </div>
            </Card>
          ) : (
            filtered.map(visit => (
              <Card key={visit.id} hover onClick={() => setSelectedVisit(visit)}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        visit.status === 'Completed' ? 'bg-emerald-50' :
                        visit.status === 'InProgress' ? 'bg-blue-50' : 'bg-slate-50'
                      }`}>
                        {visit.status === 'Completed'
                          ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                          : <MapPin className={`w-5 h-5 ${visit.status === 'InProgress' ? 'text-blue-600' : 'text-slate-400'}`} />
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{visit.shopName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {format(new Date(visit.visitStartTime), 'dd MMM yyyy · hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={visit.status} />
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                    {visit.durationMinutes && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />{visit.durationMinutes} min
                      </span>
                    )}
                    {visit.latitude && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Navigation className="w-3 h-3" />GPS Verified
                      </span>
                    )}
                    {visit.photos && visit.photos.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Image className="w-3 h-3" />{visit.photos.length} photos
                      </span>
                    )}
                    {visit.remarks && (
                      <span className="text-xs text-slate-400 italic truncate max-w-[150px]">"{visit.remarks}"</span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ── Camera Modal ── */}
      {activeCameraSlot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4">
          <div className="relative w-full max-w-lg">
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-white text-center text-sm font-medium mb-3">
              {PHOTO_SLOTS.find(s => s.key === activeCameraSlot)?.label}
            </p>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
              />
              {countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-8xl font-bold text-white animate-pulse">{countdown}</span>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <p className="text-amber-300 text-center text-sm bg-black/70 rounded-xl p-4">{cameraError}</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex items-center justify-center gap-6 mt-5">
              <button
                onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={captureWithCountdown}
                disabled={countdown > 0 || !!cameraError}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all border-4 border-white/30 disabled:opacity-60"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-full" />
              </button>
              <button
                onClick={stopCamera}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Review Modal ── */}
      {reviewPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Review Photo</h3>
              <p className="text-xs text-slate-500 mt-0.5">{PHOTO_SLOTS.find(s => s.key === reviewPhoto.slot)?.label}</p>
            </div>
            <div className="p-4">
              <img src={reviewPhoto.dataUrl} alt="Captured" className="w-full rounded-xl aspect-[4/3] object-cover" />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={retakeReviewPhoto}>
                Retake
              </Button>
              <Button variant="success" className="flex-1" leftIcon={<CheckCircle className="w-4 h-4" />} onClick={confirmReviewPhoto}>
                Use Photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Visit Modal ── */}
      <Modal
        isOpen={startVisitModal}
        onClose={() => { setStartVisitModal(false); setSelectedShop(null); }}
        title="Start New Visit"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setStartVisitModal(false); setSelectedShop(null); }}>Cancel</Button>
            <Button variant="primary" onClick={handleStartVisit} isLoading={actionLoading} disabled={!selectedShop}>Start Visit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
            <Navigation className="w-4 h-4 flex-shrink-0" />
            {location ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Acquiring GPS location...'}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Shop <span className="text-red-500">*</span>
            </label>
            {shopsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No shops assigned to you</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedShop?.id === shop.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-slate-800 text-sm">{shop.shopName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{shop.address} · {shop.cityName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{shop.shopType}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Complete Visit Modal ── */}
      <Modal
        isOpen={completeModal}
        onClose={() => { setCompleteModal(false); stopCamera(); }}
        title="Complete Visit"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCompleteModal(false); stopCamera(); }}>Cancel</Button>
            <Button
              variant="success"
              onClick={handleCompleteVisit}
              isLoading={actionLoading}
              disabled={Object.keys(capturedPhotos).length < PHOTO_SLOTS.length}
            >
              {Object.keys(capturedPhotos).length < PHOTO_SLOTS.length
                ? `Capture ${PHOTO_SLOTS.length - Object.keys(capturedPhotos).length} More Photo(s)`
                : 'Complete Visit'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-medium text-slate-700">
              Visit at: <span className="text-blue-600">{activeVisit?.shopName}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Started {activeVisit && formatDistanceToNow(new Date(activeVisit.visitStartTime))} ago
            </p>
          </div>

          {/* Required Photos */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Required Photos <span className="text-red-500">*</span></p>
            <p className="text-xs text-slate-400 mb-3">Tap each slot to capture a photo</p>
            <div className="grid grid-cols-3 gap-3">
              {PHOTO_SLOTS.map(({ key, label }) => {
                const dataUrl = capturedPhotos[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openCamera(key)}
                    className="relative aspect-square rounded-xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: dataUrl ? '#10b981' : '#cbd5e1', borderStyle: dataUrl ? 'solid' : 'dashed' }}
                  >
                    {dataUrl ? (
                      <>
                        <img src={dataUrl} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-1">
                          <span className="text-[9px] text-white font-medium bg-emerald-600 rounded px-1">{label.split(' ')[0]}</span>
                        </div>
                        <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                        <div className="absolute top-1 left-1 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center">
                          <RefreshCw className="w-2.5 h-2.5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-blue-50 transition-colors p-1">
                        <Camera className="w-5 h-5 text-slate-400" />
                        <p className="text-[9px] text-slate-500 text-center leading-tight">{label}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gallery fallback */}
          <div className="text-center">
            <p className="text-xs text-slate-400">
              Or pick from gallery:{' '}
              {PHOTO_SLOTS.filter(s => !capturedPhotos[s.key]).map(({ key, label }) =>
                IS_NATIVE ? (
                  <button
                    key={key}
                    type="button"
                    className="text-blue-500 hover:underline mr-2 text-xs"
                    onClick={async () => {
                      try {
                        const perms = await CapCamera.requestPermissions({ permissions: ['photos'] });
                        if (perms.photos === 'denied') {
                          toast.error('Gallery permission denied. Please enable it in Settings.');
                          return;
                        }
                        const photo = await CapCamera.getPhoto({
                          quality: 85,
                          allowEditing: false,
                          resultType: CameraResultType.DataUrl,
                          source: CameraSource.Photos,
                          correctOrientation: true,
                        });
                        if (photo.dataUrl) {
                          setCapturedPhotos(prev => ({ ...prev, [key]: photo.dataUrl! }));
                        }
                      } catch (err: any) {
                        if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
                        toast.error('Could not open gallery');
                      }
                    }}
                  >
                    {label.split(' ')[0]}
                  </button>
                ) : (
                  <label key={key} className="text-blue-500 hover:underline cursor-pointer mr-2 text-xs">
                    {label.split(' ')[0]}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const dataUrl = ev.target?.result as string;
                          setCapturedPhotos(prev => ({ ...prev, [key]: dataUrl }));
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Visit Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
              placeholder="Add any notes about this visit..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── IMEI Verification Modal ── */}
      <Modal
        isOpen={imeiModal}
        onClose={closeImeiModal}
        title="IMEI Verification"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closeImeiModal}>Cancel</Button>
            <Button variant="primary" onClick={handleImeiVerify} isLoading={imeiLoading} disabled={!imeiInput.trim()}>
              Verify
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Auto-selected shop */}
          {activeVisit && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium">Shop</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeVisit.shopName}</p>
            </div>
          )}

          {/* IMEI Input */}
          <Input
            label="Scan IMEI No"
            required
            placeholder="Scan or enter IMEI number"
            value={imeiInput}
            onChange={e => {
              setImeiInput(e.target.value);
              setImeiError('');
            }}
            leftIcon={<QrCode className="w-4 h-4" />}
            error={imeiError}
            onKeyDown={e => {
              if (e.key === 'Enter') handleImeiVerify();
            }}
            autoFocus
            ref={imeiInputRef as React.RefObject<HTMLInputElement>}
          />
          <p className="text-xs text-slate-400">Barcode scanner supported — just scan directly into the field.</p>

          {/* Verification Result */}
          {imeiResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700">Verification Result</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Shop Name</span>
                  <span className="font-medium text-slate-800">{imeiResult.ShopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name</span>
                  <span className="font-medium text-slate-800">{imeiResult.CustomerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company Name</span>
                  <span className="font-medium text-slate-800">{imeiResult.CompanyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Region</span>
                  <span className="font-medium text-slate-800">{imeiResult.Region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">City</span>
                  <span className="font-medium text-slate-800">{imeiResult.City}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Product Name</span>
                  <span className="font-medium text-slate-800">{imeiResult.ProductName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Product Category</span>
                  <span className="font-medium text-slate-800">{imeiResult.ProductCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IMEI No</span>
                  <span className="font-mono font-medium text-slate-800">{imeiResult.IMEINo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice No</span>
                  <span className="font-medium text-slate-800">{imeiResult.InvoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Date</span>
                  <span className="font-medium text-slate-800">{imeiResult.InvoiceDate}</span>
                </div>
              </div>
            </div>
          )}

          {imeiError && !imeiResult && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{imeiError}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Visit Detail Modal ── */}
      <Modal
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        title="Visit Details"
        size="lg"
      >
        {selectedVisit && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">Shop</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedVisit.shopName}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-1"><StatusBadge status={selectedVisit.status} /></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">Start Time</p>
                <p className="font-medium text-slate-800 mt-1 text-sm">
                  {format(new Date(selectedVisit.visitStartTime), 'dd MMM · hh:mm a')}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="font-medium text-slate-800 mt-1 text-sm">
                  {selectedVisit.durationMinutes ? `${selectedVisit.durationMinutes} minutes` : 'In Progress'}
                </p>
              </div>
            </div>

            {selectedVisit.remarks && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-medium mb-1">Remarks</p>
                <p className="text-sm text-slate-700">{selectedVisit.remarks}</p>
              </div>
            )}

            {selectedVisit.photos && selectedVisit.photos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Visit Photos ({selectedVisit.photos.length})
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {selectedVisit.photos.map(photo => (
                    <div key={photo.id} className="space-y-1">
                      <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                        <img
                          src={photo.photoUrl}
                          alt={photo.photoType}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-xs text-slate-500 text-center">
                        {photo.photoType.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
