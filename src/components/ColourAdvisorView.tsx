import React, { useState } from 'react';
import { Palette, Sparkles, Upload, Check, Compass, Info, ArrowRight } from 'lucide-react';
import { ROOM_COLOR_PALETTES, DIRECTION_NAMES } from '../data/vastuKnowledge';
import { CardinalDirection } from '../types';
import { CompassModal } from './CompassModal';

interface ColourAdvisorViewProps {
  onAskAi: (query: string) => void;
}

export const ColourAdvisorView: React.FC<ColourAdvisorViewProps> = ({ onAskAi }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('Bedroom');
  const [roomDirection, setRoomDirection] = useState<CardinalDirection>('SW');
  const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

  const palettes = ROOM_COLOR_PALETTES[selectedRoom] || ROOM_COLOR_PALETTES['Bedroom'];

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedPhoto(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <Palette className="w-3.5 h-3.5 text-amber-600" />
          Vastu Chromotherapy & Mood Harmonizer
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900">
          Room Wall Colour Advisor
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Choose the right colors based on room function, elemental balance, and daylight direction according to traditional Vastu.
        </p>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Room Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Select Room:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(ROOM_COLOR_PALETTES).map((rm) => (
                <button
                  key={rm}
                  type="button"
                  onClick={() => setSelectedRoom(rm)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    selectedRoom === rm
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  {rm}
                </button>
              ))}
            </div>
          </div>

          {/* Direction Picker */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Room Window / Wall Direction:
            </label>
            <button
              type="button"
              onClick={() => setIsCompassOpen(true)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600" />
                Facing: {DIRECTION_NAMES[roomDirection]?.name || roomDirection} ({roomDirection})
              </span>
              <span className="text-[11px] text-amber-700 underline">Change</span>
            </button>
          </div>
        </div>

        {/* Optional Photo Test */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-stone-500">
            Want AI to evaluate your existing wall lighting and furniture tones?
          </span>
          <label className="px-4 py-2 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            {uploadedPhoto ? 'Photo Uploaded ✓' : 'Upload Wall Photo'}
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </label>
        </div>
      </div>

      {/* Recommended Palettes Cards */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-base text-stone-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          Harmonious Palettes for {selectedRoom} ({DIRECTION_NAMES[roomDirection]?.name || roomDirection} Facing)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {palettes.map((c, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Color Swatch Preview */}
                <div
                  className="h-28 w-full border-b border-stone-100 flex items-end p-3"
                  style={{ backgroundColor: c.hex }}
                >
                  <span className="px-2 py-0.5 rounded-md bg-stone-900/70 text-white text-[10px] font-bold backdrop-blur-xs">
                    {c.hex}
                  </span>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 text-sm">{c.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {c.vastuMatch}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{c.desc}</p>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border-t border-stone-100 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onAskAi(
                      `Mujhe ${selectedRoom} ke liye "${c.name}" wall colour ke Vastu rules aur furniture combination ke baare mein aur bataiye.`
                    )
                  }
                  className="text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1"
                >
                  Ask AI Details <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Colours to Avoid section */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs text-amber-950">
        <div className="font-bold text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600" />
          Colours generally avoided in {selectedRoom} according to traditional Vastu:
        </div>
        <p className="leading-relaxed">
          {selectedRoom === 'Bedroom'
            ? 'Deep fiery red, dark blood crimson, and stark black. These colors stimulate excess heat and adrenaline, disrupting restful delta-wave sleep.'
            : selectedRoom === 'Kitchen'
            ? 'Stark dark blues or black tones, as they represent the Water/Saturn element directly clashing with the fire stove (Agni element).'
            : 'Avoid completely dark, gloomy monotone palettes that absorb natural sunlight. Ensure at least one wall reflects soft ambient daylight.'}
        </p>
      </div>

      <CompassModal
        isOpen={isCompassOpen}
        onClose={() => setIsCompassOpen(false)}
        currentValue={roomDirection}
        purposeLabel="wall colour lighting"
        onSelectDirection={(dir) => setRoomDirection(dir)}
      />
    </div>
  );
};
