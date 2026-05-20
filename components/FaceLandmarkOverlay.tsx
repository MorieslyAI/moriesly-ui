import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { FaceLandmarkPoint } from '../types';

// ─── MediaPipe landmark indices per zona wajah ───────────────────────────────
// Berdasarkan MediaPipe Face Mesh canonical 478-point model
const ZONE_INDICES = {
  forehead: [10, 338, 297, 332, 284, 251, 389, 109, 67, 103, 54, 21],
  leftEye: [159, 145, 133, 173, 157, 158, 144, 153, 154, 155],
  rightEye: [386, 374, 362, 398, 384, 385, 373, 380, 381, 382],
  leftCheek: [116, 123, 147, 187, 207, 206, 203, 36, 101, 119],
  rightCheek: [345, 352, 376, 411, 427, 426, 423, 266, 330, 348],
  chin: [152, 175, 148, 176, 149, 150, 136, 172, 58, 132],
  nose: [1, 4, 5, 195, 197, 6, 168, 8],
  upperLip: [0, 267, 269, 270, 409, 291, 375, 321, 405, 314],
} as const;

export type ZoneName = keyof typeof ZONE_INDICES;

export interface ZoneCoordinate {
  zone: ZoneName;
  x: number; // 0–100 (percent)
  y: number;
}

export interface FaceLandmarkSnapshot {
  landmarks: FaceLandmarkPoint[];      // semua 478 titik
  zoneCoordinates: ZoneCoordinate[];   // koordinat zona yang sudah dihitung
}

export interface FaceLandmarkOverlayHandle {
  captureSnapshot: () => FaceLandmarkSnapshot | null;
}

interface Props {
  isActive: boolean;
  onFaceDetected?: (detected: boolean) => void;
  /** Render frozen image setelah capture, hentikan kamera */
  frozenFrame?: string | null;
}

// ─── Helper: hitung centroid dari sekumpulan landmark ────────────────────────
function computeCentroid(
  landmarks: { x: number; y: number }[],
  indices: readonly number[],
): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const idx of indices) {
    const pt = landmarks[idx];
    if (pt) {
      sumX += pt.x;
      sumY += pt.y;
      count++;
    }
  }
  if (count === 0) return { x: 0.5, y: 0.5 };
  return { x: sumX / count, y: sumY / count };
}

// ─── Warna severity berdasarkan posisi zona ───────────────────────────────────
const DOT_COLOR = 'rgba(56, 245, 224, 0.95)';
const LINE_COLOR = 'rgba(56, 245, 224, 0.45)';
const DOT_RADIUS = 1.6;

