/**
 * VastuVision AI Multi-Language Service
 *
 * Provides centralized language management and localization for:
 * 1. हिंदी (Hindi - Default for Indian audience)
 * 2. Hinglish (Conversational Romanized Hindi + familiar English)
 * 3. English (Clear, accessible English)
 *
 * Ensures:
 * - Persistent language preference in localStorage and user profile
 * - Reactive listener pattern so UI updates instantly across all views
 * - Server synchronization with all AI endpoints
 * - Natural Indian Hindi phrasing without machine-translation artifacts
 */

export type AppLanguage = 'hi' | 'hinglish' | 'en';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  badge?: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'hi', label: 'हिंदी', nativeLabel: 'हिंदी (Hindi)', badge: 'Default' },
  { code: 'hinglish', label: 'Hinglish', nativeLabel: 'Hinglish' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

export const DEFAULT_LANGUAGE: AppLanguage = 'hi';

const STORAGE_KEY = 'vv_preferred_language';

type LanguageListener = (lang: AppLanguage) => void;
const listeners = new Set<LanguageListener>();

/**
 * Gets the current preferred language from storage, defaulting to 'hi' (Hindi).
 */
export function getPreferredLanguage(): AppLanguage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'hinglish' || saved === 'en') {
        return saved;
      }
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Sets the active language, notifies all listeners, and optionally syncs with server.
 */
export function setPreferredLanguage(lang: AppLanguage): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    // ignore
  }

  // Notify all subscribed components
  listeners.forEach((listener) => {
    try {
      listener(lang);
    } catch (e) {
      console.error('[LanguageService] listener error:', e);
    }
  });

  // Sync with server user profile if logged in
  try {
    const token = localStorage.getItem('vv_auth_token');
    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
      authHeaders['x-session-token'] = token;
    }
    const userId = localStorage.getItem('vv_user_id');
    if (userId) {
      authHeaders['x-user-id'] = userId;
    }
    fetch('/api/user/language', {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders,
      body: JSON.stringify({ language: lang }),
    }).catch(() => {});
  } catch {
    // non-blocking
  }
}

/**
 * Subscribes a callback to language change events. Returns an unsubscribe function.
 */
