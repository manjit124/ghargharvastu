import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  SwitchCamera,
  X,
  Check,
  Zap,
  ZapOff,
  AlertTriangle,
  Upload,
  Sparkles,
} from 'lucide-react';
import { compressDataUrlIfNeeded } from '../utils/imageUtils';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (imageDataUrl: string) => void;
  onOpenGalleryUpload?: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  onOpenGalleryUpload,
}) => {
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Safely stop all tracks on the active stream
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        track.stop();
      });
      setActiveStream(null);
    }
    setIsTorchOn(false);
    setTorchAvailable(false);
  }, [activeStream]);

  // Check available video devices
  const checkCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1 || videoDevices.length === 0);
    } catch {
      // Default to allowing switch
      setHasMultipleCameras(true);
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (modeToUse = facingMode) => {
      stopCurrentStream();
      setCameraError(null);
      setErrorCode(null);
      setIsInitializing(true);

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsInitializing(false);
        setErrorCode('UNSUPPORTED');
        setCameraError(
          'Your browser does not support camera capture. Please upload a photo instead.'
        );
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: modeToUse },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setActiveStream(stream);

        // Check if torch/flashlight is supported
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as any)) || {};
          if (capabilities.torch) {
            setTorchAvailable(true);
          } else {
            setTorchAvailable(false);
          }
        }

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play triggered:', playErr);
          }
        }

        checkCameraDevices();
      } catch (err: any) {
        console.error('Camera stream error:', err);
        const name = err?.name || '';
        const msg = err?.message || '';

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorCode('PERMISSION_DENIED');
          setCameraError(
            'Camera permission was denied. Please allow camera access or upload a photo from your gallery.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorCode('NO_CAMERA');
          setCameraError('No camera was detected on this device.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setErrorCode('CAMERA_BUSY');
          setCameraError('The camera is currently being used by another application.');
        } else if (name === 'OverconstrainedError') {
          // Retry once with fallback basic constraint
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
            streamRef.current = fallbackStream;
            setActiveStream(fallbackStream);
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
            }
            return;
          } catch {
            setErrorCode('UNKNOWN');
            setCameraError('Unable to open the camera. Please try again.');
          }
        } else {
          setErrorCode('UNKNOWN');
          setCameraError('Unable to open the camera. Please try again.');
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [facingMode, stopCurrentStream, checkCameraDevices]
  );

  // Sync videoRef whenever stream or modal becomes active
  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera(facingMode);
    } else {
      stopCurrentStream();
    }

    return () => {
      stopCurrentStream();
    };
  }, [isOpen, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Make sure videoRef gets srcObject if stream is set after mount
  useEffect(() => {
    if (videoRef.current && activeStream && !capturedPhoto) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch(() => {});
    }
  }, [activeStream, capturedPhoto]);

  // Handle page visibility change (pause camera when tab is switched)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCurrentStream();
      } else if (isOpen && !capturedPhoto) {
        startCamera(facingMode);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, capturedPhoto, facingMode, startCamera, stopCurrentStream]);

  // Toggle front/back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!activeStream || !torchAvailable) return;
    const track = activeStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track.applyConstraints as any)({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle not supported on this track:', e);
    }
  };

  // Capture current frame from live stream
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If user facing, mirror image horizontally
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Stop active camera stream immediately to release hardware
    stopCurrentStream();

    // Optimize image size if needed while maintaining high visual clarity
    const optimized = await compressDataUrlIfNeeded(rawDataUrl, 1600, 0.88);
    setCapturedPhoto(optimized);
  };

  // Retake photo: clear captured preview and restart camera
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Confirm photo: pass to caller and close modal
  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    stopCurrentStream();
    onPhotoCaptured(capturedPhoto);
    onClose();
  };

  // Close modal and cleanup
  const handleClose = () => {
    stopCurrentStream();
    setCapturedPhoto(null);
    setCameraError(null);
    onClose();
  };

  // Native mobile capture input fallback
  const handleMobileCaptureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const raw = ev.target?.result as string;
        const optimized = await compressDataUrlIfNeeded(raw, 1600, 0.88);
        setCapturedPhoto(optimized);
        stopCurrentStream();
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="camera-capture-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      {/* Hidden input for mobile native camera capture fallback */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={mobileInputRef}
        onChange={handleMobileCaptureChange}
        className="hidden"
      />

      <div className="relative w-full max-w-xl bg-stone-900 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar Controls */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-stone-900/90 border-b border-stone-800/80 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-stone-200 tracking-wide uppercase flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-500" />
              {capturedPhoto ? 'Review Photo' : 'Live Camera'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Flash/Torch Toggle */}
            {!capturedPhoto && torchAvailable && (
              <button
                type="button"
                id="camera-torch-toggle"
                onClick={handleToggleTorch}
                title={isTorchOn ? 'Turn Flash Off' : 'Turn Flash On'}
                className={`p-2 rounded-xl border transition-colors ${
                  isTorchOn
                    ? 'bg-amber-500 border-amber-400 text-stone-950'
                    : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:text-white'
                }`}
              >
                {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Switch Front/Back Camera */}
            {!capturedPhoto && hasMultipleCameras && !cameraError && (
              <button
                type="button"
                id="camera-switch-button"
                onClick={handleToggleCamera}
                title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Back'} Camera`}
                className="p-2 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-300 hover:text-white transition-colors"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              id="camera-close-button"
              onClick={handleClose}
              className="p-2 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black min-h-[320px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Captured Photo Preview Stage */}
          {capturedPhoto ? (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={capturedPhoto}
                alt="Captured Room"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-stone-800"
              />
              <div className="absolute top-4 left-4 bg-stone-900/80 backdrop-blur-xs text-amber-300 text-xs px-3 py-1 rounded-full border border-stone-700 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Photo Ready for Vastu Analysis
              </div>
            </div>
          ) : cameraError ? (
            /* Error Fallback Screen */
            <div className="p-6 text-center max-w-md mx-auto space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-stone-100">
                {errorCode === 'PERMISSION_DENIED'
                  ? 'Camera Permission Required'
                  : errorCode === 'NO_CAMERA'
                  ? 'No Camera Detected'
                  : errorCode === 'CAMERA_BUSY'
                  ? 'Camera In Use'
                  : 'Camera Unavailable'}
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">{cameraError}</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  id="camera-try-again-button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try Again
                </button>

                {/* Mobile direct camera capture fallback trigger */}
                <button
                  type="button"
                  id="camera-mobile-app-fallback-button"
                  onClick={() => mobileInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  Open Device Camera App
                </button>

                {onOpenGalleryUpload && (
                  <button
                    type="button"
                    id="camera-gallery-fallback-button"
                    onClick={() => {
                      handleClose();
                      onOpenGalleryUpload();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-stone-400" />
                    Upload From Gallery
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Live Camera Feed Screen */
            <div className="relative w-full h-full flex items-center justify-center">
              {isInitializing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-950/70 backdrop-blur-xs gap-3">
                  <div className="w-10 h-10 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
                  <span className="text-xs text-stone-300 font-medium">Starting camera preview...</span>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[65vh] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {});
                  }
                }}
              />

              {/* Viewfinder Framing Grid */}
              <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-amber-400/80 rounded-tl-lg" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-amber-400/80 rounded-tr-lg" />
                </div>

                <div className="text-center">
                  <span className="inline-block px-3.5 py-1 rounded-full bg-stone-950/70 text-stone-300 text-[11px] font-medium backdrop-blur-xs border border-stone-700/60">
                    Frame room, wall, door, mirror or object
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-amber-400/80 rounded-bl-lg" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-amber-400/80 rounded-br-lg" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800/80 shrink-0">
          {capturedPhoto ? (
            /* Confirmation Actions: Retake vs Use Photo */
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                id="camera-retake-photo-button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-98 text-stone-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Photo
              </button>

              <button
                type="button"
                id="camera-use-photo-button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Use Photo
              </button>
            </div>
          ) : !cameraError ? (
            /* Live Camera Controls: Primary Capture Button */
            <div className="flex items-center justify-between gap-4">
              <div className="w-16 flex justify-start">
                <button
                  type="button"
                  id="camera-cancel-text-button"
                  onClick={handleClose}
                  className="text-stone-400 hover:text-stone-200 text-xs font-semibold py-2 px-1"
                >
                  Cancel
                </button>
              </div>

              {/* Primary Capture Button */}
              <div className="flex-1 flex justify-center">
                <button
                  type="button"
                  id="camera-capture-trigger-button"
                  onClick={handleCapture}
                  disabled={isInitializing}
                  className="group relative flex items-center justify-center p-1 rounded-full transition-transform active:scale-95 disabled:opacity-50"
                  aria-label="Capture Photo"
                >
                  <div className="w-18 h-18 rounded-full border-4 border-white/80 group-hover:border-amber-400 flex items-center justify-center transition-colors">
                    <div className="w-14 h-14 rounded-full bg-white group-hover:bg-amber-500 group-active:scale-90 transition-all flex items-center justify-center shadow-lg">
                      <Camera className="w-6 h-6 text-stone-900 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </button>
              </div>

              <div className="w-16 flex justify-end">
                {hasMultipleCameras && (
                  <button
                    type="button"
                    id="camera-bottom-switch-button"
                    onClick={handleToggleCamera}
                    className="p-3 rounded-2xl bg-stone-800 text-stone-300 hover:text-white border border-stone-700 flex flex-col items-center gap-0.5"
                    title="Flip camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span className="text-[9px] uppercase font-bold">
                      {facingMode === 'environment' ? 'Back' : 'Front'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold"
              >
                Close Camera
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
