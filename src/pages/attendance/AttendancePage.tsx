import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, MapPin, Camera, CheckCircle, LogIn, LogOut, Calendar,
  ImageIcon, X, RefreshCw, FlipHorizontal, AlertTriangle, Upload, Loader2,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmModal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { attendanceApi } from '../../api/attendanceApi';
import { uploadsApi } from '../../api/uploadsApi';
import type { Attendance } from '../../types';
import { format, formatDistance } from 'date-fns';
import toast from 'react-hot-toast';

// ─── State phases for selfie flow ────────────────────────────
// idle       → no photo yet, show "Open Camera" button
// camera     → live camera feed showing
// review     → photo captured, show accept/retake modal
// ready      → photo accepted, ready to check-in
type SelfiePhase = 'idle' | 'camera' | 'review' | 'ready';

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();

  // ── Attendance data ───────────────────────────────────────
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ── GPS ───────────────────────────────────────────────────
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  // ── Selfie / camera state ─────────────────────────────────
  const [selfiePhase, setSelfiePhase] = useState<SelfiePhase>('idle');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState(0);

  // ── Action state ──────────────────────────────────────────
  const [uploadStep, setUploadStep] = useState<'' | 'uploading' | 'checkin'>('');
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── Live clock ───────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── GPS ──────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError('GPS unavailable — check-in will proceed without coordinates'),
      { timeout: 10000 }
    );
  }, []);

  // ─── Load today + history ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await attendanceApi.getAttendancePage();
        setTodayAttendance(data.todayAttendance);
        setHistory(data.history);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // ─── Camera helpers ───────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setSelfiePhase('camera');
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError' ? 'Camera access denied. Please allow camera permission.' :
        err.name === 'NotFoundError'   ? 'No camera found on this device.' :
                                         'Could not start camera. Please try again.';
      setCameraError(msg);
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopStream();
    setSelfieDataUrl(dataUrl);
    setSelfiePhase('review');       // → show review modal
    setCountdown(0);
  }, [facingMode, stopStream]);

  const captureWithCountdown = () => {
    setCountdown(3);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); captureFrame(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const retakePhoto = () => {
    setSelfieDataUrl(null);
    setSelfiePhase('idle');         // go back, user must open camera again
    setCameraError('');
    setCountdown(0);
    stopStream();
  };

  const acceptPhoto = () => {
    setSelfiePhase('ready');        // photo confirmed → ready to check-in
  };

  const clearPhoto = () => {
    setSelfieDataUrl(null);
    setSelfiePhase('idle');
    stopStream();
  };

  const switchCamera = () => {
    setFacingMode(m => m === 'user' ? 'environment' : 'user');
    stopStream();
    setSelfiePhase('idle');
  };

  // ─── Check-in ─────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!user || !selfieDataUrl) return;

    try {
      // Step 1 — upload selfie to server
      setUploadStep('uploading');
      let selfieUrl: string = selfieDataUrl;          // Base64 fallback
      try {
        const res = await uploadsApi.uploadSelfie(selfieDataUrl);
        selfieUrl = res.fullUrl;
        toast.success('📸 Selfie uploaded!', { duration: 1500 });
      } catch (uploadErr) {
        console.warn('Upload failed, using Base64 fallback:', uploadErr);
        // Backend can handle Base64 directly too
      }

      // Step 2 — mark attendance
      setUploadStep('checkin');
      const attendance = await attendanceApi.checkIn({
        userId: user.id,
        latitude: location?.lat,
        longitude: location?.lng,
        selfieUrl,
      });

      setTodayAttendance(attendance);
      setHistory(prev => [attendance, ...prev]);
      clearPhoto();
      toast.success('✅ Checked in successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Check-in failed. Please try again.');
    } finally {
      setUploadStep('');
    }
  };

  // ─── Check-out ────────────────────────────────────────────
  const handleCheckOut = async () => {
    if (!user || !todayAttendance) return;
    setShowCheckoutConfirm(false);
    setUploadStep('checkin');
    try {
      const updated = await attendanceApi.checkOut({
        attendanceId: todayAttendance.id,
        latitude: location?.lat,
        longitude: location?.lng,
      });
      setTodayAttendance(updated);
      setHistory(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success('✅ Checked out successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Check-out failed');
    } finally {
      setUploadStep('');
    }
  };

  // ─── Derived ──────────────────────────────────────────────
  const isCheckedIn  = todayAttendance?.status === 'CheckedIn';
  const isCheckedOut = todayAttendance?.status === 'CheckedOut';
  const isActioning  = uploadStep !== '';

  const checkInBtnLabel =
    uploadStep === 'uploading' ? 'Uploading selfie…' :
    uploadStep === 'checkin'   ? 'Marking attendance…' :
                                 'Check In with Selfie';

  if (loading) {
    return (
      <AppLayout title="Attendance">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading attendance…" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Attendance">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ═══════════════════════════════════════════════════
            CAMERA OVERLAY — phase: 'camera'
        ═══════════════════════════════════════════════════ */}
        {selfiePhase === 'camera' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
            <div className="relative w-full max-w-lg">

              <p className="text-white text-center text-sm font-medium mb-3">
                Position your face in the circle and press the shutter
              </p>

              {/* Close */}
              <button
                onClick={() => { stopStream(); setSelfiePhase('idle'); setCameraError(''); }}
                className="absolute -top-8 right-0 p-2 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Camera feed */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                />
                {/* Countdown overlay */}
                {countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-9xl font-bold text-white drop-shadow-lg animate-pulse">{countdown}</span>
                  </div>
                )}
                {/* Face guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/40 rounded-full" />
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* Controls */}
              <div className="flex items-center justify-center gap-8 mt-6">
                {/* Switch camera */}
                <button
                  onClick={switchCamera}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="Switch camera"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>

                {/* Shutter */}
                <button
                  onClick={captureWithCountdown}
                  disabled={countdown > 0}
                  className="w-18 h-18 w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all border-4 border-white/30 disabled:opacity-50"
                >
                  <div className="w-14 h-14 bg-slate-800 rounded-full" />
                </button>

                {/* Cancel */}
                <button
                  onClick={() => { stopStream(); setSelfiePhase('idle'); setCameraError(''); }}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            SELFIE REVIEW MODAL — phase: 'review'
        ═══════════════════════════════════════════════════ */}
        {selfiePhase === 'review' && selfieDataUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">Review Your Selfie</h3>
                <p className="text-xs text-slate-500 mt-0.5">Make sure your face is clearly visible before proceeding</p>
              </div>

              <div className="p-4">
                <div className="rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={selfieDataUrl}
                    alt="Captured selfie"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={retakePhoto}
                >
                  Retake
                </Button>
                <Button
                  variant="success"
                  className="flex-1"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  onClick={acceptPhoto}
                >
                  Use This Photo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            MAIN CLOCK CARD
        ═══════════════════════════════════════════════════ */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-center">
            <p className="text-blue-200 text-sm mb-2">{format(currentTime, 'EEEE, dd MMMM yyyy')}</p>
            <p className="text-5xl font-bold text-white font-mono tracking-tight">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full ${location ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <p className="text-blue-200 text-xs">
                {location
                  ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                  : locationError || 'Acquiring GPS…'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* Status pill */}
            <div className="flex items-center justify-center mb-6">
              <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm border ${
                isCheckedIn  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                isCheckedOut ? 'bg-slate-50 text-slate-600 border-slate-200' :
                               'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isCheckedIn  ? 'bg-emerald-500 animate-pulse' :
                  isCheckedOut ? 'bg-blue-400' :
                                 'bg-amber-500'
                }`} />
                {isCheckedIn  ? 'Currently Checked In' :
                 isCheckedOut ? 'Checked Out for Today' :
                                'Not Checked In'}
              </div>
            </div>

            {/* Today's times */}
            {todayAttendance && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <LogIn className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs text-emerald-700 font-medium">Check-In</p>
                  <p className="text-lg font-bold text-emerald-800 mt-1">
                    {format(new Date(todayAttendance.checkInTime), 'HH:mm')}
                  </p>
                  {todayAttendance.selfieUrl && (
                    <div className="mt-2">
                      <img
                        src={todayAttendance.selfieUrl}
                        alt="Selfie"
                        className="w-12 h-12 rounded-lg mx-auto object-cover border-2 border-emerald-200 cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => window.open(todayAttendance.selfieUrl!, '_blank')}
                        title="Click to view full selfie"
                      />
                      <p className="text-[10px] text-emerald-600 mt-1">Selfie ✓</p>
                    </div>
                  )}
                </div>

                <div className={`border rounded-xl p-4 text-center ${isCheckedOut ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                  <LogOut className={`w-5 h-5 mx-auto mb-1 ${isCheckedOut ? 'text-blue-600' : 'text-slate-400'}`} />
                  <p className={`text-xs font-medium ${isCheckedOut ? 'text-blue-700' : 'text-slate-500'}`}>Check-Out</p>
                  <p className={`text-lg font-bold mt-1 ${isCheckedOut ? 'text-blue-800' : 'text-slate-400'}`}>
                    {todayAttendance.checkOutTime
                      ? format(new Date(todayAttendance.checkOutTime), 'HH:mm')
                      : '--:--'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Selfie capture section (only if not checked in yet) ── */}
            {!todayAttendance && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-slate-800">Selfie Verification</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Required</span>
                </div>

                {/* phase: idle — show capture prompt */}
                {selfiePhase === 'idle' && (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                      <Camera className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Take a Selfie to Check In</p>
                      <p className="text-xs text-slate-400 mt-1">Your photo will be recorded with the attendance</p>
                    </div>

                    {cameraError && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-left">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">{cameraError}</p>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      onClick={openCamera}
                      isLoading={cameraLoading}
                      leftIcon={<Camera className="w-4 h-4" />}
                    >
                      Open Camera
                    </Button>

                    {/* Gallery / file fallback */}
                    <div>
                      <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 cursor-pointer hover:underline">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Or pick from gallery
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => {
                              setSelfieDataUrl(ev.target?.result as string);
                              setSelfiePhase('review');
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* phase: camera — handled by full-screen overlay above */}
                {selfiePhase === 'camera' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-blue-700 font-medium">📷 Camera is open…</p>
                    <p className="text-xs text-blue-500 mt-1">Use the camera overlay to take your selfie</p>
                  </div>
                )}

                {/* phase: review — handled by full-screen overlay above */}
                {selfiePhase === 'review' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-700 font-medium">🔍 Reviewing photo…</p>
                    <p className="text-xs text-amber-500 mt-1">Accept or retake in the popup</p>
                  </div>
                )}

                {/* phase: ready — photo accepted, show thumbnail */}
                {selfiePhase === 'ready' && selfieDataUrl && (
                  <div className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-emerald-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelfiePhase('review')}
                      title="Click to review photo"
                    >
                      <img src={selfieDataUrl} alt="Selfie" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-emerald-800">Selfie Ready</p>
                      </div>
                      <p className="text-xs text-emerald-600 mt-0.5">Photo will be uploaded on check-in</p>
                    </div>
                    <button
                      onClick={clearPhoto}
                      className="p-2 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0"
                      title="Remove & retake"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload progress indicator */}
            {isActioning && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    {uploadStep === 'uploading' ? 'Uploading selfie to server…' : 'Marking attendance…'}
                  </p>
                  <p className="text-xs text-blue-500">
                    {uploadStep === 'uploading' ? 'Step 1 of 2' : 'Step 2 of 2'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Action buttons ── */}
            {!todayAttendance && (
              <Button
                className="w-full py-3.5 text-base"
                size="lg"
                variant={selfiePhase === 'ready' ? 'success' : 'primary'}
                onClick={handleCheckIn}
                isLoading={isActioning}
                disabled={selfiePhase !== 'ready' || isActioning}
                leftIcon={isActioning ? <Upload className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              >
                {isActioning ? checkInBtnLabel : selfiePhase === 'ready' ? 'Check In with Selfie' : 'Capture Selfie First'}
              </Button>
            )}

            {isCheckedIn && (
              <Button
                className="w-full py-3.5 text-base"
                size="lg"
                variant="danger"
                onClick={() => setShowCheckoutConfirm(true)}
                isLoading={isActioning}
                disabled={isActioning}
                leftIcon={<LogOut className="w-5 h-5" />}
              >
                {isActioning ? 'Checking out…' : 'Check Out Now'}
              </Button>
            )}

            {isCheckedOut && (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-slate-700 font-semibold">Attendance completed for today</p>
                <p className="text-slate-400 text-xs mt-1">
                  Duration: {formatDistance(
                    new Date(todayAttendance!.checkInTime),
                    new Date(todayAttendance!.checkOutTime!)
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════
            ATTENDANCE HISTORY
        ═══════════════════════════════════════════════════ */}
        <Card>
          <CardHeader
            title="Attendance History"
            subtitle="Your check-in / check-out records"
            icon={<Calendar className="w-4 h-4" />}
          />
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? (
              <div className="p-10 text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No attendance records found</p>
              </div>
            ) : (
              history.map(record => (
                <div key={record.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {record.selfieUrl ? (
                      <img
                        src={record.selfieUrl}
                        alt="Selfie"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0 cursor-pointer hover:opacity-80"
                        onClick={() => window.open(record.selfieUrl!, '_blank')}
                        title="View selfie"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <Camera className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {format(new Date(record.createdAt), 'EEE, dd MMM yyyy')}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-emerald-500" />
                          {format(new Date(record.checkInTime), 'HH:mm')}
                        </span>
                        {record.checkOutTime && (
                          <span className="flex items-center gap-1">
                            <LogOut className="w-3 h-3 text-blue-500" />
                            {format(new Date(record.checkOutTime), 'HH:mm')}
                          </span>
                        )}
                        {record.checkInLatitude && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <MapPin className="w-3 h-3" />GPS
                          </span>
                        )}
                        {record.selfieUrl && (
                          <span className="flex items-center gap-1 text-purple-500">
                            <Camera className="w-3 h-3" />Photo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={record.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={showCheckoutConfirm}
        onClose={() => setShowCheckoutConfirm(false)}
        onConfirm={handleCheckOut}
        title="End Your Shift?"
        message="You're about to check out for today. Your check-out time and location will be recorded, and you won't be able to check in again until tomorrow. Are you sure you want to proceed?"
        confirmLabel="Yes, Check Out"
        isLoading={isActioning}
        variant="danger"
      />
    </AppLayout>
  );
};
