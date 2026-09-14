import React, { useState } from 'react';
import {
  Home,
  Plus,
  Trash2,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Compass,
  ArrowRight,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { HomeRoomEntry, HomeProjectReport, CardinalDirection } from '../types';
import { DIRECTION_NAMES } from '../data/vastuKnowledge';
import { LanguageSelector } from './LanguageSelector';
import {
  AppLanguage,
  getPreferredLanguage,
  onLanguageChange,
  getLocalizedLabels,
} from '../services/languageService';
import { authService } from '../services/authService';

interface CompleteHomeScanViewProps {
  onSaveReport?: (report: HomeProjectReport) => void;
}

const DEFAULT_ROOMS: Omit<HomeRoomEntry, 'id'>[] = [
  { name: 'Main Entrance Door', type: 'Entrance', direction: 'NE' },
  { name: 'Living Room', type: 'Living', direction: 'E' },
  { name: 'Master Bedroom', type: 'Bedroom', direction: 'SW' },
  { name: 'Kitchen Cooktop', type: 'Kitchen', direction: 'SE' },
  { name: 'Pooja Mandir', type: 'Pooja', direction: 'NE' },
  { name: 'Primary Bathroom', type: 'Bathroom', direction: 'NW' },
];

export const CompleteHomeScanView: React.FC<CompleteHomeScanViewProps> = ({ onSaveReport }) => {
  const [homeName, setHomeName] = useState<string>('My Sweet Home');
  const [propertyType, setPropertyType] = useState<string>('3BHK Apartment');
  const [rooms, setRooms] = useState<HomeRoomEntry[]>(
    DEFAULT_ROOMS.map((r, i) => ({ ...r, id: 'rm_' + i }))
  );
  const [language, setLanguage] = useState<AppLanguage>(getPreferredLanguage());

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<HomeProjectReport | null>(null);

  React.useEffect(() => {
    return onLanguageChange((newLang) => {
      setLanguage(newLang);
    });
  }, []);

  const langLabels = getLocalizedLabels(language);

  const handleAddRoom = () => {
    const newEntry: HomeRoomEntry = {
      id: 'rm_' + Date.now(),
      name: 'New Room / Space',
      type: 'Bedroom',
      direction: 'E',
    };
    setRooms([...rooms, newEntry]);
  };

  const handleRemoveRoom = (id: string) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const handleUpdateRoom = (id: string, updates: Partial<HomeRoomEntry>) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handlePhotoUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleUpdateRoom(id, { photoBase64: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const generateFullHomeReport = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/complete-home-scan', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          homeName,
          propertyType,
          language,
          rooms: rooms.map((r) => ({
            name: r.name,
            type: r.type,
            direction: r.direction,
            hasPhoto: !!r.photoBase64,
            notes: r.notes,
          })),
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
        throw new Error(data?.error || data?.message || `Audit generation failed (${res.status}). Please try again.`);
      }

      if (!data) {
        throw new Error('Received unexpected empty response from server.');
      }

      data.createdAt = Date.now();
      setGeneratedReport(data);

      if (onSaveReport) {
        onSaveReport(data);
      }
    } catch (err: any) {
      console.error('Home scan error:', err);
      setErrorMessage(err?.message || 'Failed to generate complete home audit. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-1.5 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <Home className="w-3.5 h-3.5 text-amber-600" />
          Complete Home Project Scan
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900">
          Complete House Vastu Audit
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Audit your whole house room by room. Get an overall home harmony score, positive zones, and priority non-structural fixes.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {!generatedReport ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-6 shadow-sm">
          {/* Home Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-stone-100">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Home / Project Name:
              </label>
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Property Type:
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-stone-50"
              >
                <option value="1BHK/2BHK Apartment">Apartment / Flat</option>
                <option value="Independent House / Villa">Independent Villa</option>
                <option value="Duplex Rowhouse">Duplex / Bungalow</option>
                <option value="Rented Home">Rented Accommodation</option>
              </select>
            </div>
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
          </div>

          {/* Rooms List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-stone-900 text-base">
                Rooms & Zones in this Home ({rooms.length})
              </h3>
              <button
                type="button"
                onClick={handleAddRoom}
                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold border border-amber-200 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Room
              </button>
            </div>

            <div className="space-y-2.5">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-amber-600 font-bold text-xs shrink-0">
                      {room.direction}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => handleUpdateRoom(room.id, { name: e.target.value })}
                        className="font-bold text-xs sm:text-sm text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:outline-hidden w-full"
                      />
                      <span className="text-[11px] text-stone-500">
                        {room.type} • Facing {DIRECTION_NAMES[room.direction]?.name || room.direction}
                      </span>
                    </div>
                  </div>

                  {/* Direction Picker */}
                  <div className="flex items-center gap-2">
                    <select
                      value={room.direction}
                      onChange={(e) =>
                        handleUpdateRoom(room.id, {
                          direction: e.target.value as CardinalDirection,
                        })
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white font-semibold"
                    >
                      {Object.keys(DIRECTION_NAMES).map((dir) => (
                        <option key={dir} value={dir}>
                          {dir} ({DIRECTION_NAMES[dir as CardinalDirection]?.name || dir})
                        </option>
                      ))}
                    </select>

                    {/* Room Photo Upload Thumbnail */}
                    <label
                      className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-1 ${
                        room.photoBase64
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 bg-white text-stone-500 hover:text-stone-800'
                      }`}
                      title={room.photoBase64 ? 'Photo attached' : 'Upload room photo'}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {room.photoBase64 ? 'Attached' : 'Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(room.id, file);
                        }}
                        className="hidden"
                      />
                    </label>

                    {rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(room.id)}
                        className="p-2 text-stone-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Full Report */}
          <div className="pt-4 border-t border-stone-100 flex justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={generateFullHomeReport}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Compiling Full Home Audit...' : 'Generate Complete Home Vastu Overview'}
            </button>
          </div>
        </div>
      ) : (
        /* Report View */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-lg space-y-6 animate-in fade-in">
          {/* Report Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700">
                Official AI Vastu Audit
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900">
                {generatedReport.homeName}
              </h2>
              <p className="text-xs text-stone-500">
                {generatedReport.propertyType} • Generated on{' '}
                {new Date(generatedReport.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Overall Guidance Score */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="w-14 h-14 rounded-xl bg-amber-600 text-white font-heading font-black text-2xl flex items-center justify-center shadow-xs">
                  {generatedReport.overallScore}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950">Overall Harmony Score</div>
                  <div className="text-[10px] text-amber-700 max-w-[140px] leading-tight font-medium">
                    {generatedReport.scoreLabel}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setGeneratedReport(null)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Modify Rooms
              </button>
            </div>
          </div>

          {/* Three Categorized Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 🟢 Positive Areas */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Positive Areas
              </div>
              <ul className="space-y-1 text-xs text-emerald-950">
                {generatedReport.positiveAreas.map((pos, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 🟡 Areas to Review */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Areas to Review
              </div>
              <ul className="space-y-1 text-xs text-amber-950">
                {generatedReport.areasToReview.map((rev, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{rev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 🔴 Priority Improvements */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Priority Improvements
              </div>
              <div className="space-y-2 text-xs">
                {generatedReport.priorityImprovements.map((prio, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white border border-rose-200/80">
                    <strong className="text-rose-900 block text-[11px]">
                      {prio.room}: {prio.item}
                    </strong>
                    <span className="text-stone-700 text-[11px]">{prio.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Room-by-Room Score Breakdown */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-sm text-stone-900">
              Room-by-Room Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {generatedReport.roomScores.map((rm, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-900">{rm.name}</span>
                    <span className="text-amber-700 font-heading">{rm.score}/100</span>
                  </div>
                  <div className="text-[11px] text-stone-600">{rm.notes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 leading-relaxed space-y-1">
            <strong className="block text-stone-900 font-bold">Executive Advisor Summary:</strong>
            <p>{generatedReport.summaryReport}</p>
          </div>

          {/* Report Footer Disclaimer */}
          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-2 border-t border-stone-100">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>
              This complete home analysis is calculated for traditional spatial harmony. It does not replace professional structural engineering or architectural planning.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
