import React, { useState } from 'react';
import {
  Camera,
  MessageSquare,
  Mic,
  Compass,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Search,
  Layers,
  Palette,
  Eye,
  Home,
} from 'lucide-react';
import { POPULAR_QUESTIONS, VASTU_CATEGORIES } from '../data/vastuKnowledge';

interface HomeDashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenCompass: () => void;
  onAskQuestion: (query: string) => void;
  onUploadPhotoForCategory: (categoryName: string) => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  onNavigate,
  onOpenCompass,
  onAskQuestion,
  onUploadPhotoForCategory,
}) => {
  const [quickInput, setQuickInput] = useState<string>('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      onAskQuestion(quickInput.trim());
    }
  };

  const quickCategories = [
    { name: 'Bedroom', icon: '🛏', sub: 'Bed orientation & sleep' },
    { name: 'Kitchen', icon: '🍳', sub: 'Stove & sink harmony' },
    { name: 'Main Door', icon: '🚪', sub: 'Gateway of energy' },
    { name: 'Mirror', icon: '🪞', sub: 'Reflection & lighting' },
    { name: 'Wall Clock', icon: '🕐', sub: 'Time flow & direction' },
    { name: 'Pooja Area', icon: '🛕', sub: 'Peace & sacred energy' },
    { name: 'Bathroom', icon: '🚿', sub: 'Water drainage balance' },
    { name: 'Wall Colour', icon: '🎨', sub: 'Room chromotherapy' },
  ];

  return (
    <div className="space-y-10 sm:space-y-12 pb-16 max-w-5xl w-full mx-auto min-w-0 overflow-hidden">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-amber-500/10 via-amber-100/20 to-stone-50/50 p-4 sm:p-10 border border-amber-200/80 shadow-xs">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Vastu Shastra Powered by Gemini AI Vision</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-extrabold text-stone-900 tracking-tight leading-tight">
            Ghar ki Vastu Problem?
            <span className="block text-amber-700 text-xl sm:text-3xl font-bold mt-1">
              Photo bhejiye ya sawaal poochhiye.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl mx-auto">
            Room, wall, mirror, clock, bedroom, kitchen, bathroom ya main door ki photo upload karein aur AI se personalized, practical Vastu solution paaiye.
          </p>

          {/* 3 Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              id="hero-camera-action-btn"
              onClick={() => onNavigate('photo-analysis')}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all active:scale-98"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Click or Upload Photo</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all active:scale-98"
            >
              <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ask AI Question</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="px-4 py-2.5 sm:py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-98"
            >
              <Mic className="w-4 h-4 shrink-0" />
              <span>Ask Voice</span>
            </button>
          </div>
        </div>

        {/* Floating Quick Ask Input inside Hero */}
        <div className="max-w-xl mx-auto mt-6 sm:mt-8">
          <form
            onSubmit={handleQuickSubmit}
            className="relative flex items-center rounded-2xl bg-white shadow-md border border-stone-200 p-1.5 focus-within:ring-2 focus-within:ring-amber-500/30"
          >
            <Search className="w-4 h-4 text-stone-400 ml-2.5 sm:ml-3 shrink-0" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder='e.g. "Mirror facing bed", "Wall clock direction"...'
              className="w-full min-w-0 px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-transparent border-none focus:outline-hidden text-stone-900 placeholder:text-stone-400"
            />
            <button
              type="submit"
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Ask
            </button>
          </form>
        </div>
      </section>

      {/* "What do you want to check today?" Category Quick Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-stone-900">
              What do you want to check today?
            </h2>
            <p className="text-xs text-stone-500">
              Select any zone to get direct placement guidelines or upload a photo
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 shrink-0"
          >
            All 20 Categories <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {quickCategories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => onUploadPhotoForCategory(cat.name)}
              className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl mb-2 inline-block group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <h3 className="font-heading font-bold text-sm text-stone-900 group-hover:text-amber-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">{cat.sub}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-amber-700 font-bold">
                <span>Check Vastu</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guided Workflows Feature Highlight Banner */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: 5-Step Scan Room */}
        <div
          onClick={() => onNavigate('scan-room')}
          className="p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 hover:border-amber-400 cursor-pointer shadow-2xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-stone-900">
              Scan My Room (5-Step Auditor)
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Step-by-step room analyzer. Detects items automatically and only asks for direction confirmation when strictly required.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-amber-800 gap-1.5 pt-1">
            <span>Start Guided Scan</span> <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Complete Home Project Audit */}
        <div
          onClick={() => onNavigate('complete-home')}
          className="p-6 rounded-3xl bg-gradient-to-br from-stone-900 to-stone-950 text-white border border-stone-800 hover:border-amber-500 cursor-pointer shadow-2xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Home className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white">
              Complete Home Project Scan
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Audit the whole home (Entrance, Kitchen, Bedrooms, Pooja space). Generates an overall harmony score and non-destructive action plan.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-amber-400 gap-1.5 pt-1">
            <span>Audit Full House</span> <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Try Popular Vastu Questions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-xl text-stone-900">
            Popular Questions Answered Instantly
          </h2>
          <span className="text-xs text-stone-500">Tap to ask AI</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {POPULAR_QUESTIONS.slice(0, 6).map((pq) => (
            <div
              key={pq.id}
              onClick={() => onAskQuestion(pq.question)}
              className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-400 cursor-pointer transition-all space-y-2 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  {pq.category}
                </span>
                <h4 className="font-semibold text-xs sm:text-sm text-stone-900 leading-snug">
                  {pq.question}
                </h4>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                  {pq.shortAnswer}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-amber-700 font-bold">
                <span>Ask AI Advisor</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200/80 space-y-6">
        <div className="text-center space-y-1">
          <h3 className="font-heading font-bold text-xl text-stone-900">How VastuVision AI Works</h3>
          <p className="text-xs text-stone-500">
            Modern artificial intelligence grounded in classical Indian spatial principles
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-heading font-extrabold text-sm">
              1
            </div>
            <h4 className="font-bold text-stone-900 text-sm">Upload Photo ya Sawaal</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Take a picture of your bedroom, kitchen stove, mirror, or ask a question in Hindi, Hinglish, or English.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-heading font-extrabold text-sm">
              2
            </div>
            <h4 className="font-bold text-stone-900 text-sm">AI Visual & Direction Check</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Gemini Vision identifies objects and room layout. If direction is critical, calibrate easily using the built-in phone compass.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-heading font-extrabold text-sm">
              3
            </div>
            <h4 className="font-bold text-stone-900 text-sm">Practical Non-Structural Fixes</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Receive gentle, constructive suggestions: shifting decor, curtain remedies, or lighting balance—no demolition required.
            </p>
          </div>
        </div>
      </section>

      {/* Traditional Culture & Safety Notice */}
      <section className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <div className="font-bold text-amber-900">VastuVision AI Philosophy & Peace of Mind</div>
          <p className="text-stone-700">
            We celebrate Indian Vastu as a harmonious philosophy of light, ventilation, and spatial rhythm. We strictly reject fear-mongering and fatalistic claims. Every recommendation is designed to bring calm and practical comfort to your living space.
          </p>
        </div>
      </section>
    </div>
  );
};
