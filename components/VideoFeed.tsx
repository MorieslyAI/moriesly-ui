import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const VIDEO_FRAME_RATE = 2; // Reduced frame rate for background capture
const JPEG_QUALITY = 0.6; // Reduced quality for faster transfer

interface VideoFeedProps {
  isActive: boolean;
  isScanning: boolean;   // Active "Voice Mode" monitoring visual state
  isProcessing: boolean; // Manual scan "Loading" state
  onFrameCapture: (base64: string) => void;
  scanMode: 'food' | 'label' | 'qr' | 'receipt' | 'versus';
  onToggleMode: (mode: 'food' | 'label' | 'qr' | 'receipt' | 'versus') => void;
  headerAction?: React.ReactNode; 
  onScanTrigger: () => void; // Trigger for manual scan
  radiationLevel?: number; // New: 0 to 100 (Sugar Grams)
  hideScanModes?: boolean; // New prop to hide toggles in consultation mode
  uploadedImage?: string | null; // Base64 of manually uploaded image
}

export interface VideoFeedHandle {
  getSnapshot: () => string | null;
  flipCamera: () => void;
  toggleFlash: () => void;
}

const VideoFeed = forwardRef<VideoFeedHandle, VideoFeedProps>(({ 
    isActive, 
    isScanning, 
    isProcessing, 
    onFrameCapture, 
    scanMode, 
    onToggleMode, 
    headerAction, 
    onScanTrigger, 
    radiationLevel = 0, 
    hideScanModes = false,
    uploadedImage
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [frozenImage, setFrozenImage] = useState<string | null>(null);

  useEffect(() => {
    if (isProcessing && !frozenImage && !uploadedImage && isCameraOn) {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (video.readyState >= 2 && video.videoWidth > 0 && ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            setFrozenImage(canvas.toDataURL('image/jpeg', 0.8));
          } catch (e) {
            console.error("Canvas toDataURL failed", e);
          }
        }
      }
    } else if (!isProcessing) {
      setFrozenImage(null);
    }
  }, [isProcessing, isCameraOn, uploadedImage]);

  const handleFlipCamera = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      setIsFlashOn(false); 
  };

  const toggleFlash = async () => {
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;

      const newFlashState = !isFlashOn;
      try {
          await track.applyConstraints({
              advanced: [{ torch: newFlashState } as any]
          });
          setIsFlashOn(newFlashState);
      } catch (e) {
          console.error("Flash toggle failed", e);
      }
  };

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (uploadedImage) return uploadedImage;

      if (!isCameraOn) return null;
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (video.readyState >= 2 && video.videoWidth > 0 && ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            return canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
          } catch (e) {
            console.error("Canvas toDataURL failed", e);
            return null;
          }
        }
      }
      return null;
    },
    flipCamera: handleFlipCamera,
    toggleFlash: toggleFlash
  }));

  // Main Camera Lifecycle
  useEffect(() => {
    let mounted = true;
    const stopVideo = () => {
        try {
            if (streamRef.current) {
                const track = streamRef.current.getVideoTracks()[0];
                if (track && isFlashOn) {
                     track.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
                }
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
        } catch (e) {}
    };

    const startVideo = async () => {
      setCameraError(null);
      if (uploadedImage) {
          stopVideo();
          return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (mounted) setCameraError("Camera API not supported.");
          return;
      }
      try {
        const constraints = { 
            video: { 
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Camera stream acquired successfully");
        if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Use a promise to handle play() to avoid race conditions on mobile
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
              playPromise.then(() => {
                  console.log("Video playing successfully");
              }).catch(error => {
                  console.error("Auto-play was prevented:", error);
                  // On some mobile browsers, we might need a user gesture
              });
          }
        }
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) setHasFlash(true);
        else setHasFlash(false);
        setIsFlashOn(false);

      } catch (err: any) {
        console.error("Camera access error:", err);
        if (mounted) {
            if (err.name === 'NotAllowedError') {
                setCameraError("Camera permission denied. Please enable it in your browser settings.");
            } else if (err.name === 'NotFoundError') {
                setCameraError("No camera found on this device.");
            } else {
                setCameraError("Could not access camera. Please check permissions.");
            }
        }
      }
    };

    if (isCameraOn || uploadedImage) { 
        stopVideo();
        startVideo();
    } else {
        stopVideo();
    }

    return () => {
       mounted = false;
       stopVideo();
    };
  }, [isCameraOn, facingMode, uploadedImage]);

  useEffect(() => {
    if (uploadedImage || !isCameraOn || cameraError || isProcessing) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
    }
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (video.readyState >= 2 && ctx) {
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Compress even further to speed up the WebSocket frame transfer and reduce latency
            const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
            onFrameCapture(base64);
          }
        }
      }, 1000 / VIDEO_FRAME_RATE * 2); // Halve the framerate (e.g. 1 fps instead of 2 fps) to reduce network queue bloat
    } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onFrameCapture, isCameraOn, cameraError, uploadedImage, isProcessing]);

  const hasVisualContent = isCameraOn || !!uploadedImage;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      
      {/* Visual Content Area */}
      {uploadedImage ? (
          <div className="relative w-full h-full bg-black">
             <img 
               src={`data:image/jpeg;base64,${uploadedImage}`} 
               className={`w-full h-full object-cover transition-all duration-300 ${isScanning || isProcessing ? 'scale-105' : 'scale-100'} opacity-90`}
               alt="Analysis Target"
             />
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 z-10 shadow-lg">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                    Upload Mode
                </span>
             </div>
          </div>
      ) : frozenImage ? (
          <div className="relative w-full h-full bg-black">
             <img 
               src={frozenImage} 
               className={`w-full h-full object-cover transition-all duration-300 scale-105 opacity-90`}
               alt="Captured Frame"
             />
          </div>
      ) : (
          isCameraOn && !cameraError ? (
            <video
                ref={videoRef}
                className={`w-full h-full object-cover transition-all duration-300 ${isScanning || isProcessing ? 'scale-105' : 'scale-100'} ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                playsInline
                muted
                autoPlay
            />
          ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                      <div className="absolute inset-0 border-2 border-zinc-800 rounded-full animate-[spin_10s_linear_infinite]"></div>
                      <div className="absolute inset-4 border border-zinc-700/50 rounded-full border-dashed animate-[spin_15s_linear_infinite_reverse]"></div>
                      <div className="absolute inset-0 bg-zinc-900/50 rounded-full blur-xl"></div>
                      <div className="relative z-10 text-zinc-600">
                          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      </div>
                  </div>
                  <div className="text-center z-10 space-y-4">
                      <div>
                          <h3 className="text-white font-black uppercase tracking-widest text-lg">Visual Sensors Offline</h3>
                          <p className="text-zinc-500 text-xs mt-1">{cameraError || "Camera feed suspended by user."}</p>
                      </div>
                      {(!isCameraOn || cameraError) && (
                          <button 
                            onClick={() => {
                                setIsCameraOn(false);
                                setTimeout(() => setIsCameraOn(true), 10);
                                setCameraError(null);
                            }} 
                            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all transform hover:scale-105"
                          >
                              {cameraError ? "Retry Connection" : "Initialize Camera"}
                          </button>
                      )}
                  </div>
              </div>
          )
      )}

      <canvas ref={canvasRef} className="hidden" />
      


      {!hideScanModes && (
        <div className="absolute top-5 right-5 z-50 flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
                {headerAction && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                        {headerAction}
                    </div>
                )}
                {!uploadedImage && hasFlash && (
                    <button 
                      onClick={toggleFlash} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md border ${
                          isFlashOn 
                          ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                          : 'bg-black/40 text-white border-white/10 hover:bg-black/60'
                      }`}
                      title={isFlashOn ? "Turn Flash Off" : "Turn Flash On"}
                    >
                        {isFlashOn ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" stroke="none"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        )}
                    </button>
                )}
            </div>
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 z-40 flex flex-col items-center gap-4 pointer-events-none">
          
          {/* UPDATED MODE TOGGLES */}
          {!hideScanModes && hasVisualContent && !isProcessing && (
             <div className="bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 flex gap-2 shadow-2xl pointer-events-auto transform scale-90 origin-bottom overflow-x-auto max-w-[90vw] scrollbar-hide">
                 {(['food', 'label', 'qr', 'receipt', 'versus'] as const).map(mode => (
                     <button 
                        key={mode}
                        onClick={() => onToggleMode(mode)}
                        className={`px-3 py-2 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            scanMode === mode
                            ? 'bg-white text-black shadow-lg scale-105' 
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                        title={mode}
                     >
                         <span className="text-[10px] font-bold uppercase">{mode}</span>
                     </button>
                 ))}
             </div>
          )}

          {!hideScanModes && hasVisualContent && !isProcessing && (
              <div className="flex items-center gap-8 pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
                  {!uploadedImage && isCameraOn ? (
                      <button 
                        onClick={handleFlipCamera}
                        className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
                        title="Rotate Camera"
                      >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                  ) : <div className="w-12 h-12" />} 

                  <button 
                    onClick={() => {
                      console.log("Scan button clicked in VideoFeed");
                      onScanTrigger();
                    }}
                    className="group relative w-20 h-20 rounded-full border-4 border-white/80 flex items-center justify-center bg-transparent transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                      <div className="w-16 h-16 rounded-full bg-white group-hover:bg-zinc-200 transition-colors"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-black/50 pointer-events-none">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                  </button>

                  {isCameraOn ? (
                      <button 
                        onClick={() => setIsCameraOn(false)}
                        className="w-12 h-12 rounded-full bg-rose-500/20 hover:bg-rose-500/80 text-rose-500 hover:text-white flex items-center justify-center backdrop-blur-md border border-rose-500/30 transition-all shadow-lg active:scale-95"
                        title="Stop Camera"
                      >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      </button>
                  ) : <div className="w-12 h-12" />} 
              </div>
          )}
      </div>

      {isProcessing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="relative w-3/4 h-1/2 border border-teal-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.2)]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-400 rounded-br-lg"></div>
                <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_15px_#2dd4bf] animate-[scan_2s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-md border border-zinc-700/50 px-6 py-3 rounded-2xl flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                            <span className="text-teal-400 font-bold text-xs tracking-widest uppercase">Analyzing...</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                            Keep Subject Steady
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
      )}
    </div>
  );
});

export default VideoFeed;