const FaceLandmarkOverlay = forwardRef<FaceLandmarkOverlayHandle, Props>(
  ({ isActive, onFaceDetected, frozenFrame }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const landmarkerRef = useRef<FaceLandmarker | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastLandmarksRef = useRef<FaceLandmarkPoint[] | null>(null);

    const [isModelLoading, setIsModelLoading] = useState(true);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [faceDetected, setFaceDetected] = useState(false);

    // ─── Init MediaPipe ────────────────────────────────────────────────────
    useEffect(() => {
      let cancelled = false;

      const initMediaPipe = async () => {
        try {
          // Dynamic import — tidak bundle, load dari CDN
          const { FaceLandmarker, FilesetResolver } = await import(
            '@mediapipe/tasks-vision'
          );

          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
          );

          const landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          if (!cancelled) {
            landmarkerRef.current = landmarker;
            setIsModelLoading(false);
          }
        } catch (err) {
          console.error('[MediaPipe] Init failed:', err);
          if (!cancelled) setIsModelLoading(false);
        }
      };

      initMediaPipe();
      return () => {
        cancelled = true;
      };
    }, []);

    // ─── Kamera lifecycle ──────────────────────────────────────────────────
    useEffect(() => {
      if (!isActive || frozenFrame) return;

      let mounted = true;

      const startCamera = async () => {
        setCameraError(null);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 720 },
              height: { ideal: 720 },
            },
          });
          if (!mounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        } catch (err: any) {
          if (!mounted) return;
          if (err.name === 'NotAllowedError') {
            setCameraError('Izin kamera ditolak. Aktifkan di pengaturan browser.');
          } else if (err.name === 'NotFoundError') {
            setCameraError('Tidak ada kamera yang ditemukan.');
          } else {
            setCameraError('Gagal mengakses kamera.');
          }
        }
      };

      startCamera();

      return () => {
        mounted = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
      };
    }, [isActive, frozenFrame]);

    // ─── Detection loop ────────────────────────────────────────────────────
    const runDetection = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !canvas || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(runDetection);
        return;
      }

      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(displayW * dpr));
      canvas.height = Math.max(1, Math.floor(displayH * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(runDetection);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let result: FaceLandmarkerResult;
      try {
        result = landmarker.detectForVideo(video, performance.now());
      } catch {
        rafRef.current = requestAnimationFrame(runDetection);
        return;
      }

      const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0;
      setFaceDetected(hasFace);
      onFaceDetected?.(hasFace);

      if (hasFace) {
        const rawLandmarks = result.faceLandmarks[0];

        // Simpan untuk snapshot
        lastLandmarksRef.current = rawLandmarks.map(pt => ({
          x: pt.x,
          y: pt.y,
          z: pt.z ?? 0,
        }));

        // ─── Gambar titik landmark ──────────────────────────────────────
        const videoW = video.videoWidth || 1;
        const videoH = video.videoHeight || 1;
        const scale = Math.max(displayW / videoW, displayH / videoH);
        const offsetX = (displayW - videoW * scale) / 2;
        const offsetY = (displayH - videoH * scale) / 2;

        const toDisplay = (pt: { x: number; y: number }) => {
          const x = pt.x * videoW * scale + offsetX;
          const y = pt.y * videoH * scale + offsetY;
          return { x: displayW - x, y };
        };

        // Titik kecil untuk semua 478 landmark
        for (const pt of rawLandmarks) {
          const p = toDisplay(pt);
          ctx.beginPath();
          ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = DOT_COLOR;
          ctx.fill();
        }

        // Garis kontur wajah (simplified)
        const CONTOUR_INDICES = [
          10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
          397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
          172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
        ];

        ctx.beginPath();
        let first = true;
        for (const idx of CONTOUR_INDICES) {
          const pt = rawLandmarks[idx];
          if (!pt) continue;
          const p = toDisplay(pt);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else {
        lastLandmarksRef.current = null;
      }

      rafRef.current = requestAnimationFrame(runDetection);
    }, [onFaceDetected]);

    // ─── Start/stop detection loop ─────────────────────────────────────────
    useEffect(() => {
      if (!isActive || frozenFrame || isModelLoading) return;
      rafRef.current = requestAnimationFrame(runDetection);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [isActive, frozenFrame, isModelLoading, runDetection]);

    // ─── Expose captureSnapshot ────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      captureSnapshot: (): FaceLandmarkSnapshot | null => {
        const pts = lastLandmarksRef.current;
        if (!pts || pts.length === 0) return null;

        const zoneCoordinates: ZoneCoordinate[] = (
          Object.entries(ZONE_INDICES) as [ZoneName, readonly number[]][]
        ).map(([zone, indices]) => {
          const centroid = computeCentroid(pts, indices);
          return {
            zone,
            x: parseFloat((centroid.x * 100).toFixed(2)),
            y: parseFloat((centroid.y * 100).toFixed(2)),
          };
        });

        return { landmarks: pts, zoneCoordinates };
      },
    }));

    // ─── Render ────────────────────────────────────────────────────────────
    return (
      <div className="relative w-full h-full bg-black overflow-hidden">
        {/* Frozen frame setelah capture */}
        {frozenFrame ? (
          <img
            src={frozenFrame}
            alt="Captured"
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <>
            {/* Live video (mirror) */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              playsInline
              muted
              autoPlay
            />
            {/* Landmark overlay canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: 'screen' }}
            />
          </>
        )}

        {/* Model loading state */}
        {isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <div className="w-12 h-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-teal-400 text-xs font-mono uppercase tracking-widest animate-pulse">
              Loading Face Model...
            </p>
          </div>
        )}

        {/* Camera error state */}
        {cameraError && !isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-20 p-6 text-center">
            <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-zinc-400 text-sm">{cameraError}</p>
          </div>
        )}

        {/* Face detection indicator */}
        {!isModelLoading && !cameraError && !frozenFrame && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${faceDetected
                ? 'bg-teal-950/80 border-teal-500/50 text-teal-400'
                : 'bg-black/60 border-zinc-700/50 text-zinc-500'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-teal-400 animate-pulse' : 'bg-zinc-600'}`} />
              {faceDetected ? 'Face Locked' : 'Searching...'}
            </div>
          </div>
        )}

        {/* Corner brackets — scanning frame */}
        {!frozenFrame && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="relative w-56 h-72">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-400/70 rounded-tl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-400/70 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-400/70 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-400/70 rounded-br" />
            </div>
          </div>
        )}
      </div>
    );
  },
);

FaceLandmarkOverlay.displayName = 'FaceLandmarkOverlay';
export default FaceLandmarkOverlay;
