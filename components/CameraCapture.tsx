
import React, { useRef, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Your browser does not support camera access.");
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setIsPermissionDenied(true);
          setError(t('errorCameraPermission'));
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("No camera found on this device.");
        } else {
          setError("Could not access camera. Please check your device settings.");
        }
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [t]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use the actual video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        onCapture(base64);
        
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
      <div className="relative w-full h-full max-w-md bg-black overflow-hidden flex flex-col">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
          <button onClick={onCancel} className="text-white bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-black/60 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {!error && (
            <div className="text-white font-bold bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-xs uppercase tracking-widest border border-white/20">
              {t('cameraGuidance')}
            </div>
          )}
        </div>

        {/* Video Feed */}
        {!error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Scanning Overlay Mask - Only show if no error */}
        {!error && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-square border-2 border-white/80 rounded-[2rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
               <div className="scan-line !h-0.5 opacity-50"></div>
               <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
               <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
               <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
               <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
            </div>
          </div>
        )}

        {/* Guidance Overlay Labels - Only show if no error */}
        {!error && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-square pointer-events-none z-20 flex flex-col items-center justify-between py-12 text-center">
              <p className="text-white font-black text-sm drop-shadow-lg bg-emerald-600/60 px-4 py-1 rounded-full border border-white/30 backdrop-blur-sm">
                  {t('cameraTip1')}
              </p>
              <p className="text-white font-black text-sm drop-shadow-lg bg-emerald-600/60 px-4 py-1 rounded-full border border-white/30 backdrop-blur-sm">
                  {t('cameraTip3')}
              </p>
          </div>
        )}

        {/* Footer Controls - Only show if no error */}
        {!error && (
          <div className="absolute bottom-0 inset-x-0 p-10 flex flex-col items-center gap-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white/80 text-xs font-medium text-center max-w-[200px]">
              {t('cameraTip2')}
            </p>
            <div className="flex items-center justify-center">
              <button 
                onClick={takePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-1 border-4 border-emerald-500 shadow-2xl active:scale-90 transition-transform"
              >
                 <div className="w-full h-full bg-white rounded-full border border-slate-200"></div>
              </button>
            </div>
          </div>
        )}

        {/* Error State UI */}
        {error && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center z-50">
            <div className="bg-rose-500/20 p-6 rounded-full mb-6">
              <svg className="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-black mb-4">{t('error')}</h3>
            <p className="text-slate-300 font-medium mb-8 leading-relaxed max-w-xs">
              {error}
            </p>
            <div className="flex flex-col w-full gap-3">
              {isPermissionDenied && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-4 text-left">
                  <p className="text-white text-xs font-bold mb-2 uppercase tracking-wider">How to fix:</p>
                  <ol className="text-slate-400 text-xs space-y-2 list-decimal pl-4">
                    <li>Click the lock icon 🔒 next to the website URL.</li>
                    <li>Toggle "Camera" to <b>On</b>.</li>
                    <li>Refresh the page and try again.</li>
                  </ol>
                </div>
              )}
              <button 
                onClick={onCancel} 
                className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                {t('backToHome')}
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
