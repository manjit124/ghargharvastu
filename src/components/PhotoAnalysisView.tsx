import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Compass,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Share2,
  RefreshCw,
  RotateCcw,
  Info,
  ChevronRight,
  SlidersHorizontal,
  Bookmark,
  Copy,
  Check,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { CardinalDirection, PhotoAnalysisResult, ProactiveIssue } from '../types';
import { CompassModal } from './CompassModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { DIRECTION_NAMES } from '../data/vastuKnowledge';
import { compressImageIfNeeded } from '../utils/imageUtils';
import { getStoredUserId, creditService } from '../services/creditService';
import { authService } from '../services/authService';
import { analyticsService } from '../services/analyticsService';
import { LanguageSelector } from './LanguageSelector';
import {
  AppLanguage,
  getPreferredLanguage,
  onLanguageChange,
  getLocalizedLabels,
} from '../services/languageService';

interface PhotoAnalysisViewProps {
  initialRoomHint?: string;
  onOpenChatWithQuery?: (query: string, image?: string) => void;
  onSaveResult?: (res: PhotoAnalysisResult) => void;
  onOpenMonetization?: () => void;
}

const ROOM_OPTIONS = [
  'Auto Detect',
  'Bedroom',
  'Living Room',
  'Kitchen',
  'Bathroom',
  'Pooja Area',
  'Main Entrance',
  'Main Gate',
  'Balcony / Terrace',
  'Study / Home Office',
  'Staircase Area',
  'Dining Room',
];

const LOADING_STEPS = [
  'Photo samajh raha hoon...',
  'Room aur objects identify kar raha hoon...',
  'Traditional Vastu points check kar raha hoon...',
  'Personalized practical solution prepare kar raha hoon...',
];