export function subscribeLanguageChange(listener: LanguageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const onLanguageChange = subscribeLanguageChange;

/**
 * Localized structured UI labels for Photo Analysis, Room Scan, Complete Home Scan, and Reports.
 */
export interface LocalizationLabels {
  selectorLabel: string;
  languageSelectorTitle: string;
  visualAnalysis: string;
  traditionalObservation: string;
  proactiveReviews: string;
  issuesFound: string;
  nonStructuralFirst: string;
  recommendedAction: string;
  easyAlternatives: string;
  directionCheck: string;
  directionMatters: string;
  directionCalibrationPrompt: string;
  confidence: string;
  primaryRecommendation: string;
  disclaimerTitle: string;
  continueInChat: string;
  saveCard: string;
  saved: string;
  shareCard: string;
  copied: string;
  openCompass: string;
  retryAnalysis: string;
  analyzePhotoBtn: string;
  analyzingLabel: string;
  loadingPhoto: string;
  loadingRoom: string;
  loadingVastu: string;
  loadingSolution: string;
  roomTypeLabel: string;
  specificQuestionLabel: string;
  wallDirectionLabel: string;
  // Complete home audit labels
  overallScoreTitle: string;
  positiveAreas: string;
  areasToReview: string;
  priorityImprovements: string;
  roomBreakdown: string;
  executiveSummary: string;
  modifyRooms: string;
  // Chat labels
  chatGreeting: string;
  chatPlaceholder: string;
  sendBtn: string;
}

export const LOCALIZED_LABELS: Record<AppLanguage, LocalizationLabels> = {
  hi: {
    selectorLabel: 'भाषा:',
    languageSelectorTitle: 'AI विश्लेषण की भाषा',
    visualAnalysis: 'दृश्य विश्लेषण',
    traditionalObservation: 'पारंपरिक वास्तु अवलोकन',
    proactiveReviews: 'AI द्वारा संभावित समीक्षा',
    issuesFound: 'पहचानी गई समस्याएँ',
    nonStructuralFirst: 'गैर-संरचनात्मक उपाय पहले',
    recommendedAction: 'सुझाया गया कदम',
    easyAlternatives: 'आसान गैर-संरचनात्मक विकल्प',
    directionCheck: 'दिशा की जाँच',
    directionMatters: 'दिशा महत्वपूर्ण है',
    directionCalibrationPrompt: 'क्या दिशा जाँचने की आवश्यकता है?',
    confidence: 'विश्वास स्तर',
    primaryRecommendation: 'मुख्य उपयोगी सुझाव',
    disclaimerTitle: 'अस्वीकरण',
    continueInChat: 'AI चैट में आगे पूछें',
    saveCard: 'सुरक्षित करें',
    saved: 'सुरक्षित हो गया!',
    shareCard: 'कार्ड शेयर करें',
    copied: 'कॉपी हो गया!',
    openCompass: 'कम्पास खोलें',
    retryAnalysis: 'पुनः विश्लेषण करें',
    analyzePhotoBtn: 'वास्तुविज़न AI से फोटो जांचें',
    analyzingLabel: 'AI फोटो का विश्लेषण कर रहा है...',
    loadingPhoto: 'फोटो का दृश्य विश्लेषण हो रहा है...',
    loadingRoom: 'कमरे और सामान की पहचान की जा रही है...',
    loadingVastu: 'पारंपरिक वास्तु नियमों से मिलान हो रहा है...',
    loadingSolution: 'सरल, बिना तोड़-फोड़ के उपाय तैयार किए जा रहे हैं...',
    roomTypeLabel: 'कमरे का प्रकार (वैकल्पिक):',
    specificQuestionLabel: 'आपका विशिष्ट सवाल / समस्या (वैकल्पिक):',
    wallDirectionLabel: 'दीवार या कमरे की दिशा:',
    overallScoreTitle: 'समग्र वास्तु मार्गदर्शन स्कोर',
    positiveAreas: 'सकारात्मक क्षेत्र',
    areasToReview: 'समीक्षा योग्य क्षेत्र',
    priorityImprovements: 'प्राथमिक सुधार',
    roomBreakdown: 'कमरे के अनुसार विवरण',
    executiveSummary: 'वास्तु सारांश रिपोर्ट',
    modifyRooms: 'कमरे बदलें',
    chatGreeting: 'नमस्ते! मैं आपका AI वास्तु सलाहकार हूँ। आप घर के किसी भी वास्तु विषय पर सवाल पूछ सकते हैं या कमरे की फोटो भेज सकते हैं।',
    chatPlaceholder: 'वास्तु से जुड़ा अपना सवाल पूछें... (उदा: क्या इस दीवार पर आईना लगाना सही है?)',
    sendBtn: 'पूछें',
  },
  hinglish: {
    selectorLabel: 'Language:',
    languageSelectorTitle: 'AI Response Language',
    visualAnalysis: 'Visual Analysis (What AI sees)',
    traditionalObservation: 'Traditional Vastu Observation',
    proactiveReviews: 'AI Proactive Reviews',
    issuesFound: 'Issues Found for Review',
    nonStructuralFirst: 'Non-structural first',
    recommendedAction: 'Recommended Action',
    easyAlternatives: 'Easy Non-Structural Alternatives',
    directionCheck: 'Direction Check',
    directionMatters: 'Direction matters',
    directionCalibrationPrompt: 'Need Direction Calibration?',
    confidence: 'Confidence',
    primaryRecommendation: 'Primary Actionable Recommendation',
    disclaimerTitle: 'Disclaimer',
    continueInChat: 'Continue in AI Chat',
    saveCard: 'Save',
    saved: 'Saved!',
    shareCard: 'Share Card',
    copied: 'Copied!',
    openCompass: 'Open Compass',
    retryAnalysis: 'Retry Analysis',
    analyzePhotoBtn: 'Analyze Photo with VastuVision AI',
    analyzingLabel: 'Analyzing with Gemini Vision...',
    loadingPhoto: 'Analyzing photo visuals and angles...',
    loadingRoom: 'Detecting room type & objects...',
    loadingVastu: 'Reviewing traditional Vastu principles...',
    loadingSolution: 'Synthesizing non-structural remedies...',
    roomTypeLabel: 'Room Type (Optional):',
    specificQuestionLabel: 'Aapka Specific Sawaal / Problem (Optional):',
    wallDirectionLabel: 'Wall ya Room Direction:',
    overallScoreTitle: 'Overall Harmony Score',
    positiveAreas: 'Positive Areas',
    areasToReview: 'Areas to Review',
    priorityImprovements: 'Priority Improvements',
    roomBreakdown: 'Room-by-Room Breakdown',
    executiveSummary: 'Executive Summary Report',
    modifyRooms: 'Modify Rooms',
    chatGreeting: 'Namaste! Main aapka AI Vastu Advisor hoon. Aap ghar ki kisi bhi Vastu problem ke baare mein sawaal pooch sakte hain ya photo attach kar sakte hain.',
    chatPlaceholder: 'Poochiye apna Vastu sawaal... (e.g. Bed direction kya honi chahiye?)',
    sendBtn: 'Send',
  },
  en: {
    selectorLabel: 'Language:',
    languageSelectorTitle: 'AI Response Language',
    visualAnalysis: 'Visual Analysis (What AI sees)',
    traditionalObservation: 'Traditional Vastu Guidance',
    proactiveReviews: 'AI Proactive Reviews',
    issuesFound: 'Issues Found for Review',
    nonStructuralFirst: 'Non-structural remedies first',
    recommendedAction: 'Recommended Action',
    easyAlternatives: 'Easy Non-Structural Alternatives',
    directionCheck: 'Direction Check',
    directionMatters: 'Direction matters',
    directionCalibrationPrompt: 'Need Direction Calibration?',
    confidence: 'Confidence',
    primaryRecommendation: 'Primary Actionable Recommendation',
    disclaimerTitle: 'Disclaimer',
    continueInChat: 'Continue in AI Chat',
    saveCard: 'Save',
    saved: 'Saved!',
    shareCard: 'Share Card',
    copied: 'Copied!',
    openCompass: 'Open Compass',
    retryAnalysis: 'Retry Analysis',
    analyzePhotoBtn: 'Analyze Photo with VastuVision AI',
    analyzingLabel: 'Analyzing with Gemini Vision...',
    loadingPhoto: 'Analyzing visual composition & objects...',
    loadingRoom: 'Classifying room space & orientations...',
    loadingVastu: 'Applying traditional Vastu Shastra rules...',
    loadingSolution: 'Generating practical non-structural remedies...',
    roomTypeLabel: 'Room Type (Optional):',
    specificQuestionLabel: 'Specific Question or Concern (Optional):',
    wallDirectionLabel: 'Wall or Room Direction:',
    overallScoreTitle: 'Overall Harmony Score',
    positiveAreas: 'Positive Areas',
    areasToReview: 'Areas to Review',
    priorityImprovements: 'Priority Improvements',
    roomBreakdown: 'Room-by-Room Breakdown',
    executiveSummary: 'Executive Summary Report',
    modifyRooms: 'Modify Rooms',
    chatGreeting: 'Namaste! I am your AI Vastu Advisor. Feel free to ask any questions about your home layout, energy balance, or attach a photo.',
    chatPlaceholder: 'Ask your Vastu question... (e.g. Which direction should my bed face?)',
    sendBtn: 'Send',
  },
};

/**
 * Returns localized labels for the given or active language.
 */
export function getLocalizedLabels(lang?: AppLanguage): LocalizationLabels {
  const active = lang || getPreferredLanguage();
  return LOCALIZED_LABELS[active] || LOCALIZED_LABELS.hi;
}
