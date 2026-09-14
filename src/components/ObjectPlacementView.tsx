import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  Camera,
  MessageSquare,
  ArrowRight,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { COMMON_OBJECTS_LIST, DIRECTION_NAMES } from '../data/vastuKnowledge';
import { CardinalDirection } from '../types';

interface ObjectPlacementViewProps {
  onAskAi: (query: string) => void;
  onUploadPhotoForObject: (objectName: string) => void;
}

const OBJECT_GUIDELINES: Record<
  string,
  {
    bestWall: string;
    bestDirections: CardinalDirection[];
    doRule: string;
    dontRule: string;
    remedy: string;
  }
> = {
  'Wall Clock': {
    bestWall: 'North or East Wall',
    bestDirections: ['N', 'E'],
    doRule: 'Hang in working condition on North (wealth) or East (progress) wall.',
    dontRule: 'Never hang directly above any room entrance or main gate. Avoid stopped clocks.',
    remedy: 'If placed on South, shift to North or East; keep glass clean and ticking.',
  },
  Mirror: {
    bestWall: 'North or East Wall',
    bestDirections: ['N', 'E'],
    doRule: 'Place high enough to reflect light entering the room.',
    dontRule: 'Never reflect the bed directly while sleeping, nor the main door entryway.',
    remedy: 'Cover mirror at night with a soft curtain or shift to inside wardrobe door.',
  },
  Bed: {
    bestWall: 'South or West Solid Wall',
    bestDirections: ['S', 'E'],
    doRule: 'Head towards South or East for grounded, magnetic alignment during sleep.',
    dontRule: 'Do not sleep with head toward North (causes restlessness and geomagnetic strain).',
    remedy: 'Rotate mattress orientation so your head rests toward South or East.',
  },
  Sofa: {
    bestWall: 'South or West Wall',
    bestDirections: ['S', 'SW', 'W'],
    doRule: 'Heavy seating should be backed by solid structural walls.',
    dontRule: 'Avoid sitting facing South; face East or North while entertaining.',
    remedy: 'Arrange main sofa on South wall facing North toward TV / entrance.',
  },
  'TV / Entertainment Unit': {
    bestWall: 'South-East or East Wall',
    bestDirections: ['SE', 'E'],
    doRule: 'Electrical appliances sit naturally in the Agni (South-East) zone.',
    dontRule: 'Avoid placing in North-East corner (clutters the spiritual zone).',
    remedy: 'Keep cords neatly organized; turn off completely during sleep.',
  },
  'Stove / Cooktop': {
    bestWall: 'South-East Platform',
    bestDirections: ['SE'],
    doRule: 'Cook while facing East to invite morning sunlight and vitality.',
    dontRule: 'Do not place cooktop touching the water sink directly.',
    remedy: 'Keep a small wooden chopping board or herb pot between sink and stove.',
  },
  'Kitchen Sink': {
    bestWall: 'North-East Corner',
    bestDirections: ['NE', 'N'],
    doRule: 'Water drainage flows naturally towards North or North-East.',
    dontRule: 'Do not place directly under or adjacent to gas flame.',
    remedy: 'Ensure drains are cleaned regularly; keep a minimum 2-3 feet gap from burner.',
  },
  'Pooja Mandir': {
    bestWall: 'North-East (Ishan Kon)',
    bestDirections: ['NE', 'E', 'N'],
    doRule: 'Face East or North while praying; keep well-ventilated and illuminated.',
    dontRule: 'Never build underneath a staircase, shared toilet wall, or in bedroom.',
    remedy: 'Place mandir on a raised wooden platform in the North-East corner of living area.',
  },
  'Study Desk': {
    bestWall: 'East or North Facing Desk',
    bestDirections: ['E', 'N', 'NE'],
    doRule: 'Student faces East while studying to harness solar energy and memory retention.',
    dontRule: 'Do not sit with back facing an open doorway or directly under a sharp overhead beam.',
    remedy: 'Reposition desk so eyes naturally look East or North towards natural light.',
  },
  'Indoor Plants (Tulsi/Money Plant)': {
    bestWall: 'East or North Balcony / Window',
    bestDirections: ['E', 'N', 'NE'],
    doRule: 'Keep lush green leaves healthy; Holy Basil (Tulsi) flourishes in North-East.',
    dontRule: 'Avoid thorny plants like cactus inside living areas or bedrooms.',
    remedy: 'Remove dried yellow leaves regularly; place money plant in green pot in East.',
  },
  'Shoe Rack': {
    bestWall: 'South-West or North-West Outside Corridor',
    bestDirections: ['SW', 'NW', 'W'],
    doRule: 'Keep footwear enclosed in a closed cabinet, away from direct entrance sightline.',
    dontRule: 'Never place shoe rack in North-East or directly blocking main door swing.',
    remedy: 'Use a closed shoe cabinet; place slightly to the side of the entrance corridor.',
  },
  'Wardrobe / Heavy Almirah': {
    bestWall: 'South or West Wall',
    bestDirections: ['SW', 'S', 'W'],
    doRule: 'Heaviest furniture stabilizes the South-West corner of the room.',
    dontRule: 'Avoid placing heavy wardrobes in North or North-East (blocks light flow).',
    remedy: 'Push solid wooden almirahs against the South/West walls.',
  },
  'Water Fountain / Aquarium': {
    bestWall: 'North or North-East Zone',
    bestDirections: ['NE', 'N', 'E'],
    doRule: 'Moving clear water stimulates positive flow and financial vitality.',
    dontRule: 'Never place water features in bedroom or kitchen.',
    remedy: 'Keep water clean, circulating, and illuminated in living room North-East.',
  },
};

