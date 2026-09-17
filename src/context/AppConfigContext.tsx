import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface PublicPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  description: string;
  features: string[];
  badge?: string;
  featured?: boolean;
  promotionalPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
  limits: {
    questionsPerMonth: number;
    photosPerMonth: number;
    roomScansPerMonth: number;
    completeHomeScan: boolean;
    pdfReports: boolean;
  };
}

export interface PublicQuestion {
  id: string;
  query: string;
  category: string;
  displayOrder: number;
}

export interface PublicCategory {
  id: string;
  name: string;
  type: 'room' | 'object' | 'vastu';
  icon: string;
  description: string;
  displayOrder: number;
  featured?: boolean;
}

export interface PublicNotification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'maintenance' | 'feature' | 'promotion' | 'update';
  dismissible: boolean;
}

export interface PublicFeatureFlags {
  aiChat: boolean;
  photoAnalysis: boolean;
  cameraCapture: boolean;
  voiceInput: boolean;
  compass: boolean;
  completeHomeScan: boolean;
  pdfReport: boolean;
  aiProactiveScan: boolean;
  seoPages: boolean;
  premiumPlans: boolean;
  coupons: boolean;
  notifications: boolean;
}

export interface PublicAppConfig {
  appName: string;
  supportEmail: string;
  contactPhone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  plans: PublicPlan[];
  usageLimits: any;
  popularQuestions: PublicQuestion[];
  categories: PublicCategory[];
  featureFlags: PublicFeatureFlags;
  notifications: PublicNotification[];
  reportSettings: {
    title: string;
    disclaimer: string;
    footer: string;
  };
}

interface AppConfigContextType {
  config: PublicAppConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  validateCoupon: (code: string, planId?: string) => Promise<{ valid: boolean; coupon?: any; error?: string }>;
}

const DEFAULT_CONFIG: PublicAppConfig = {
  appName: 'Ghar Ghar Vastu',
  supportEmail: 'support@ghargharvastu.com',
  contactPhone: '+91 98765 43210',
  maintenanceMode: false,
  maintenanceMessage: 'We’re improving your AI Vastu experience. Please try again shortly.',
  plans: [
    {
      id: 'free',
      name: 'Free Starter',
      price: 0,
      currency: '₹',
      billingPeriod: 'forever',
      description: 'Basic AI guidance for casual queries',
      features: ['5 AI questions per day', '3 photo analyses per month', 'Compass direction helper'],
      limits: { questionsPerMonth: 150, photosPerMonth: 3, roomScansPerMonth: 1, completeHomeScan: false, pdfReports: false },
    },
    {
      id: 'pro',
      name: 'Pro Advisor',
      price: 99,
      currency: '₹',
      billingPeriod: 'month',
      description: 'Comprehensive home guidance with photo audits',
      features: ['50 AI questions/month', '20 photo analyses/month', 'Non-structural remedies', 'PDF Scorecard'],
      featured: true,
      badge: 'Popular',
      originalPrice: 199,
      discountPercentage: 50,
      limits: { questionsPerMonth: 50, photosPerMonth: 20, roomScansPerMonth: 10, completeHomeScan: false, pdfReports: true },
    },
    {
      id: 'expert',
      name: 'Home Expert Suite',
      price: 299,
      currency: '₹',
      billingPeriod: 'month',
      description: 'Complete house scan & personalized project report',
      features: ['Unlimited/High-capacity AI queries', 'Complete Home multi-room project scan', 'Master Vastu Dossier'],
      badge: 'Best Value',
      originalPrice: 499,
      discountPercentage: 40,
      limits: { questionsPerMonth: 500, photosPerMonth: 100, roomScansPerMonth: 50, completeHomeScan: true, pdfReports: true },
    },
  ],
  usageLimits: {
    freeQuestionsPerDay: 5,
    freePhotosPerMonth: 3,
    maxImageSizeMB: 15,
  },
  popularQuestions: [
    { id: 'pq_1', query: 'Wall clock kis direction mein lagani chahiye?', category: 'Wall Clock', displayOrder: 1 },
    { id: 'pq_2', query: 'Bedroom mein mirror kahan hona chahiye?', category: 'Mirror', displayOrder: 2 },
    { id: 'pq_3', query: 'Kitchen stove aur sink placement Vastu rules', category: 'Kitchen', displayOrder: 3 },
    { id: 'pq_4', query: 'Bed kis direction mein rakhna chahiye for best sleep?', category: 'Bed', displayOrder: 4 },
  ],
  categories: [
    { id: 'cat_bedroom', name: 'Bedroom', type: 'room', icon: 'Bed', description: 'Sleeping direction and serenity', displayOrder: 1 },
    { id: 'cat_kitchen', name: 'Kitchen', type: 'room', icon: 'Flame', description: 'Agni corner and elemental balance', displayOrder: 2 },
    { id: 'cat_door', name: 'Main Door', type: 'room', icon: 'DoorOpen', description: 'Prana entrance threshold', displayOrder: 3 },
    { id: 'cat_clock', name: 'Wall Clock', type: 'object', icon: 'Clock', description: 'North & East wall timepieces', displayOrder: 4 },
  ],
  featureFlags: {
    aiChat: true,
    photoAnalysis: true,
    cameraCapture: true,
    voiceInput: true,
    compass: true,
    completeHomeScan: true,
    pdfReport: true,
    aiProactiveScan: true,
    seoPages: true,
    premiumPlans: true,
    coupons: true,
    notifications: true,
  },
  notifications: [],
  reportSettings: {
    title: 'VastuVision Architectural Harmony Report',
    disclaimer: 'Guidance based on traditional Vedic principles and modern lifestyle architecture.',
    footer: 'Confidential & Personalized • Generated with VastuVision AI',
  },
};

