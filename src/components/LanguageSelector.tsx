import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown, Check } from 'lucide-react';
import {
  AppLanguage,
  LANGUAGE_OPTIONS,
  getPreferredLanguage,
  setPreferredLanguage,
  subscribeLanguageChange,
  getLocalizedLabels,
} from '../services/languageService';

interface LanguageSelectorProps {
  variant?: 'compact' | 'dropdown' | 'inline' | 'header' | 'buttons';
  className?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  value?: AppLanguage;
  onChange?: (lang: AppLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
  showLabel = true,
  showIcon = true,
  value,
  onChange,
}) => {
  const [internalLang, setInternalLang] = useState<AppLanguage>(getPreferredLanguage);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    openUpwards: boolean;
    width: number;
  }>({ top: 0, left: 0, openUpwards: false, width: 190 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = value !== undefined ? value : internalLang;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsub = subscribeLanguageChange((newLang) => {
      setInternalLang(newLang);
    });
    return () => unsub();
  }, []);

  // Update dynamic portal positioning anchored to button
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Standard dropdown width
    const targetWidth = Math.min(200, viewportWidth - 16);
    const estimatedHeight = 175;
    const margin = 8;

    // Vertical positioning
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top = openUpwards ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    // Clamp to viewport vertically
    top = Math.max(margin, Math.min(top, viewportHeight - estimatedHeight - margin));

    // Horizontal positioning: align with right edge of button if possible
    let left = rect.right - targetWidth;

    // Clamp horizontally to avoid clipping on narrow mobile screens (320px - 430px)
    if (left < margin) {
      left = margin;
    }
    if (left + targetWidth > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - targetWidth - margin);
    }

    setDropdownCoords({
      top: Math.round(top),
      left: Math.round(left),
      openUpwards,
      width: targetWidth,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (lang: AppLanguage) => {
    setPreferredLanguage(lang);
    setInternalLang(lang);
    onChange?.(lang);
    setIsOpen(false);
  };

  const activeOption = LANGUAGE_OPTIONS.find((opt) => opt.code === currentLang) || LANGUAGE_OPTIONS[0];
  const t = getLocalizedLabels(currentLang);

  // Variant: Segmented Buttons (Great for inline form controls)
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 border border-stone-200/80 ${className}`}>
        {showIcon && <Globe className="w-3.5 h-3.5 text-stone-500 ml-1.5 shrink-0" />}
        <div className="flex items-center gap-1 w-full">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.code === currentLang;
            const displayLabel = opt.code === 'hi' ? 'Hindi' : opt.label;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80 font-bold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <span>{displayLabel}</span>
                {opt.badge && (
                  <span className={`text-[9px] px-1 py-0.2 rounded-sm font-semibold ${isSelected ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-600'}`}>
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant: Simple Native Select (Accessible & Lightweight)
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 ${className}`}>
        {showLabel && <span className="text-stone-500 font-medium">{t.selectorLabel}</span>}
        <div className="relative inline-block">
          <select
            id="vastu-language-select"
            value={currentLang}
            onChange={(e) => handleSelect(e.target.value as AppLanguage)}
            className="appearance-none bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 text-xs font-bold py-1 pl-2.5 pr-6 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 cursor-pointer transition-colors"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.code === 'hi' ? 'Hindi (हिंदी)' : opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-stone-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    );
  }

  // Dropdown Content rendered via Portal to document.body to prevent clipping by headers/drawers
  const dropdownPortal = isOpen && mounted && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 pointer-events-none z-[99999]">
          {/* Backdrop for click outside */}
          <div
            className="fixed inset-0 pointer-events-auto bg-black/10 transition-opacity"
            onClick={() => setIsOpen(false)}
            onTouchStart={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Dropdown Card */}
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
            }}
            className="pointer-events-auto bg-white rounded-2xl border border-stone-200/90 shadow-2xl p-1.5 z-[99999] animate-in fade-in zoom-in-95 duration-150"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 flex items-center justify-between mb-1">
              <span>Language (भाषा)</span>
              <span className="text-[9px] font-normal text-amber-700 bg-amber-50 px-1 py-0.2 rounded">Gemini AI</span>
            </div>

            <div className="space-y-0.5">
              {LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = opt.code === currentLang;
                const primaryTitle = opt.code === 'hi' ? 'Hindi' : opt.label;
                const secondaryTitle = opt.code === 'hi' ? 'हिंदी' : opt.code === 'hinglish' ? 'Hinglish' : 'English';

                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSelect(opt.code)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer select-none active:scale-[0.98] ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/60'
                        : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
                    }`}
                    role="menuitem"
                  >
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 text-xs">
                          {primaryTitle}
                        </span>
                        {opt.code === 'hi' && (
                          <span className="text-[10px] text-stone-500 font-medium">
                            ({secondaryTitle})
                          </span>
                        )}
                        {opt.badge && (
                          <span className="text-[9px] px-1 py-0.2 rounded-sm bg-amber-100 text-amber-800 font-bold">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 font-normal">
                        {opt.code === 'hi'
                          ? 'शुद्ध हिंदी परामर्श'
                          : opt.code === 'hinglish'
                          ? 'Mixed Hindi + English'
                          : 'Full English Guidance'}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 ml-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // Variant: Header or Compact Dropdown
  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div className="flex items-center gap-1">
        {showLabel && (
          <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">
            {t.selectorLabel}
          </span>
        )}
        <button
          ref={buttonRef}
          type="button"
          id="vastu-language-btn"
          onClick={() => {
            if (!isOpen) {
              updatePosition();
            }
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-stone-200 bg-white hover:bg-amber-50/70 hover:border-amber-300 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer focus:outline-hidden active:scale-98"
          title="Change Response Language (भाषा चुनें)"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {showIcon && <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span className="font-semibold text-stone-900">{activeOption.label}</span>
          <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {dropdownPortal}
    </div>
  );
};

