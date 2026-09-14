import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  User,
  Menu,
  X,
  Camera,
  MessageSquare,
  Search,
  Home,
  Palette,
  Layers,
  Crown,
  Zap,
} from 'lucide-react';
import { UserProfile, UserCreditAccount } from '../types';
import { creditService } from '../services/creditService';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenCompass: () => void;
  onOpenProfile: () => void;
  userProfile?: UserProfile;
  onTriggerAdminLogin: () => void;
  onOpenMonetization?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  onOpenCompass,
  onOpenProfile,
  userProfile,
  onTriggerAdminLogin,
  onOpenMonetization,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [creditAccount, setCreditAccount] = useState<UserCreditAccount | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initial fetch of credits
    creditService.fetchCredits().catch(() => {});
    const unsub = creditService.subscribe((account) => {
      setCreditAccount(account);
    });
    return () => {
      unsub();
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleLogoTap = () => {
    const now = Date.now();

    // Only consider taps within the configured 3-second window
    const activeTaps = tapTimesRef.current.filter((t) => now - t <= 3000);
    activeTaps.push(now);
    tapTimesRef.current = activeTaps;

    // Reset inactivity timer
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(() => {
      tapTimesRef.current = [];
    }, 3000);

    // If exactly 6 taps within 3 seconds, open Admin Login
    if (activeTaps.length >= 6) {
      tapTimesRef.current = [];
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      setMobileMenuOpen(false);
      onTriggerAdminLogin();
      return;
    }

    // Normal single tap navigates to home
    if (activeTaps.length === 1) {
      onNavigate('home');
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'photo-analysis', label: 'Upload Photo', icon: Camera },
    { id: 'scan-room', label: 'Scan Room', icon: Layers },
    { id: 'chat', label: 'Ask AI', icon: MessageSquare },
    { id: 'explore', label: 'Vastu Topics', icon: Search },
    { id: 'complete-home', label: 'Whole Home', icon: Home },
    { id: 'colour-advisor', label: 'Colours', icon: Palette },
    { id: 'object-advisor', label: 'Objects', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-1.5 sm:gap-4 min-w-0 w-full">
        {/* Brand Logo with 6-Tap Hidden Admin Trigger */}
        <div
          onClick={handleLogoTap}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group touch-manipulation min-w-0 shrink"
          title="VastuVision AI"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-white flex items-center justify-center font-heading font-extrabold text-lg sm:text-xl shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform shrink-0">
            V
          </div>
          <div className="min-w-0">
            <div className="font-heading font-extrabold text-base sm:text-lg text-stone-900 tracking-tight flex items-center gap-1 sm:gap-1.5 leading-none">
              <span className="truncate">VastuVision</span>
              <span className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold tracking-wide shrink-0">
                AI
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-stone-500 font-medium tracking-normal mt-0.5 truncate">
              Your AI Vastu Home Advisor
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tool Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Global Language Selector */}
          <div className="shrink-0">
            <LanguageSelector variant="compact" showIcon />
          </div>

          {/* Credit Balance Badge */}
          {onOpenMonetization && (
            <button
              type="button"
              onClick={onOpenMonetization}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-stone-900 transition-all text-xs font-bold shadow-2xs group"
              title="View Credits & Plans"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-mono font-black text-amber-950 text-[10px] sm:text-[11px] whitespace-nowrap">
                {creditAccount?.plan === 'expert'
                  ? 'Expert'
                  : `${creditAccount?.creditsBalance ?? 0} Cr`}
              </span>
            </button>
          )}

          {/* Compass Quick Shortcut */}
          <button
            type="button"
            onClick={onOpenCompass}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
            title="Open Vastu Compass"
          >
            <Compass className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span className="hidden md:inline">Compass</span>
          </button>

          {/* User Profile / Upgrade */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200 hover:border-amber-300 bg-white hover:bg-amber-50/50 transition-all text-xs font-semibold text-stone-800 shrink-0"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
              {userProfile?.tier === 'pro' ? (
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              ) : (
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              )}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <div className="text-[11px] font-bold text-stone-900 truncate max-w-[90px]">
                {userProfile?.name || 'User'}
              </div>
              <div className="text-[9px] text-amber-700 font-semibold uppercase">
                {userProfile?.tier || 'free'}
              </div>
            </div>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 shrink-0"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="p-2 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-600">AI Language:</span>
            <LanguageSelector variant="compact" showIcon />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-2 pt-1">
            Features & Views
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-900 font-bold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
