import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, ScanLine } from 'lucide-react';

const SCANNER_ELEMENT_ID = 'imei-barcode-scanner-view';
/** Square scan region — centered, same for QR and barcode. */
const SCAN_FRAME_RATIO = 0.78;

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.CODABAR,
];

const squareScanBox = (viewfinderWidth: number, viewfinderHeight: number) => {
  const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * SCAN_FRAME_RATIO);
  return { width: size, height: size };
};

interface BarcodeScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (rawValue: string) => void;
}

const frameSizeStyle: React.CSSProperties = {
  width: `${SCAN_FRAME_RATIO * 100}vmin`,
  height: `${SCAN_FRAME_RATIO * 100}vmin`,
  maxWidth: 'min(92vw, 360px)',
  maxHeight: 'min(92vw, 360px)',
};

/** Centered square frame + dark vignette mask. */
const ScanFrameOverlay: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    aria-hidden
  >
    <div className="relative" style={frameSizeStyle}>
      {/* Dark mask around the scan window */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.68)' }}
      />

      {/* Frame border */}
      <div className="absolute inset-0 rounded-2xl border border-white/25" />

      {/* Corner brackets */}
      {[
        'top-0 left-0 rounded-tl-2xl border-l-[4px] border-t-[4px]',
        'top-0 right-0 rounded-tr-2xl border-r-[4px] border-t-[4px]',
        'bottom-0 left-0 rounded-bl-2xl border-b-[4px] border-l-[4px]',
        'bottom-0 right-0 rounded-br-2xl border-b-[4px] border-r-[4px]',
      ].map((cls) => (
        <span
          key={cls}
          className={`absolute h-12 w-12 border-white shadow-[0_0_12px_rgba(255,255,255,0.35)] ${cls}`}
        />
      ))}

      {/* Animated scan line */}
      <div className="imei-scan-line absolute inset-x-4 h-[2px] rounded-full bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
    </div>
  </div>
);

export const BarcodeScannerOverlay: React.FC<BarcodeScannerOverlayProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    handledRef.current = false;
    setError('');
    setStarting(true);
    document.body.style.overflow = 'hidden';

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      verbose: false,
      formatsToSupport: SUPPORTED_FORMATS,
    });
    scannerRef.current = scanner;

    let cancelled = false;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: squareScanBox,
            disableFlip: false,
          },
          (decodedText) => {
            if (cancelled || handledRef.current) return;
            handledRef.current = true;
            onScan(decodedText);
          },
          () => {}
        );
        if (!cancelled) setStarting(false);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Could not access camera. Check permissions.';
        setError(message);
        setStarting(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      document.body.style.overflow = '';
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active?.isScanning) {
        active.stop().then(() => active.clear()).catch(() => active.clear());
      } else {
        active?.clear();
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black"
      style={{ height: '100dvh', width: '100dvw' }}
    >
      <style>{`
        #${SCANNER_ELEMENT_ID} {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          border: none !important;
        }
        #${SCANNER_ELEMENT_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #${SCANNER_ELEMENT_ID} #qr-shaded-region,
        #${SCANNER_ELEMENT_ID} #qr-shaded-region > div {
          opacity: 0 !important;
          border: none !important;
        }
        @keyframes imei-scan-sweep {
          0%, 100% { top: 10%; opacity: 0.35; }
          50% { top: 88%; opacity: 1; }
        }
        .imei-scan-line {
          animation: imei-scan-sweep 2.4s ease-in-out infinite;
        }
      `}</style>

      {/* Full-screen camera */}
      <div className="absolute inset-0">
        <div id={SCANNER_ELEMENT_ID} className="h-full w-full" />
      </div>

      {/* Center frame + mask */}
      {!error && !starting && <ScanFrameOverlay />}

      {/* Top bar — floating, minimal */}
      <div
        className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <ScanLine className="h-4 w-4 text-sky-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Scan IMEI</p>
            <p className="text-[11px] text-white/60">QR code or barcode</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm active:bg-white/25"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Loading */}
      {starting && !error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/70">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
          <p className="text-sm text-white/80">Starting camera…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-6">
          <div className="max-w-xs rounded-2xl bg-white/10 p-6 text-center backdrop-blur-md">
            <p className="mb-5 text-sm leading-relaxed text-red-200">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      {!error && !starting && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 flex justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
        >
          <p className="rounded-full bg-black/40 px-4 py-2 text-center text-xs text-white/85 backdrop-blur-sm">
            Center the code inside the square frame
          </p>
        </div>
      )}
    </div>
  );
};
