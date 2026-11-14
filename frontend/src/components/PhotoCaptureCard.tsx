import React, { useState, useRef, useEffect } from 'react';
import { TimerDurationSec } from '../types';
import { processImageFile } from '../lib/image';

interface Props {
  timerDurationSec: TimerDurationSec;
  message?: string | null;
  onAnalyze: (base64: string) => void;
}

export const PhotoCaptureCard: React.FC<Props> = ({
  timerDurationSec,
  message,
  onAnalyze,
}) => {
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Webcam modal state
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [canUseWebcam, setCanUseWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Check if webcam is supported and device is fine pointer (desktop)
    const hasMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    const isFinePointer =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: fine)').matches;

    setCanUseWebcam(Boolean(hasMedia && isFinePointer));
  }, []);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleOpenWebcam = async () => {
    setErrorText(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setErrorText('Unable to access camera. Please select a photo file instead.');
    }
  };

  const handleCloseWebcam = () => {
    stopWebcam();
    setWebcamOpen(false);
  };

  const handleCaptureWebcamFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setSelectedBlob(blob);
        setPreviewUrl(url);
      }
      handleCloseWebcam();
    }, 'image/jpeg', 0.9);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorText(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setSelectedBlob(file);
      setPreviewUrl(url);
    }
    // Reset inputs
    e.target.value = '';
  };

  // Desktop photographs via the webcam; phones use the native camera picker
  const handleTakePhoto = canUseWebcam
    ? handleOpenWebcam
    : () => cameraInputRef.current?.click();

  const handleReadLines = async () => {
    if (!selectedBlob) return;
    setProcessing(true);
    setErrorText(null);

    try {
      const { base64 } = await processImageFile(selectedBlob);
      onAnalyze(base64);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not prepare image.';
      setErrorText(msg);
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
      <span className="text-xs uppercase tracking-widest text-warmUmber mb-2">
        {timerDurationSec}s Sketch Completed
      </span>

      <h2 className="font-serif text-3xl font-medium text-espressoInk tracking-tight mb-2">
        Photograph Your Sketch
      </h2>

      <p className="text-warmUmber text-sm leading-relaxed mb-6">
        Hold your paper flat in natural light. Your image is analyzed in memory and immediately discarded.
      </p>

      {/* Safety / Retry message if present */}
      {message && (
        <div className="w-full mb-6 p-4 rounded-2xl bg-turmericMist/60 border border-borderHairline text-left">
          <p className="text-sm text-espressoInk">{message}</p>
        </div>
      )}

      {errorText && (
        <div className="w-full mb-6 p-4 rounded-2xl bg-blushClay/10 border border-blushClay/30 text-left">
          <p className="text-sm text-blushClay">{errorText}</p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Selected Preview */}
      {previewUrl ? (
        <div className="w-full flex flex-col items-center mb-6">
          <div className="relative p-2 rounded-2xl border border-borderHairline bg-canvasPaper shadow-none">
            <img
              src={previewUrl}
              alt="Sketch preview"
              className="w-44 h-44 object-contain rounded-xl"
            />
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              type="button"
              onClick={handleTakePhoto}
              className="text-xs text-warmUmber underline hover:text-espressoInk cursor-pointer"
            >
              Retake photo
            </button>
            <span className="text-xs text-borderHairline">·</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-warmUmber underline hover:text-espressoInk cursor-pointer"
            >
              Choose different file
            </button>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={handleReadLines}
            className="w-full mt-6 py-3.5 px-6 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors shadow-none cursor-pointer disabled:opacity-50"
          >
            {processing ? 'Reading strokes...' : 'Read my lines'}
          </button>
        </div>
      ) : (
        /* Action buttons */
        <div className="w-full flex flex-col gap-3 my-4">
          <button
            type="button"
            onClick={handleTakePhoto}
            className="w-full py-3.5 px-6 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 stroke-current fill-none stroke-[1.75]"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            Photograph Your Sketch
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-6 rounded-full border border-borderHairline text-warmUmber hover:text-espressoInk hover:bg-turmericMist/20 transition-colors text-sm cursor-pointer"
          >
            Select Existing Photo
          </button>
        </div>
      )}

      {/* Webcam Modal */}
      {webcamOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Webcam capture"
          className="fixed inset-0 z-50 bg-espressoInk/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-canvasPaper rounded-3xl p-6 border border-borderHairline flex flex-col items-center">
            <h3 className="font-serif text-2xl font-medium text-espressoInk tracking-tight mb-4">
              Align Sketch in Frame
            </h3>

            <div className="w-full aspect-[4/3] bg-espressoInk/5 rounded-2xl overflow-hidden border border-borderHairline relative">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button
                type="button"
                onClick={handleCaptureWebcamFrame}
                className="px-6 py-2.5 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors text-sm cursor-pointer"
              >
                Capture Frame
              </button>
              <button
                type="button"
                onClick={handleCloseWebcam}
                className="px-5 py-2.5 rounded-full border border-borderHairline text-warmUmber hover:text-espressoInk transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
