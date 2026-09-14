import React, { useState, useEffect } from 'react';
import { Compass, X, Check, Navigation, Info, ShieldAlert } from 'lucide-react';
import { CardinalDirection } from '../types';
import { DIRECTION_NAMES } from '../data/vastuKnowledge';

interface CompassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDirection: (dir: CardinalDirection) => void;
  currentValue?: CardinalDirection | null;
  purposeLabel?: string;
}

const CARDINALS: CardinalDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const CompassModal: React.FC<CompassModalProps> = ({
  isOpen,
  onClose,
  onSelectDirection,
  currentValue,
  purposeLabel = 'wall or object',
}) => {
  const [heading, setHeading] = useState<number>(0);
  const [detectedDirection, setDetectedDirection] = useState<CardinalDirection>(currentValue || 'N');
  const [selectedDirection, setSelectedDirection] = useState<CardinalDirection>(currentValue || 'N');
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

  // Convert degree to Cardinal
  const degreesToCardinal = (deg: number): CardinalDirection => {
    const normalized = (deg % 360 + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'N';
    if (normalized >= 22.5 && normalized < 67.5) return 'NE';
    if (normalized >= 67.5 && normalized < 112.5) return 'E';
    if (normalized >= 112.5 && normalized < 157.5) return 'SE';
    if (normalized >= 157.5 && normalized < 202.5) return 'S';
    if (normalized >= 202.5 && normalized < 247.5) return 'SW';
    if (normalized >= 247.5 && normalized < 292.5) return 'W';
    return 'NW';
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
    let deg: number | null = null;
    // iOS provides webkitCompassHeading
    if ((e as any).webkitCompassHeading !== undefined) {
      deg = (e as any).webkitCompassHeading;
    } else if (e.alpha !== null) {
      // Android / standard compass
      deg = 360 - e.alpha;
    }

    if (deg !== null && !isNaN(deg)) {
      setHeading(Math.round(deg));
      const card = degreesToCardinal(deg);
      setDetectedDirection(card);
      setSelectedDirection(card);
      setSensorActive(true);
      setPermissionState('granted');
    }
  };

  const requestCompassPermission = async () => {
    if (typeof window === 'undefined') return;

    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          setPermissionState('granted');
          setSensorActive(true);
        } else {
          setPermissionState('denied');
        }
      } catch (err) {
        setPermissionState('denied');
      }
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      setSensorActive(true);
      setPermissionState('granted');
    } else {
      setPermissionState('unsupported');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if ('ondeviceorientation' in window) {
      // Auto listen if no explicit iOS prompt needed
      if (typeof (DeviceOrientationEvent as any)?.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', handleOrientation, true);
        setSensorActive(true);
      }
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentInfo = (selectedDirection && DIRECTION_NAMES[selectedDirection]) || DIRECTION_NAMES['N'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-amber-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-orange-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-stone-900 leading-tight">
                Vastu Compass Checker
              </h3>
              <p className="text-xs text-stone-500">Direction for {purposeLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Practical instructions */}
          <div className="bg-amber-50/80 border border-amber-200/70 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5 leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              Direction kaise check karein:
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-amber-900">
              <li>Room ke <strong>centre mein khade ho jaiye</strong>.</li>
              <li>Phone ko us <strong>wall/object ki taraf point karein</strong> jiska direction check karna hai.</li>
              <li>Phone ko flat pakdein. Neeche manual selection se bhi choose kar sakte hain.</li>
            </ol>
          </div>

          {/* Compass Dial Display */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-56 h-56 rounded-full border-4 border-amber-200 bg-gradient-to-b from-stone-900 to-stone-950 shadow-inner flex items-center justify-center">
              {/* Outer tick marks */}
              <div className="absolute inset-2 rounded-full border border-dashed border-stone-700 flex items-center justify-center">
                {/* Degree labels on edges */}
                <span className="absolute top-1 text-[11px] font-bold text-red-400 tracking-wider">N 0°</span>
                <span className="absolute right-2 text-[11px] font-semibold text-stone-400">E 90°</span>
                <span className="absolute bottom-1 text-[11px] font-semibold text-stone-400">S 180°</span>
                <span className="absolute left-2 text-[11px] font-semibold text-stone-400">W 270°</span>
              </div>

              {/* Rotating needle container */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${-heading}deg)` }}
              >
                {/* Red North Needle */}
                <div className="w-2 h-20 bg-gradient-to-t from-red-600 to-red-400 rounded-t-full shadow-md shadow-red-500/50 -translate-y-10 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-red-400 -mt-2" />
                </div>
                {/* Silver South Needle */}
                <div className="w-2 h-20 bg-gradient-to-b from-stone-400 to-stone-600 rounded-b-full shadow-sm translate-y-10" />
                {/* Center Pivot */}
                <div className="absolute w-6 h-6 rounded-full bg-amber-400 border-2 border-stone-900 shadow-md z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
                </div>
              </div>

              {/* Center Direction Badge readout */}
              <div className="absolute z-20 bottom-3 px-3 py-1 rounded-full bg-stone-900/90 border border-stone-700 text-center shadow-lg">
                <div className="text-amber-400 font-bold text-sm tracking-wider">
                  {sensorActive ? `${heading}° ${detectedDirection}` : selectedDirection}
                </div>
              </div>
            </div>

            {/* iOS sensor permission button if needed */}
            {typeof (DeviceOrientationEvent as any)?.requestPermission === 'function' && permissionState !== 'granted' && (
              <button
                onClick={requestCompassPermission}
                className="mt-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                Calibrate Device Sensor (Auto-Detect)
              </button>
            )}
          </div>

          {/* Current Selection Summary Card */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-stone-900 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-700 font-semibold">Selected Direction</div>
              <div className="text-xl font-bold font-heading text-stone-900 flex items-center gap-2">
                <span>{currentInfo?.name || selectedDirection || 'North'}</span>
                <span className="text-xs font-normal text-stone-600">({currentInfo?.hindi || ''})</span>
              </div>
              <div className="text-xs text-amber-800/80 mt-0.5 font-medium">{currentInfo?.element || ''}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white font-heading font-extrabold text-xl flex items-center justify-center shadow-sm">
              {selectedDirection}
            </div>
          </div>

          {/* Manual Selection Fallback - Never blocks the user */}
          <div>
            <div className="text-xs font-semibold text-stone-600 mb-2 flex items-center justify-between">
              <span>Manual Direction Choose Karein (8 Directions):</span>
              <span className="text-[11px] text-stone-400">Click to override</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {CARDINALS.map((card) => {
                const isSelected = selectedDirection === card;
                return (
                  <button
                    key={card}
                    type="button"
                    onClick={() => {
                      setSelectedDirection(card);
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20 scale-102'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{card}</span>
                    <span className="text-[10px] font-normal opacity-85 truncate max-w-full">
                      {DIRECTION_NAMES[card]?.name || card}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectDirection(selectedDirection);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            Set Direction ({selectedDirection})
          </button>
        </div>
      </div>
    </div>
  );
};
