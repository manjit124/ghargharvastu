import React, { useState } from 'react';
import {
  Scan,
  Upload,
  Camera,
  CheckCircle,
  Compass,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { CardinalDirection, PhotoAnalysisResult } from '../types';
import { CompassModal } from './CompassModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { DIRECTION_NAMES } from '../data/vastuKnowledge';
import { getPreferredLanguage } from '../services/languageService';
import { authService } from '../services/authService';

interface ScanRoomWorkflowProps {
  onCompleteAnalysis?: (result: PhotoAnalysisResult) => void;
  onGoToChat?: (query: string) => void;
}

export const ScanRoomWorkflow: React.FC<ScanRoomWorkflowProps> = ({
  onCompleteAnalysis,
  onGoToChat,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [roomPhoto, setRoomPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [direction, setDirection] = useState<CardinalDirection | null>(null);
  const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<PhotoAnalysisResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setRoomPhoto(base64);
        runRoomScan(base64, direction);
      };
      reader.readAsDataURL(file);
    }
  };

  const runRoomScan = async (imgBase64: string, selectedDir: CardinalDirection | null) => {
    setIsAnalyzing(true);
    setScanError(null);
    setCurrentStep(2); // Detecting room & objects

    try {
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          imageBase64: imgBase64,
          direction: selectedDir || undefined,
          mode: 'scan_room',
          language: getPreferredLanguage(),
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          // ignore
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Scan failed (${res.status}). Please try again.`);
      }

      if (!data) {
        throw new Error('Received unexpected empty response from analysis engine.');
      }

      data.imageUrl = imgBase64;
      data.timestamp = Date.now();
      setAnalysisData(data);

      if (!selectedDir && data.directionStatus?.needed) {
        setCurrentStep(4); // Direction missing
      } else {
        setCurrentStep(5); // Complete report
      }
    } catch (err: any) {
      console.error('Scan room error:', err);
      setScanError(err?.message || 'Unable to analyze room. Please try uploading the image again.');
      setCurrentStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDirectionSet = (dir: CardinalDirection) => {
    setDirection(dir);
    if (roomPhoto) {
      runRoomScan(roomPhoto, dir);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-xs font-semibold">
          <Scan className="w-3.5 h-3.5 text-orange-600" />
          5-Step Guided Room Auditor
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900">
          Scan My Room
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          AI detects room type and objects, checks spatial orientation, and requests only the missing direction details.
        </p>
      </div>

      {/* 5-Step Visual Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-semibold text-stone-500">
          <div
            className={`p-2 rounded-xl border transition-all ${
              currentStep >= 1 ? 'border-amber-500 bg-amber-50/70 text-amber-900' : 'border-stone-100'
            }`}
          >
            <span className="block text-xs font-bold">1. Upload</span>
            <span className="text-[10px] opacity-75">Room Photo</span>
          </div>
          <div
            className={`p-2 rounded-xl border transition-all ${
              currentStep >= 2 ? 'border-amber-500 bg-amber-50/70 text-amber-900' : 'border-stone-100'
            }`}
          >
            <span className="block text-xs font-bold">2. Detect</span>
            <span className="text-[10px] opacity-75">Room & Items</span>
          </div>
          <div
            className={`p-2 rounded-xl border transition-all ${
              currentStep >= 3 ? 'border-amber-500 bg-amber-50/70 text-amber-900' : 'border-stone-100'
            }`}
          >
            <span className="block text-xs font-bold">3. Assess</span>
            <span className="text-[10px] opacity-75">Placements</span>
          </div>
          <div
            className={`p-2 rounded-xl border transition-all ${
              currentStep >= 4 ? 'border-amber-500 bg-amber-50/70 text-amber-900' : 'border-stone-100'
            }`}
          >
            <span className="block text-xs font-bold">4. Calibrate</span>
            <span className="text-[10px] opacity-75">Direction</span>
          </div>
          <div
            className={`p-2 rounded-xl border transition-all ${
              currentStep === 5 ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900' : 'border-stone-100'
            }`}
          >
            <span className="block text-xs font-bold">5. Solution</span>
            <span className="text-[10px] opacity-75">Action Plan</span>
          </div>
        </div>
      </div>

      {scanError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <span>⚠️</span>
            <span>{scanError}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Upload Prompt */}
      {!roomPhoto && (
        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-bold text-lg text-stone-900">
            Click or upload a wide photo of your room
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Try to stand near the room entrance so the bed, mirror, window, or furniture are in view.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 cursor-pointer transition-all active:scale-98"
            >
              <Camera className="w-4 h-4" />
              Click Photo
            </button>
            <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-stone-300 hover:border-amber-500 bg-white text-stone-800 font-bold text-sm shadow-xs cursor-pointer transition-all active:scale-98">
              <Upload className="w-4 h-4 text-stone-600" />
              Upload from Gallery
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Step 2/3: Scanning Animation */}
      {isAnalyzing && (
        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-amber-600 border-t-transparent animate-spin mx-auto" />
          <h3 className="font-heading font-bold text-lg text-stone-900">
            Scanning Room Layout...
          </h3>
          <p className="text-xs text-stone-500">
            AI is identifying the room type, visible objects, and checking traditional Vastu alignments.
          </p>
        </div>
      )}

      {/* Step 4: Missing Direction Check Prompt */}
      {currentStep === 4 && analysisData && !isAnalyzing && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 space-y-5 animate-in fade-in">
          <div className="flex items-center gap-3">
            <img
              src={roomPhoto || ''}
              alt="Scanned Room"
              className="w-16 h-16 rounded-xl object-cover border border-stone-200"
            />
            <div>
              <div className="text-xs font-semibold text-amber-800">
                Room detected: <strong>{analysisData.roomType}</strong>
              </div>
              <div className="text-xs text-stone-600">
                Visible objects: {analysisData.detectedObjects.slice(0, 4).join(', ')}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <Compass className="w-5 h-5 text-amber-600 animate-pulse" />
              Direction Confirmation Required
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              To give you exact placement suggestions for the {analysisData.roomType}, we need to know which direction this wall or primary object faces.
            </p>
            <button
              type="button"
              onClick={() => setIsCompassOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              📍 Check Direction with Compass
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Final Solution Report */}
      {currentStep === 5 && analysisData && !isAnalyzing && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                ✓
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-stone-900">
                  {analysisData.roomType} Scan Complete
                </h3>
                <p className="text-xs text-stone-500">
                  {direction ? `Oriented towards ${DIRECTION_NAMES[direction]?.name || direction} (${direction})` : 'General orientation'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRoomPhoto(null);
                setAnalysisData(null);
                setCurrentStep(1);
                setDirection(null);
              }}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200"
            >
              Scan Another Room
            </button>
          </div>

          {/* Detected Objects Checklist */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Detected Elements:
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisData.detectedObjects.map((obj, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-medium flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  {obj}
                </span>
              ))}
            </div>
          </div>

          {/* Observations & Solutions */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 space-y-1.5">
            <strong className="block text-stone-900">Vastu Assessment:</strong>
            <p className="leading-relaxed">{analysisData.traditionalVastuGuidance}</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
            <strong className="block text-emerald-900 font-bold">Recommended Action:</strong>
            <p className="leading-relaxed font-medium">{analysisData.recommendation}</p>
          </div>

          {/* Alternatives */}
          {analysisData.easyAlternatives && analysisData.easyAlternatives.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs space-y-1 text-amber-950">
              <strong className="block text-amber-900 font-bold">Non-Structural Remedies:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-amber-900/90">
                {analysisData.easyAlternatives.map((alt, idx) => (
                  <li key={idx}>{alt}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (onGoToChat) {
                  onGoToChat(`Maine ${analysisData.roomType} scan kiya tha. Iska observation tha: "${analysisData.recommendation}". Mujhe aur detail bataiye.`);
                }
              }}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              Ask AI Follow-up Question <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Direction Compass Modal */}
      <CompassModal
        isOpen={isCompassOpen}
        onClose={() => setIsCompassOpen(false)}
        currentValue={direction}
        purposeLabel="this room wall"
        onSelectDirection={handleDirectionSet}
      />

      {/* Live Camera Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoCaptured={(captured) => {
          setRoomPhoto(captured);
          runRoomScan(captured, direction);
        }}
      />
    </div>
  );
};