export const ObjectPlacementView: React.FC<ObjectPlacementViewProps> = ({
  onAskAi,
  onUploadPhotoForObject,
}) => {
  const [selectedObject, setSelectedObject] = useState<string>('Mirror');

  const guide = OBJECT_GUIDELINES[selectedObject] || {
    bestWall: 'North or East Wall',
    bestDirections: ['N', 'E'] as CardinalDirection[],
    doRule: 'Keep clean, organized, and balanced with natural room light.',
    dontRule: 'Avoid cluttering energy pathways or main walkways.',
    remedy: 'Check direction with compass and align with solid wall backing.',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Quick Object Placement Guide
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900">
          Where Should This Object Go?
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Select any household item to get precise wall placement, favorable cardinal directions, and simple non-structural fixes.
        </p>
      </div>

      {/* Object Selector Pills */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
          Select Household Item:
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_OBJECTS_LIST.map((obj) => (
            <button
              key={obj}
              type="button"
              onClick={() => setSelectedObject(obj)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedObject === obj
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-102'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              {obj}
            </button>
          ))}
        </div>
      </div>

      {/* Guidance Card for Selected Object */}
      <div className="bg-white rounded-3xl border border-amber-200/80 shadow-md overflow-hidden animate-in fade-in">
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Vastu Placement Rule
            </span>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900">
              {selectedObject} Placement
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Ideal Wall: <strong>{guide.bestWall}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUploadPhotoForObject(selectedObject)}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:border-amber-500 bg-white text-stone-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              Upload Photo of My {selectedObject}
            </button>
            <button
              type="button"
              onClick={() =>
                onAskAi(
                  `Mera ${selectedObject} kahan aur kis direction mein lagana chahiye? Details aur practical alternatives bataiye.`
                )
              }
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask AI
            </button>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-5">
          {/* Best Cardinal Directions */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Favorable Cardinal Directions:
            </div>
            <div className="flex flex-wrap gap-2">
              {guide.bestDirections.map((dir) => (
                <div
                  key={dir}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {DIRECTION_NAMES[dir]?.name || dir} ({dir})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Do & Don't */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                Recommended Practice (Do's)
              </div>
              <p className="text-emerald-950 leading-relaxed font-medium">{guide.doRule}</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                What to Avoid (Don'ts)
              </div>
              <p className="text-rose-950 leading-relaxed font-medium">{guide.dontRule}</p>
            </div>
          </div>

          {/* Practical Easy Remedy */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1 text-xs text-amber-950">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" />
              Practical Remedy (Agar shifting mushkil ho):
            </div>
            <p className="leading-relaxed font-medium">{guide.remedy}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