export const PhotoAnalysisView: React.FC<PhotoAnalysisViewProps> = ({
  initialRoomHint,
  onOpenChatWithQuery,
  onSaveResult,
  onOpenMonetization,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [roomHint, setRoomHint] = useState<string>(initialRoomHint || 'Auto Detect');
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [direction, setDirection] = useState<CardinalDirection | null>(null);
  const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [language, setLanguage] = useState<AppLanguage>(getPreferredLanguage());

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreditError, setIsCreditError] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onLanguageChange((newLang) => {
      setLanguage(newLang);
    });
  }, []);

  const langLabels = getLocalizedLabels(language);
  const steps = [
    langLabels.loadingPhoto,
    langLabels.loadingRoom,
    langLabels.loadingVastu,
    langLabels.loadingSolution,
  ];

  // Handle file select from gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image (JPG, PNG, WebP).');
      return;
    }
    setErrorMessage(null);
    try {
      const compressed = await compressImageIfNeeded(file);
      setSelectedImage(compressed);
      setAnalysisResult(null);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setSelectedImage(base64);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI multimodal analysis
  const runAnalysis = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setErrorMessage(null);
    setIsCreditError(false);
    setLoadingStepIndex(0);

    // Step cycle animation
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1200);

    // Track image analysis started (safe non-sensitive metadata only)
    analyticsService.trackImageAnalysisStarted(
      roomHint === 'Auto Detect' ? 'auto_detect' : roomHint || 'room_photo'
    );

    try {
      const userId = getStoredUserId();
      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
          'x-user-id': userId,
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: 'image/jpeg',
          roomTypeHint: roomHint === 'Auto Detect' ? undefined : roomHint,
          question: userQuestion.trim() || undefined,
          direction: direction || undefined,
          mode: 'proactive',
          language,
          userId,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        let errorMsg = 'Analysis request failed. Please try again.';
        try {
          const raw = await response.text();
          if (raw) {
            const errData = JSON.parse(raw);
            if (response.status === 402 || errData?.code === 'CREDITS_EXHAUSTED' || errData?.code === 'FREE_EXHAUSTED') {
              setIsCreditError(true);
            }
            errorMsg = errData?.error || errData?.message || errorMsg;
          }
        } catch {
          // fallback
        }
        throw new Error(errorMsg);
      }

      const resText = await response.text();
      let data: PhotoAnalysisResult;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error('Received unexpected response from analysis server.');
      }
      data.imageUrl = selectedImage;
      data.timestamp = Date.now();
      data.id = 'pa_' + Date.now();
      setAnalysisResult(data);

      // Track image analysis completed (safe non-sensitive metadata only)
      analyticsService.trackImageAnalysisCompleted(data.roomType || roomHint || 'room');

      // Refresh remaining user credits
      creditService.fetchCredits().catch(() => {});
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setErrorMessage(err?.message || 'Network failure while processing photo. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!analysisResult) return;
    if (onSaveResult) {
      onSaveResult(analysisResult);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const copyShareText = () => {
    if (!analysisResult) return;
    const shareText = `VastuVision AI Check:
Room: ${analysisResult.roomType}
Observation: ${analysisResult.observations}
Recommendation: ${analysisResult.recommendation}
${analysisResult.directionStatus?.currentDirection ? `Direction: ${analysisResult.directionStatus.currentDirection}` : ''}
Analyzed by VastuVision AI - Your AI Vastu Home Advisor`;

    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* View Header */}
      <div className="text-center space-y-1.5 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Real-World Vision Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900 tracking-tight">
          AI Photo Vastu Problem Solver
        </h1>
        <p className="text-sm text-stone-600 max-w-xl mx-auto">
          Upload or click a photo of any room, wall, door, mirror, or furniture. AI will inspect placements and suggest practical solutions.
        </p>
      </div>

      {/* Upload / Camera Stage */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-5">
        {!selectedImage ? (
          <div className="border-2 border-dashed border-stone-300 hover:border-amber-400 bg-stone-50/60 rounded-2xl p-8 text-center transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-amber-600" />
            </div>

            <h3 className="font-heading font-bold text-stone-900 text-lg mb-1">
              Click or upload room, wall, or object photo
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
              Clear photos of mirrors, clock placements, kitchen counters, main doors, or bedroom beds yield the best accuracy.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                id="photo-analysis-camera-btn"
                onClick={() => setIsCameraModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Camera className="w-4 h-4" />
                Click Photo
              </button>
              <button
                type="button"
                id="photo-analysis-gallery-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl border border-stone-300 hover:border-amber-500 bg-white text-stone-800 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4 text-stone-600" />
                Upload from Gallery
              </button>
            </div>
          </div>
        ) : null}

        {/* Selected Image Preview & Context Inputs */}
        {selectedImage && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Image Preview Box */}
              <div className="md:col-span-5 relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-4/3 flex items-center justify-center group">
                <img
                  src={selectedImage}
                  alt="Uploaded Home Room"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white text-xs font-medium backdrop-blur-xs transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Take another photo with camera"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white text-xs font-medium backdrop-blur-xs transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Select a different photo from gallery"
                  >
                    <Upload className="w-3.5 h-3.5 text-stone-300" />
                    Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalysisResult(null);
                    }}
                    className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-stone-300 hover:text-white text-xs font-medium backdrop-blur-xs transition-colors shadow-sm cursor-pointer"
                    title="Clear image"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Context Options */}
              <div className="md:col-span-7 space-y-4">
                {/* Language Selection Row */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {langLabels.languageSelectorTitle}:
                  </label>
                  <LanguageSelector
                    variant="buttons"
                    value={language}
                    onChange={(newLang) => setLanguage(newLang)}
                    showIcon
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Room Type (Optional):
                  </label>
                  <select
                    value={roomHint}
                    onChange={(e) => setRoomHint(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  >
                    {ROOM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question / Specific Doubt */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Aapka Specific Sawaal / Problem (Optional):
                  </label>
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder="e.g. Is wall par mirror lagana sahi hai? Bed orientation theek hai?"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                {/* Direction Tag with Compass Launcher */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Wall ya Room Direction:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCompassOpen(true)}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        direction
                          ? 'border-amber-400 bg-amber-50/70 text-amber-900'
                          : 'border-dashed border-stone-300 hover:border-amber-400 bg-white text-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Compass className={`w-4 h-4 ${direction ? 'text-amber-600' : 'text-stone-400'}`} />
                        <span>
                          {direction
                            ? `Direction: ${DIRECTION_NAMES[direction]?.name || direction} (${direction})`
                            : '📍 Check / Select Direction (Compass)'}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-700 underline font-medium">
                        {direction ? 'Change' : 'Open'}
                      </span>
                    </button>
                    {direction && (
                      <button
                        type="button"
                        onClick={() => setDirection(null)}
                        className="px-2.5 py-2.5 rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 text-xs"
                        title="Clear direction"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Analyze Trigger Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={runAnalysis}
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm shadow-md shadow-amber-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing with Gemini Vision...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze Photo with VastuVision AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading Step Cycle Bar */}
            {loading && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 animate-in fade-in flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-amber-600 border-t-transparent animate-spin shrink-0" />
                <div className="text-xs font-semibold text-amber-900">
                  {steps[loadingStepIndex % steps.length]}
                </div>
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {isCreditError && onOpenMonetization && (
                <button
                  type="button"
                  onClick={onOpenMonetization}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shrink-0 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Get Credits / Watch Video
                </button>
              )}
              <button
                type="button"
                onClick={runAnalysis}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shrink-0 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Output Section */}
      {analysisResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Structured Result Card */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-md overflow-hidden">
            {/* Card Header Bar */}
            <div className="p-5 border-b border-stone-100 bg-gradient-to-r from-amber-50/70 to-orange-50/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white font-heading font-extrabold flex items-center justify-center shadow-sm">
                  {analysisResult.roomType?.slice(0, 2).toUpperCase() || 'VA'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-lg text-stone-900">
                      {analysisResult.roomType} Vastu Analysis
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        analysisResult.confidence === 'High'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {analysisResult.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Detected: {analysisResult.detectedObjects.slice(0, 5).join(', ')}
                  </p>
                </div>
              </div>

              {/* Action buttons on card */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {savedSuccess ? 'Saved!' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={copyShareText}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copiedShare ? 'Copied!' : 'Share Card'}
                </button>
              </div>
            </div>

            {/* Structured Content Grid */}
            <div className="p-6 space-y-6">
              {/* Section 1: Analysis (What AI Sees) */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-stone-600" />
                  {langLabels.visualAnalysis}
                </div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-sm text-stone-800 leading-relaxed">
                  {analysisResult.observations}
                </div>
              </div>

              {/* Section 2: Vastu Observation */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  {langLabels.traditionalObservation}
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-sm text-stone-900 leading-relaxed">
                  {analysisResult.traditionalVastuGuidance}
                </div>
              </div>

              {/* Section 3: Proactive Issues Found */}
              {analysisResult.proactiveIssues && analysisResult.proactiveIssues.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {langLabels.issuesFound} ({analysisResult.proactiveIssues.length})
                    </span>
                    <span className="text-[11px] font-normal text-stone-500">
                      {language === 'hi' ? 'बिना तोड़-फोड़ के समाधान' : 'Non-structural first'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysisResult.proactiveIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-4 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-2 hover:border-amber-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {issue.object}: {issue.issue}
                          </span>
                          {issue.directionCheckNeeded && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                              Direction matters
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-600">{issue.vastuPrinciple}</p>

                        <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
                          <div className="text-emerald-900">
                            <strong>Recommended Action:</strong> {issue.recommendation}
                          </div>
                          {issue.alternative && (
                            <div className="text-stone-500 text-[11px]">
                              <strong>Easy Alternative:</strong> {issue.alternative}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Primary Recommendation & Easy Alternatives */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3 text-stone-900">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {langLabels.primaryRecommendation}
                </div>
                <p className="text-sm leading-relaxed text-emerald-950 font-medium">
                  {analysisResult.recommendation}
                </p>

                {analysisResult.easyAlternatives && analysisResult.easyAlternatives.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200/50 space-y-1">
                    <span className="text-xs font-bold text-emerald-900">
                      {langLabels.easyAlternatives}:
                    </span>
                    <ul className="list-disc list-inside text-xs text-emerald-800 space-y-0.5">
                      {analysisResult.easyAlternatives.map((alt, i) => (
                        <li key={i}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Direction Status prompt if needed */}
              {analysisResult.directionStatus?.needed && !direction && (
                <div className="p-4 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <Compass className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
                    <div>
                      <div className="text-xs font-bold text-amber-300">Need Direction Calibration?</div>
                      <div className="text-xs text-stone-300">
                        {analysisResult.directionStatus.instruction ||
                          'Check the wall direction with the compass to verify exact energy alignment.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCompassOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold whitespace-nowrap shadow-sm transition-all"
                  >
                    📍 Open Compass
                  </button>
                </div>
              )}

              {/* Ask Follow-up in AI Chat */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
                <span className="text-xs text-stone-500">
                  Have a question about this result or need customized guidance?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenChatWithQuery) {
                      onOpenChatWithQuery(
                        `Maine ${analysisResult.roomType} ki photo upload ki thi. Iske regarding mujhe aur guidance chahiye: "${analysisResult.recommendation}"`,
                        selectedImage || undefined
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  Continue in AI Chat <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Calm Disclaimer */}
              <div className="text-[11px] text-stone-400 border-t border-stone-100 pt-3 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{analysisResult.disclaimer}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compass Modal */}
      <CompassModal
        isOpen={isCompassOpen}
        onClose={() => setIsCompassOpen(false)}
        currentValue={direction}
        purposeLabel="this photo analysis"
        onSelectDirection={(dir) => {
          setDirection(dir);
        }}
      />

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoCaptured={(captured) => {
          setSelectedImage(captured);
          setAnalysisResult(null);
        }}
        onOpenGalleryUpload={() => fileInputRef.current?.click()}
      />
    </div>
  );
};