const AppConfigContext = createContext<AppConfigContextType>({
  config: DEFAULT_CONFIG,
  loading: false,
  error: null,
  refreshConfig: async () => {},
  validateCoupon: async () => ({ valid: false, error: 'Not initialized' }),
});

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicAppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config/public');
      if (res.ok) {
        const data = await res.json();
        // Harmonize structure
        const harmonized: PublicAppConfig = {
          appName: data.appName || data.settings?.appName || DEFAULT_CONFIG.appName,
          supportEmail: data.supportEmail || data.settings?.supportEmail || DEFAULT_CONFIG.supportEmail,
          contactPhone: data.contactPhone || data.settings?.contactPhone || DEFAULT_CONFIG.contactPhone,
          maintenanceMode: data.maintenanceMode !== undefined ? data.maintenanceMode : Boolean(data.settings?.maintenanceMode),
          maintenanceMessage: data.maintenanceMessage || data.settings?.maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage,
          plans: Array.isArray(data.plans) && data.plans.length > 0 ? data.plans : DEFAULT_CONFIG.plans,
          usageLimits: data.usageLimits || data.limits || DEFAULT_CONFIG.usageLimits,
          popularQuestions: Array.isArray(data.popularQuestions) && data.popularQuestions.length > 0 ? data.popularQuestions : DEFAULT_CONFIG.popularQuestions,
          categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : DEFAULT_CONFIG.categories,
          featureFlags: data.featureFlags ? { ...DEFAULT_CONFIG.featureFlags, ...data.featureFlags } : DEFAULT_CONFIG.featureFlags,
          notifications: Array.isArray(data.notifications) ? data.notifications : (data.activeNotification ? [data.activeNotification] : []),
          reportSettings: data.reportSettings || DEFAULT_CONFIG.reportSettings,
        };
        setConfig(harmonized);
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch app configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const validateCoupon = useCallback(async (code: string, planId?: string) => {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, planId }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { valid: false, error: 'Failed to validate coupon' };
    }
  }, []);

  return (
    <AppConfigContext.Provider
      value={{
        config,
        loading,
        error,
        refreshConfig: fetchConfig,
        validateCoupon,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => useContext(AppConfigContext);
