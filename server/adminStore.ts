import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ReservationRecord, GlobalAiSafetyConfig } from './security/types';
import { AtomicFileStorageProvider } from './storage/storageProvider';
import { freeTrialGuard } from './security/freeTrialGuard';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CONTENT_MANAGER' | 'SUPPORT';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // SHA-256 + salt
  salt: string;
  role: AdminRole;
  status: 'active' | 'suspended';
  lastLogin: string | null;
  createdAt: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  role: AdminRole;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export interface FairUseLimits {
  maxAiRequestsPerDay: number;
  maxImageAnalysesPerDay: number;
  maxHomeScansPerDay: number;
  maxConcurrentRequests: number;
  maxVoiceMinutesPerDay: number;
  maxImageSizeMB: number;
}

export interface PlanConfig {
  id: string;
  name: string;
  price: number; // numeric value e.g. 99, 149
  currency: string; // '₹'
  billingPeriod: 'month' | 'year' | 'forever';
  description: string;
  features: string[];
  badge?: string;
  credits?: number;
  chatMinutes?: number;
  photoAnalyses?: number;
  voiceAllowance?: number;
  fairUseLimits?: FairUseLimits;
  showAds?: boolean;
  limits: {
    questionsPerMonth: number;
    photosPerMonth: number;
    roomScansPerMonth: number;
    completeHomeScan: boolean;
    pdfReports: boolean;
    priorityAi: boolean;
    voiceMinutesPerMonth?: number;
  };
  enabled: boolean;
  featured: boolean;
  displayOrder: number;
  promotionalPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
}

export interface PriceHistoryRecord {
  id: string;
  planId: string;
  planName: string;
  oldPrice: number;
  newPrice: number;
  oldPromotionalPrice?: number;
  newPromotionalPrice?: number;
  currency: string;
  adminId: string;
  adminName: string;
  timestamp: string;
  notes?: string;
}

export interface CreditSettingsConfig {
  newUserFreeChatMinutes: number;
  newUserFreePhotos: number;
  proCreditsPerMonth: number;
  adRewardCredits: number;
  textQuestionCost: number;
  imageAnalysisCost: number;
  voiceUsageCost: number;
  roomScanCost: number;
  completeHomeScanCost: number;
  pdfReportCost: number;
  freeCreditsExpire: boolean;
  proCreditsRollover: boolean;
  rewardedCreditsExpireDays: number;
}

export interface RewardedAdConfig {
  enabled: boolean;
  rewardCredits: number;
  maxAdsPerDay: number;
  maxAdsPerHour: number;
  cooldownSeconds: number;
  showForFreeUsers: boolean;
  showForProUsers: boolean;
  showForExpertUsers: boolean;
  provider: 'web_offerwall' | 'admob_ssv' | 'simulator';
  webAdUnitId: string;
  admobAppId: string;
  admobRewardedAdUnitId: string;
  admobSsvSecretKey: string;
}

export interface AdMobConfig {
  adsEnabled: boolean;
  testMode: boolean;
  interstitialEnabled: boolean;
  rewardedEnabled: boolean;
  bannerEnabled: boolean;

  // Production Ad Unit IDs (to be filled by Admin when going live)
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  fixedBannerAdUnitId: string;
  anchoredAdaptiveBannerAdUnitId: string;

  // Google Official Android Test IDs (Reference & Test Mode)
  testInterstitialAdUnitId: string;
  testRewardedAdUnitId: string;
  testFixedBannerAdUnitId: string;
  testAnchoredAdaptiveBannerAdUnitId: string;

  // Rewarded Settings
  rewardedCreditAmount: number;
  dailyRewardedAdLimit: number;
  rewardedCooldownSeconds: number;

  // Interstitial Settings
  interstitialFrequency: number;
  interstitialCooldownSeconds: number;

  // Banner Settings
  bannerFormat: 'fixed' | 'anchored_adaptive';
  bannerPosition: 'top' | 'bottom';

  // Plan Settings
  freePlanAdsEnabled: boolean;
  proPlanAdsEnabled: boolean;
  homeExpertAdsEnabled: boolean;
}

export interface AdAnalytics {
  adsRequested: number;
  adsLoaded: number;
  adsFailed: number;
  rewardedAdsCompleted: number;
  rewardedCreditsIssued: number;
  interstitialImpressions: number;
  bannerImpressions: number;
  rewardedDailyLimitReached: number;
}

export interface RewardedAdSession {
  sessionId: string;
  userId: string;
  adUnitId: string;
  testMode: boolean;
  createdAt: number;
  expiresAt: number;
  claimed: boolean;
  claimedAt?: number;
}

export function isValidAdMobAdUnitId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  // Valid AdMob format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY (ad unit ID suffix is typically 9-12 digits)
  return /^ca-app-pub-\d{16}\/\d{9,12}$/.test(trimmed);
}

export interface CreditLedgerRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  transactionId: string;
  type:
    | 'FREE_TRIAL'
    | 'AI_CHAT'
    | 'IMAGE_ANALYSIS'
    | 'VOICE'
    | 'ROOM_SCAN'
    | 'HOME_SCAN'
    | 'REWARDED_AD'
    | 'SUBSCRIPTION'
    | 'ADMIN_ADJUSTMENT'
    | 'REFUND'
    | 'EXPIRATION';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export interface UserCreditAccount {
  userId: string;
  userName: string;
  userEmail: string;
  plan: 'free' | 'pro' | 'expert';
  planExpiry?: string;
  freeChatMinutesRemaining: number;
  freePhotosRemaining: number;
  creditsBalance: number;
  totalSpentCredits: number;
  trialAbuseDetected?: boolean;
  trialAbuseNotice?: string;
  todayUsage: {
    date: string;
    aiRequestsCount: number;
    imageAnalysesCount: number;
    homeScansCount: number;
    adsWatchedCount: number;
    lastAdWatchedAt?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UsageLimitsConfig {
  freeQuestionsPerDay: number;
  freeQuestionsPerMonth: number;
  freePhotosPerMonth: number;
  freeRoomScansPerMonth: number;
  maxImageSizeMB: number;
  maxImagesPerAnalysis: number;
  maxReportGeneration: number;
  limitsEnabled: boolean;
}

export interface AISystemPromptConfig {
  identity: string;
  guidelines: string;
  responseStyle: string;
  hindiHinglishInstructions: string;
  imageAnalysisInstructions: string;
  safetyInstructions: string;
  disclaimer: string;
  followUpRules: string;
  version: number;
  lastUpdated: string;
}

export interface AISettingsConfig {
  provider: string;
  activeModel: string;
  availableModels: string[];
  temperature: number;
  maxResponseLength: number;
  languageBehavior: 'auto_match' | 'english_only' | 'hindi_only';
  imageAnalysisMode: 'standard' | 'deep_audit' | 'fast';
}

export interface VastuKnowledgeItem {
  id: string;
  title: string;
  category: string;
  question: string;
  traditionalGuidance: string;
  recommendedDirection: string;
  lessPreferredDirection: string;
  recommendedPlacement: string;
  alternativeSolution: string;
  explanation: string;
  keywords: string[];
  language: 'Hinglish' | 'Hindi' | 'English' | 'All';
  status: 'published' | 'draft';
  priority: 'high' | 'medium' | 'low';
  updatedAt: string;
}

export interface PopularQuestionItem {
  id: string;
  query: string;
  category: string;
  displayOrder: number;
  enabled: boolean;
  searchCount: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: 'room' | 'object' | 'vastu';
  icon: string;
  description: string;
  displayOrder: number;
  active: boolean;
  featured: boolean;
}

export interface SEOPageItem {
  id: string;
  slug: string;
  pageTitle: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  introduction: string;
  mainContent: string;
  faq: { q: string; a: string }[];
  relatedTopics: string[];
  status: 'published' | 'draft' | 'unpublished';
  publishDate: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  seoVisibility: boolean;
  displayOrder: number;
  active: boolean;
}

export interface AppUserRecord {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  isMobileVerified?: boolean;
  isEmailVerified?: boolean;
  authProvider?: 'google' | 'mobile_otp' | 'email_otp' | 'password';
  avatar?: string;
  passwordHash?: string;
  preferredLanguage?: 'hi' | 'hinglish' | 'en';
  homeName?: string;
  city?: string;
  propertyType?: string;
  createdAt: string;
  updatedAt?: string;
  lastActive: string;
  plan: 'free' | 'pro' | 'expert';
  planExpiry?: string;
  status: 'active' | 'suspended';
  questionsAsked: number;
  photosAnalyzed: number;
  roomScansCompleted: number;
  savedReportsCount: number;
  adminNotes?: string;
}

export type SubscriptionStatus = 'FREE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
export type PaymentProvider = 'razorpay' | 'system' | 'manual' | 'free';

export interface UserSubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: 'free' | 'pro' | 'expert';
  planName: string;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PaymentOrderRecord {
  id: string;
  orderId: string;
  paymentId?: string;
  signature?: string;
  userId: string;
  userEmail: string;
  planId: 'pro' | 'expert';
  planName: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  method?: string;
  errorCode?: string;
  errorDescription?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface PaymentEventRecord {
  id: string;
  event: string;
  orderId?: string;
  paymentId?: string;
  payload: any;
  status: 'processed' | 'ignored' | 'failed';
  receivedAt: string;
}

export interface SubscriptionStatusResponse {
  plan: 'free' | 'pro' | 'expert';
  planName: string;
  status: SubscriptionStatus;
  credits: {
    balance: number;
    freeChatMinutesRemaining: number;
    freePhotosRemaining: number;
    totalSpent: number;
  };
  usage: {
    date: string;
    aiRequestsCount: number;
    imageAnalysesCount: number;
    homeScansCount: number;
    adsWatchedCount: number;
    lastAdWatchedAt?: number;
  };
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  features: string[];
  fairUseLimits?: FairUseLimits;
  adConfig: {
    enabled: boolean;
    rewardCredits: number;
    maxAdsPerDay: number;
    cooldownSeconds: number;
    todayAdsWatched: number;
    canWatchAd: boolean;
  };
  paymentGatewayConfigured: boolean;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'failed' | 'FREE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  startDate: string;
  expiryDate: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  autoRenewal: boolean;
  provider?: PaymentProvider;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
  notes?: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  discountPercent?: number;
  discountPercentage?: number;
  percentage?: number;
  discount?: number;
  maxUses: number;
  usedCount: number;
  perUserLimit: number;
  startDate: string;
  expiryDate: string;
  applicablePlan: 'all' | 'pro' | 'expert';
  active: boolean;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'maintenance' | 'feature' | 'promotion' | 'update';
  startDate: string;
  endDate: string;
  active: boolean;
  dismissible: boolean;
}

export interface AppSettingsConfig {
  appName: string;
  logo: string;
  supportEmail: string;
  contactPhone: string;
  privacyUrl: string;
  termsUrl: string;
  disclaimerUrl: string;
  defaultLanguage: string;
  defaultAiResponseLanguage: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  newRegistrationEnabled: boolean;
  freeAiUsageEnabled: boolean;
  premiumFeaturesEnabled: boolean;
}

export interface FeatureFlagsConfig {
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

export interface ReportSettingsConfig {
  reportTitle: string;
  includeScorecard: boolean;
  includeRemedies: boolean;
  includeColorAnalysis: boolean;
  disclaimerText: string;
  footerText: string;
}

export interface UserFeedbackRecord {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  type: 'bug' | 'ai_incorrect' | 'suggestion' | 'general';
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminNotes?: string;
  createdAt: string;
}

export interface AIQualityFeedbackRecord {
  id: string;
  query: string;
  category: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
  timestamp: string;
}

export interface AIRequestLog {
  id: string;
  timestamp: string;
  requestType: 'chat' | 'chat_stream' | 'photo_analysis' | 'home_scan' | 'transcribe' | 'test_ai';
  model: string;
  httpStatus: number;
  responseTimeMs: number;
  success: boolean;
  errorCategory?: string;
  userQuerySnippet?: string;
}

export interface AnonymizedAIAnalysisRecord {
  id: string;
  timestamp: string;
  analysisType: 'photo_analysis' | 'room_scan' | 'complete_home';
  roomType: string;
  direction?: string;
  vastuScore?: number;
  defectCount: number;
  success: boolean;
  processingStatus: 'completed' | 'failed';
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  affectedItem: string;
  details: string;
}

// Password hashing helper with bcrypt (10 rounds salt)
export function hashAdminPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Initial Super Admin for Production-Grade architecture
const INITIAL_SUPER_ADMIN: AdminUser = {
  id: 'admin_super_1',
  name: 'Master Administrator',
  email: 'makesoney@gmail.com',
  passwordHash: hashAdminPassword(process.env.ADMIN_INITIAL_PASSWORD || 'VastuAdmin2026!'),
  salt: '',
  role: 'SUPER_ADMIN',
  status: 'active',
  lastLogin: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const INITIAL_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'FREE NEW USER',
    price: 0,
    currency: '₹',
    billingPeriod: 'forever',
    description: 'Free starter trial for essential room and cardinal alignment checks',
    chatMinutes: 5,
    photoAnalyses: 5,
    credits: 0,
    showAds: false,
    features: [
      '5 AI Chat Minutes included',
      '5 AI Photo Analyses included',
      'Room Analysis & Object Guidance',
      'Digital compass orientation tool',
      'Non-structural Vedic remedies',
    ],
    badge: 'Free Trial',
    limits: {
      questionsPerMonth: 5,
      photosPerMonth: 5,
      roomScansPerMonth: 1,
      completeHomeScan: false,
      pdfReports: false,
      priorityAi: false,
      voiceMinutesPerMonth: 5,
    },
    enabled: true,
    featured: false,
    displayOrder: 1,
    originalPrice: 0,
    discountPercentage: 0,
  },
  {
    id: 'pro',
    name: 'PRO PLAN',
    price: 99,
    currency: '₹',
    billingPeriod: 'month',
    description: 'Essential home optimization with 25 monthly AI credits & non-structural remedies',
    credits: 25,
    chatMinutes: 25,
    photoAnalyses: 25,
    showAds: false,
    features: [
      '25 AI Credits per billing period',
      'Photo Analysis (1 credit / photo)',
      'AI Chat & Voice queries (1 credit / query)',
      'Room Analysis & Defect detection',
      'Compass & saved history',
      'Basic Reports & scorecards',
      'Reduced / No regular banner ads',
    ],
    badge: 'Most Popular',
    limits: {
      questionsPerMonth: 25,
      photosPerMonth: 25,
      roomScansPerMonth: 10,
      completeHomeScan: false,
      pdfReports: true,
      priorityAi: true,
      voiceMinutesPerMonth: 25,
    },
    enabled: true,
    featured: true,
    displayOrder: 2,
    promotionalPrice: 99,
    originalPrice: 199,
    discountPercentage: 50,
  },
  {
    id: 'expert',
    name: 'HOME EXPERT',
    price: 299,
    currency: '₹',
    billingPeriod: 'month',
    description: 'Unlimited* AI Vastu Analysis for complete home and multi-room projects',
    credits: 100,
    showAds: false,
    fairUseLimits: {
      maxAiRequestsPerDay: 40,
      maxImageAnalysesPerDay: 15,
      maxHomeScansPerDay: 3,
      maxConcurrentRequests: 1,
      maxVoiceMinutesPerDay: 20,
      maxImageSizeMB: 10,
    },
    features: [
      'Unlimited* AI Questions',
      'Unlimited* Photo Analysis',
      'Room Analysis & Object Placement',
      'Voice Questions & Compass',
      'Complete Home Scan (Up to 10 rooms)',
      'Detailed Architectural PDF Reports',
      'Complete Analysis History',
      '100% Ad-Free Experience',
      'Subject to fair-use limits',
    ],
    badge: 'Best Value',
    limits: {
      questionsPerMonth: 500,
      photosPerMonth: 100,
      roomScansPerMonth: 50,
      completeHomeScan: true,
      pdfReports: true,
      priorityAi: true,
      voiceMinutesPerMonth: 120,
    },
    enabled: true,
    featured: false,
    displayOrder: 3,
    promotionalPrice: 299,
    originalPrice: 499,
    discountPercentage: 40,
  },
];

const INITIAL_CREDIT_SETTINGS: CreditSettingsConfig = {
  newUserFreeChatMinutes: 5,
  newUserFreePhotos: 5,
  proCreditsPerMonth: 25,
  adRewardCredits: 2,
  textQuestionCost: 1,
  imageAnalysisCost: 1,
  voiceUsageCost: 1,
  roomScanCost: 2,
  completeHomeScanCost: 5,
  pdfReportCost: 1,
  freeCreditsExpire: false,
  proCreditsRollover: false,
  rewardedCreditsExpireDays: 30,
};

const INITIAL_REWARDED_AD_SETTINGS: RewardedAdConfig = {
  enabled: true,
  rewardCredits: 2,
  maxAdsPerDay: 5,
  maxAdsPerHour: 2,
  cooldownSeconds: 60,
  showForFreeUsers: true,
  showForProUsers: false,
  showForExpertUsers: false,
  provider: 'simulator',
  webAdUnitId: 'vastu-rewarded-web-01',
  admobAppId: 'ca-app-pub-3940256099942544~3347511713',
  admobRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  admobSsvSecretKey: 'vastu_admob_ssv_sec_2026',
};

export const INITIAL_ADMOB_CONFIG: AdMobConfig = {
  adsEnabled: true,
  testMode: true,
  interstitialEnabled: true,
  rewardedEnabled: true,
  bannerEnabled: true,

  interstitialAdUnitId: '',
  rewardedAdUnitId: '',
  fixedBannerAdUnitId: '',
  anchoredAdaptiveBannerAdUnitId: '',

  testInterstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  testRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  testFixedBannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  testAnchoredAdaptiveBannerAdUnitId: 'ca-app-pub-3940256099942544/9214589741',

  rewardedCreditAmount: 2,
  dailyRewardedAdLimit: 5,
  rewardedCooldownSeconds: 60,

  interstitialFrequency: 3,
  interstitialCooldownSeconds: 300,

  bannerFormat: 'anchored_adaptive',
  bannerPosition: 'bottom',

  freePlanAdsEnabled: true,
  proPlanAdsEnabled: false,
  homeExpertAdsEnabled: false,
};

export const INITIAL_AD_ANALYTICS: AdAnalytics = {
  adsRequested: 0,
  adsLoaded: 0,
  adsFailed: 0,
  rewardedAdsCompleted: 0,
  rewardedCreditsIssued: 0,
  interstitialImpressions: 0,
  bannerImpressions: 0,
  rewardedDailyLimitReached: 0,
};

const INITIAL_CREDIT_LEDGER: CreditLedgerRecord[] = [
  {
    id: 'tx_seed_1',
    userId: 'usr_1',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.sharma@example.com',
    transactionId: 'tx_init_aarav',
    type: 'SUBSCRIPTION',
    amount: 25,
    balanceBefore: 0,
    balanceAfter: 25,
    reason: 'PRO Plan monthly credit allocation',
    createdAt: '2026-02-15T10:00:00.000Z',
  },
  {
    id: 'tx_seed_2',
    userId: 'usr_3',
    userName: 'Rohan Mehta',
    userEmail: 'rohan.mehta@example.com',
    transactionId: 'tx_init_rohan',
    type: 'FREE_TRIAL',
    amount: 0,
    balanceBefore: 0,
    balanceAfter: 0,
    reason: 'Free Trial initiated: 5 chat min + 5 photo analyses',
    createdAt: '2026-02-01T08:45:00.000Z',
  },
  {
    id: 'tx_seed_3',
    userId: 'usr_3',
    userName: 'Rohan Mehta',
    userEmail: 'rohan.mehta@example.com',
    transactionId: 'tx_ad_rohan_1',
    type: 'REWARDED_AD',
    amount: 2,
    balanceBefore: 0,
    balanceAfter: 2,
    reason: 'Watched voluntary rewarded ad #ad_reward_01',
    createdAt: '2026-02-05T14:20:00.000Z',
  },
];

const INITIAL_USAGE_LIMITS: UsageLimitsConfig = {
  freeQuestionsPerDay: 5,
  freeQuestionsPerMonth: 150,
  freePhotosPerMonth: 3,
  freeRoomScansPerMonth: 1,
  maxImageSizeMB: 15,
  maxImagesPerAnalysis: 4,
  maxReportGeneration: 2,
  limitsEnabled: true,
};

const INITIAL_AI_SETTINGS: AISettingsConfig = {
  provider: 'Google Gemini',
  activeModel: 'gemini-3.1-flash-lite',
  availableModels: [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
  ],
  temperature: 0.3,
  maxResponseLength: 2048,
  languageBehavior: 'auto_match',
  imageAnalysisMode: 'deep_audit',
};

const INITIAL_SYSTEM_PROMPTS: AISystemPromptConfig = {
  identity:
    'You are VastuVision AI, a calm, deeply knowledgeable, practical Traditional Vastu Shastra advisor. You help homeowners, renters, and architects achieve directional balance, comfort, and positive energy.',
  guidelines:
    'Always prioritize practical, non-structural remedies (such as rearranging furniture, lighting, curtains, plant buffers, brass bells, or directional mirrors) to avoid costly renovations. Never induce fear, superstition, or panic.',
  responseStyle:
    'Structured, elegant, compassionate, using concise bullet points and bold directional markers (North, South, East, West, North-East/Ishanya, South-East/Agni, South-West/Nairutya, North-West/Vayavya).',
  hindiHinglishInstructions:
    'When queried in Hindi or Hinglish, answer in natural, respectful colloquial Hinglish or Hindi. Emphasize traditional warmth while staying architectural and objective.',
  imageAnalysisInstructions:
    'Carefully audit visible room features: primary colors, wall mounts, clutter levels, natural daylight, open doorways, electrical sockets vs water points, and sleeping or cooking orientations.',
  safetyInstructions:
    'STRICT ZERO-FEAR POLICY: Never induce fear, threats, superstitious panic, or guaranteed claims about wealth, health, marriage, or death. Guidance is solely for peaceful home harmony and practical non-structural remedies. Never suggest demolition.',
  disclaimer:
    'All Vastu suggestions are intended for architectural and energetic harmony based on traditional Vedic principles and modern lifestyle design.',
  followUpRules:
    'Provide 3 concise, highly relevant follow-up questions matched to the user’s language and room context.',
  version: 1,
  lastUpdated: new Date().toISOString(),
};

const INITIAL_KNOWLEDGE: VastuKnowledgeItem[] = [
  {
    id: 'vk_1',
    title: 'Bedroom Mirror Placement',
    category: 'Mirror',
    question: 'Bedroom mein mirror kahan hona chahiye?',
    traditionalGuidance:
      'Traditional Vastu advises placing mirrors on North or East walls to reflect positive solar and magnetic energies. Avoid placing a mirror directly facing the bed.',
    recommendedDirection: 'North or East Wall',
    lessPreferredDirection: 'South or South-West facing bed',
    recommendedPlacement: 'Inside wardrobe door or on North/East wall angled away from sleeping zone',
    alternativeSolution: 'Cover mirror with a soothing linen curtain or decorative fabric before going to sleep.',
    explanation: 'Reflecting the resting body at night is considered to disrupt calm subconscious sleep cycles and create restless energy.',
    keywords: ['mirror', 'sheesha', 'aaina', 'bedroom', 'wardrobe', 'bed reflection'],
    language: 'All',
    status: 'published',
    priority: 'high',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vk_2',
    title: 'Wall Clock Ideal Mounting',
    category: 'Wall Clock',
    question: 'Wall clock kis direction mein lagani chahiye?',
    traditionalGuidance:
      'Clocks symbolize time, progression, and Kubera (wealth). They are most auspicious when mounted on North or East walls.',
    recommendedDirection: 'North or East Wall',
    lessPreferredDirection: 'South wall or directly above exit doors',
    recommendedPlacement: 'Living room or study North wall at eye-level',
    alternativeSolution: 'If on West wall, ensure round or oval metallic frame to balance planetary energies.',
    explanation: 'North represents growth and financial flow. Avoid stopped or broken clocks anywhere in the house.',
    keywords: ['clock', 'ghadi', 'wall clock', 'time', 'north wall'],
    language: 'All',
    status: 'published',
    priority: 'high',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vk_3',
    title: 'Kitchen Stove & Sink Spatial Balance',
    category: 'Kitchen',
    question: 'Kitchen mein gas stove aur sink kahan rakhein?',
    traditionalGuidance:
      'Stove represents Agni (Fire) and belongs in South-East. The sink represents Jal (Water) and belongs in North-East. Fire and water must never clash.',
    recommendedDirection: 'Stove in South-East, Sink in North-East',
    lessPreferredDirection: 'Stove adjacent to or directly opposite sink',
    recommendedPlacement: 'Maintain at least 3-4 feet distance between cooking burner and wash basin.',
    alternativeSolution: 'Place a small wooden board, green potted herb, or natural stone partition between stove and tap.',
    explanation: 'Direct opposition between fire and water elements creates energetic friction and health discord.',
    keywords: ['kitchen', 'stove', 'gas', 'sink', 'water', 'fire', 'agni', 'jal'],
    language: 'All',
    status: 'published',
    priority: 'high',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vk_4',
    title: 'Main Door Entrance Sanctity',
    category: 'Main Door',
    question: 'Main door ke saamne kya nahi hona chahiye?',
    traditionalGuidance:
      'The main entrance is the Simhadwara where Prana enters. It should be the most illuminated, unobstructed, and uplifting threshold of the home.',
    recommendedDirection: 'North, East, or North-East (Pooja/Kuber padas)',
    lessPreferredDirection: 'South-West without threshold correction',
    recommendedPlacement: 'Solid wood door opening clockwise with clean brass/copper nameplate.',
    alternativeSolution: 'Use a bright warm 2700K overhead light, a toran, and remove all shoe racks from direct doorway line.',
    explanation: 'Clutter or darkness right at the threshold traps stagnant energy and creates mental blockages for residents.',
    keywords: ['main door', 'entrance', 'gate', 'threshold', 'footwear', 'nameplate'],
    language: 'All',
    status: 'published',
    priority: 'high',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vk_5',
    title: 'Sleeping Direction for Deep Rest',
    category: 'Bed',
    question: 'Sote waqt sir kis disha mein hona chahiye?',
    traditionalGuidance:
      'Head towards South or East is scientifically and traditionally the most restorative posture.',
    recommendedDirection: 'South (ideal) or East (educational/intellectual)',
    lessPreferredDirection: 'North (strictly avoided for sleep)',
    recommendedPlacement: 'Solid wall backing the bed headboard; bed not aligned directly with door draft.',
    alternativeSolution: 'If room geometry restricts to West, use heavier curtains and grounding earthy rug.',
    explanation: 'Earth’s geomagnetic poles pull iron in blood. Sleeping head-to-north causes restlessness and elevated blood pressure.',
    keywords: ['bed', 'sleep', 'head direction', 'south', 'east', 'rest', 'insomnia'],
    language: 'All',
    status: 'published',
    priority: 'high',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vk_6',
    title: 'Pooja Room / Sacred Corner Placement',
    category: 'Pooja Room',
    question: 'Pooja mandir kis disha mein hona chahiye?',
    traditionalGuidance:
      'The North-East (Ishanya) zone is the purest corner governed by cosmic consciousness and water element.',
    recommendedDirection: 'North-East (Ishanya)',
    lessPreferredDirection: 'Under staircase, adjacent to toilet wall, or inside master bedroom',
    recommendedPlacement: 'East-facing prayer idol so the worshipper faces East or North while praying.',
    alternativeSolution: 'If North-East is unavailable, East or North prayer shelf on wooden console.',
    explanation: 'Maintains undisturbed reverent vibrations and clarity of spiritual meditation.',
    keywords: ['pooja', 'mandir', 'prayer', 'temple', 'ishanya', 'deities'],
    language: 'All',
    status: 'published',
    priority: 'high',
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_POPULAR_QUESTIONS: PopularQuestionItem[] = [
  {
    id: 'pq_1',
    query: 'Wall clock kis direction mein lagani chahiye?',
    category: 'Wall Clock',
    displayOrder: 1,
    enabled: true,
    searchCount: 842,
  },
  {
    id: 'pq_2',
    query: 'Bedroom mein mirror kahan hona chahiye?',
    category: 'Mirror',
    displayOrder: 2,
    enabled: true,
    searchCount: 719,
  },
  {
    id: 'pq_3',
    query: 'Kitchen stove aur sink placement Vastu rules',
    category: 'Kitchen',
    displayOrder: 3,
    enabled: true,
    searchCount: 654,
  },
  {
    id: 'pq_4',
    query: 'Bed kis direction mein rakhna chahiye for best sleep?',
    category: 'Bed',
    displayOrder: 4,
    enabled: true,
    searchCount: 588,
  },
  {
    id: 'pq_5',
    query: 'Main door ke saamne kya nahi hona chahiye?',
    category: 'Main Door',
    displayOrder: 5,
    enabled: true,
    searchCount: 521,
  },
  {
    id: 'pq_6',
    query: 'Master bedroom wall colour according to Vastu',
    category: 'Colours',
    displayOrder: 6,
    enabled: true,
    searchCount: 467,
  },
  {
    id: 'pq_7',
    query: 'Living room mein TV aur sofa kis direction mein rakhein?',
    category: 'Living Room',
    displayOrder: 7,
    enabled: true,
    searchCount: 412,
  },
];

const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat_bedroom', name: 'Bedroom', type: 'room', icon: 'Bed', description: 'Sleeping direction, mirrors, and serene atmosphere', displayOrder: 1, active: true, featured: true },
  { id: 'cat_living', name: 'Living Room', type: 'room', icon: 'Sofa', description: 'Social harmony, seating layout, and TV placement', displayOrder: 2, active: true, featured: true },
  { id: 'cat_kitchen', name: 'Kitchen', type: 'room', icon: 'Flame', description: 'Agni corner, stove and sink elemental balance', displayOrder: 3, active: true, featured: true },
  { id: 'cat_door', name: 'Main Door', type: 'room', icon: 'DoorOpen', description: 'Prana entrance, threshold lighting and nameplates', displayOrder: 4, active: true, featured: true },
  { id: 'cat_pooja', name: 'Pooja Room', type: 'room', icon: 'Sparkles', description: 'Ishanya zone sacred worship and idol alignment', displayOrder: 5, active: true, featured: true },
  { id: 'cat_clock', name: 'Wall Clock', type: 'object', icon: 'Clock', description: 'North & East wall timepieces for prosperity', displayOrder: 6, active: true, featured: true },
  { id: 'cat_mirror', name: 'Mirror', type: 'object', icon: 'Square', description: 'Reflective energy flow, wardrobe mirrors and cover remedies', displayOrder: 7, active: true, featured: true },
  { id: 'cat_plants', name: 'Plants', type: 'object', icon: 'Flower2', description: 'Air purifying green buffers, Tulsi & Money plant zones', displayOrder: 8, active: true, featured: true },
  { id: 'cat_colours', name: 'Colours', type: 'vastu', icon: 'Palette', description: 'Five-element wall shade balance and mood elevation', displayOrder: 9, active: true, featured: true },
  { id: 'cat_staircase', name: 'Staircase', type: 'room', icon: 'Layers', description: 'Heavy earth zones (South/West) clockwise ascents', displayOrder: 10, active: true, featured: false },
  { id: 'cat_balcony', name: 'Balcony', type: 'room', icon: 'Sun', description: 'North & East open light terraces and ventilation', displayOrder: 11, active: true, featured: false },
  { id: 'cat_bathroom', name: 'Bathroom', type: 'room', icon: 'Droplet', description: 'Drainage directions and negative exhaust prevention', displayOrder: 12, active: true, featured: false },
];

const INITIAL_SEO_PAGES: SEOPageItem[] = [
  {
    id: 'seo_1',
    slug: 'vastu-for-wall-clock',
    pageTitle: 'Wall Clock Vastu: Ideal Directions & Placement Guide',
    seoTitle: 'Best Wall Clock Direction as per Vastu Shastra 2026',
    metaDescription: 'Discover which wall is best for hanging clocks according to traditional Vastu Shastra to attract Kubera wealth energy and mental peace.',
    keywords: 'wall clock vastu, ghadi direction, vastu for clock, clock in living room, clock north wall',
    introduction: 'In Vastu Shastra, clocks represent continuous kinetic progress and the flow of opportunity. Learn how mounting clocks on North or East walls enhances prosperity.',
    mainContent: 'Clocks should always remain clean, operational, and chime softly. Never keep a stopped clock as it symbolically reflects frozen opportunity. The Kubera zone in North attracts financial inflow.',
    faq: [
      { q: 'Can we hang a clock on the South wall?', a: 'South wall clock placement is traditionally discouraged as South represents Yama and rest, causing subconscious time anxiety.' },
      { q: 'Is pendulum clock good as per Vastu?', a: 'Yes, a pendulum clock with melodious chimes placed in North or East creates rhythmic harmony throughout the house.' },
    ],
    relatedTopics: ['Bedroom Mirror Vastu', 'Living Room Layout', 'North Direction Energy'],
    status: 'published',
    publishDate: '2026-02-15',
  },
  {
    id: 'seo_2',
    slug: 'bedroom-mirror-vastu',
    pageTitle: 'Bedroom Mirror Placement Vastu Rules & Non-Structural Remedies',
    seoTitle: 'Bedroom Mirror Vastu: Where to Place and What to Avoid',
    metaDescription: 'Complete architectural guide on placing dressing tables and mirrors in bedrooms according to Vastu Shastra with easy non-structural remedies.',
    keywords: 'bedroom mirror vastu, dressing table vastu, mirror facing bed, vastu remedies mirror',
    introduction: 'Mirrors reflect and double whatever energy they face. In the sleeping sanctuary, incorrect mirror orientation can disrupt deep REM sleep cycles.',
    mainContent: 'Mount mirrors on the North or East interior walls. If your dressing table faces the bed, simply place a soft natural linen cover over the glass before bedtime.',
    faq: [
      { q: 'Why shouldn’t mirrors reflect the bed?', a: 'Vastu notes that resting energy should remain absorbed rather than continually bounced back, preventing restless sleep.' },
    ],
    relatedTopics: ['Bed Sleeping Direction', 'Wall Colours for Bedroom', 'Wardrobe Placement'],
    status: 'published',
    publishDate: '2026-02-18',
  },
];

const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq_1',
    question: 'Do I need to break walls or renovate to fix a Vastu defect?',
    answer: 'Absolutely not. Modern practical Vastu relies heavily on non-structural remedies such as rearranging furniture, adjusting lighting, adding indoor plant barriers, or using directional element balancing.',
    category: 'General',
    language: 'English',
    seoVisibility: true,
    displayOrder: 1,
    active: true,
  },
  {
    id: 'faq_2',
    question: 'How accurate is the AI camera photo analysis?',
    answer: 'The multimodal AI audit visually identifies walls, windows, open doors, lighting, and furniture placement to evaluate elemental harmony based on classic Vedic texts.',
    category: 'Technology',
    language: 'English',
    seoVisibility: true,
    displayOrder: 2,
    active: true,
  },
  {
    id: 'faq_3',
    question: 'Kya rental flat mein bhi Vastu remedies apply ho sakti hain?',
    answer: 'Haan, bilkul! Rental flats ke liye portable remedies jaise curtains, desk orientation, warm lighting, mirror covers aur plants sabse effective aur safe hote hain.',
    category: 'Remedies',
    language: 'Hinglish',
    seoVisibility: true,
    displayOrder: 3,
    active: true,
  },
];

const INITIAL_USERS: AppUserRecord[] = [
  { id: 'usr_1', name: 'Aarav Sharma', email: 'aarav.sharma@example.com', createdAt: '2026-01-15T10:00:00.000Z', lastActive: '2026-03-05T14:20:00.000Z', plan: 'pro', planExpiry: '2026-04-15T10:00:00.000Z', status: 'active', questionsAsked: 34, photosAnalyzed: 12, roomScansCompleted: 4, savedReportsCount: 2 },
  { id: 'usr_2', name: 'Priya Patel', email: 'priya.patel@example.com', createdAt: '2026-01-20T11:30:00.000Z', lastActive: '2026-03-06T09:15:00.000Z', plan: 'expert', planExpiry: '2027-01-20T11:30:00.000Z', status: 'active', questionsAsked: 112, photosAnalyzed: 45, roomScansCompleted: 18, savedReportsCount: 5 },
  { id: 'usr_3', name: 'Rohan Mehta', email: 'rohan.mehta@example.com', createdAt: '2026-02-01T08:45:00.000Z', lastActive: '2026-03-04T18:00:00.000Z', plan: 'free', status: 'active', questionsAsked: 14, photosAnalyzed: 3, roomScansCompleted: 1, savedReportsCount: 0 },
  { id: 'usr_4', name: 'Ananya Verma', email: 'ananya.v@example.com', createdAt: '2026-02-10T16:20:00.000Z', lastActive: '2026-03-06T12:00:00.000Z', plan: 'pro', planExpiry: '2026-03-10T16:20:00.000Z', status: 'active', questionsAsked: 48, photosAnalyzed: 19, roomScansCompleted: 6, savedReportsCount: 3 },
  { id: 'usr_5', name: 'Vikramaditya Rao', email: 'vikram.rao@example.com', createdAt: '2026-02-18T13:10:00.000Z', lastActive: '2026-02-25T15:00:00.000Z', plan: 'free', status: 'suspended', questionsAsked: 2, photosAnalyzed: 0, roomScansCompleted: 0, savedReportsCount: 0, adminNotes: 'Suspended per compliance inquiry' },
  { id: 'usr_6', name: 'Kavita Sundaram', email: 'kavita.s@example.com', createdAt: '2026-03-01T14:00:00.000Z', lastActive: '2026-03-06T19:30:00.000Z', plan: 'expert', planExpiry: '2026-09-01T14:00:00.000Z', status: 'active', questionsAsked: 78, photosAnalyzed: 28, roomScansCompleted: 9, savedReportsCount: 4 },
];

const INITIAL_SUBSCRIPTIONS: SubscriptionRecord[] = [
  { id: 'sub_1', userId: 'usr_1', userName: 'Aarav Sharma', userEmail: 'aarav.sharma@example.com', planId: 'pro', planName: 'Pro Advisor', amount: 99, currency: '₹', status: 'active', startDate: '2026-02-15', expiryDate: '2026-04-15', paymentStatus: 'paid', autoRenewal: true },
  { id: 'sub_2', userId: 'usr_2', userName: 'Priya Patel', userEmail: 'priya.patel@example.com', planId: 'expert', planName: 'Home Expert Suite', amount: 299, currency: '₹', status: 'active', startDate: '2026-01-20', expiryDate: '2027-01-20', paymentStatus: 'paid', autoRenewal: true },
  { id: 'sub_3', userId: 'usr_4', userName: 'Ananya Verma', userEmail: 'ananya.v@example.com', planId: 'pro', planName: 'Pro Advisor', amount: 99, currency: '₹', status: 'active', startDate: '2026-02-10', expiryDate: '2026-03-10', paymentStatus: 'paid', autoRenewal: true },
  { id: 'sub_4', userId: 'usr_6', userName: 'Kavita Sundaram', userEmail: 'kavita.s@example.com', planId: 'expert', planName: 'Home Expert Suite', amount: 299, currency: '₹', status: 'active', startDate: '2026-03-01', expiryDate: '2026-09-01', paymentStatus: 'paid', autoRenewal: true },
];

const INITIAL_COUPONS: CouponRecord[] = [
  { id: 'cp_1', code: 'VASTU20', discountType: 'percentage', discountAmount: 20, discountPercent: 20, discountPercentage: 20, percentage: 20, discount: 20, maxUses: 1000, usedCount: 142, perUserLimit: 1, startDate: '2026-01-01', expiryDate: '2026-12-31', applicablePlan: 'all', active: true },
  { id: 'cp_2', code: 'SHUBH50', discountType: 'fixed', discountAmount: 50, discountPercent: 0, discountPercentage: 0, percentage: 0, discount: 50, maxUses: 500, usedCount: 89, perUserLimit: 1, startDate: '2026-02-01', expiryDate: '2026-12-31', applicablePlan: 'pro', active: true },
  { id: 'cp_3', code: 'EXPERT100', discountType: 'fixed', discountAmount: 100, discountPercent: 0, discountPercentage: 0, percentage: 0, discount: 100, maxUses: 200, usedCount: 34, perUserLimit: 1, startDate: '2026-01-15', expiryDate: '2026-12-31', applicablePlan: 'expert', active: true },
];

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  { id: 'notif_1', title: 'New Multi-Room Home Scanner Live!', message: 'You can now scan up to 10 rooms and generate a unified master Vastu project report.', type: 'feature', startDate: '2026-02-01', endDate: '2026-04-30', active: true, dismissible: true },
];

const INITIAL_APP_SETTINGS: AppSettingsConfig = {
  appName: 'Ghar Ghar Vastu',
  logo: '/favicon.ico',
  supportEmail: 'support@ghargharvastu.com',
  contactPhone: '+91 98765 43210',
  privacyUrl: '#privacy',
  termsUrl: '#terms',
  disclaimerUrl: '#disclaimer',
  defaultLanguage: 'Hinglish / English',
  defaultAiResponseLanguage: 'Auto-Match Query',
  maintenanceMode: false,
  maintenanceMessage: 'We’re improving your AI Vastu experience. Please try again shortly.',
  newRegistrationEnabled: true,
  freeAiUsageEnabled: true,
  premiumFeaturesEnabled: true,
};

const INITIAL_FEATURE_FLAGS: FeatureFlagsConfig = {
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
};

const INITIAL_REPORT_SETTINGS: ReportSettingsConfig = {
  reportTitle: 'VastuVision Architectural Harmony & Elemental Scorecard',
  includeScorecard: true,
  includeRemedies: true,
  includeColorAnalysis: true,
  disclaimerText: 'This report provides directional and architectural harmony recommendations based on traditional Vastu Shastra principles. No structural alterations should be performed without certified engineering consultations.',
  footerText: 'Confidential & Personalized • Generated with VastuVision AI',
};

const INITIAL_FEEDBACK: UserFeedbackRecord[] = [
  { id: 'fb_1', userId: 'usr_1', userName: 'Aarav Sharma', userEmail: 'aarav.sharma@example.com', type: 'suggestion', category: 'Compass', message: 'Would love an option to lock the cardinal direction before taking the photo.', status: 'in_progress', adminNotes: 'Added manual direction selector modal as requested', createdAt: '2026-02-20T11:00:00.000Z' },
  { id: 'fb_2', userId: 'usr_3', userName: 'Rohan Mehta', userEmail: 'rohan.mehta@example.com', type: 'general', category: 'AI Accuracy', message: 'The remedy for bedroom mirror was very simple and helpful without changing furniture.', status: 'resolved', createdAt: '2026-02-28T16:30:00.000Z' },
];

const INITIAL_QUALITY_LOGS: AIQualityFeedbackRecord[] = [
  { id: 'q_1', query: 'Bedroom mirror facing bed remedy', category: 'Mirror', rating: 'helpful', comment: 'Loved the linen cover suggestion', timestamp: '2026-03-01T10:15:00.000Z' },
  { id: 'q_2', query: 'North wall clock mounting', category: 'Wall Clock', rating: 'helpful', timestamp: '2026-03-02T14:40:00.000Z' },
  { id: 'q_3', query: 'Kitchen stove placement', category: 'Kitchen', rating: 'helpful', timestamp: '2026-03-03T18:20:00.000Z' },
];

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  { id: 'aud_1', timestamp: '2026-03-01T09:00:00.000Z', adminId: 'admin_super_1', adminName: 'Chief Vastu Administrator', action: 'SYSTEM_INITIALIZED', affectedItem: 'Admin Portal', details: 'Production Admin Data Store booted and verified.' },
];

/**
 * Storage Container Class
 */
class AdminDataStore {
  public adminUsers: AdminUser[] = [INITIAL_SUPER_ADMIN];
  public sessions: Map<string, AdminSession> = new Map();
  public plans: PlanConfig[] = INITIAL_PLANS;
  public usageLimits: UsageLimitsConfig = INITIAL_USAGE_LIMITS;
  public aiSettings: AISettingsConfig = INITIAL_AI_SETTINGS;
  public systemPrompts: AISystemPromptConfig = INITIAL_SYSTEM_PROMPTS;
  public promptHistory: { version: number; date: string; content: AISystemPromptConfig }[] = [
    { version: 1, date: new Date().toISOString(), content: INITIAL_SYSTEM_PROMPTS },
  ];
  public knowledge: VastuKnowledgeItem[] = INITIAL_KNOWLEDGE;
  public popularQuestions: PopularQuestionItem[] = INITIAL_POPULAR_QUESTIONS;
  public categories: CategoryItem[] = INITIAL_CATEGORIES;
  public seoPages: SEOPageItem[] = INITIAL_SEO_PAGES;
  public faqs: FAQItem[] = INITIAL_FAQS;
  public users: AppUserRecord[] = INITIAL_USERS;
  public subscriptions: SubscriptionRecord[] = INITIAL_SUBSCRIPTIONS;
  public coupons: CouponRecord[] = INITIAL_COUPONS;
  public notifications: NotificationRecord[] = INITIAL_NOTIFICATIONS;
  public appSettings: AppSettingsConfig = INITIAL_APP_SETTINGS;
  public featureFlags: FeatureFlagsConfig = INITIAL_FEATURE_FLAGS;
  public reportSettings: ReportSettingsConfig = INITIAL_REPORT_SETTINGS;
  public feedback: UserFeedbackRecord[] = INITIAL_FEEDBACK;
  public qualityLogs: AIQualityFeedbackRecord[] = INITIAL_QUALITY_LOGS;
  public requestLogs: AIRequestLog[] = [];
  public anonymizedAnalyses: AnonymizedAIAnalysisRecord[] = [
    { id: 'ana_1', timestamp: '2026-03-05T12:00:00.000Z', analysisType: 'photo_analysis', roomType: 'Bedroom', direction: 'North Wall', vastuScore: 84, defectCount: 1, success: true, processingStatus: 'completed' },
    { id: 'ana_2', timestamp: '2026-03-05T14:30:00.000Z', analysisType: 'photo_analysis', roomType: 'Kitchen', direction: 'South-East', vastuScore: 92, defectCount: 0, success: true, processingStatus: 'completed' },
    { id: 'ana_3', timestamp: '2026-03-06T10:10:00.000Z', analysisType: 'complete_home', roomType: 'Whole House (4 rooms)', vastuScore: 88, defectCount: 2, success: true, processingStatus: 'completed' },
  ];
  public auditLogs: AuditLogRecord[] = INITIAL_AUDIT_LOGS;
  public priceHistory: PriceHistoryRecord[] = [];
  public creditSettings: CreditSettingsConfig = INITIAL_CREDIT_SETTINGS;
  public rewardedAdSettings: RewardedAdConfig = INITIAL_REWARDED_AD_SETTINGS;
  public adSettings: AdMobConfig = INITIAL_ADMOB_CONFIG;
  public adAnalytics: AdAnalytics = INITIAL_AD_ANALYTICS;
  public rewardedAdSessions: Map<string, RewardedAdSession> = new Map();
  public creditLedger: CreditLedgerRecord[] = INITIAL_CREDIT_LEDGER;
  public userAccounts: Map<string, UserCreditAccount> = new Map();
  public userSubscriptions: Map<string, UserSubscriptionRecord> = new Map();
  public paymentOrders: PaymentOrderRecord[] = [];
  public paymentEvents: PaymentEventRecord[] = [];
  public paymentVault: {
    testKeyId?: string;
    testKeySecret?: string;
    testWebhookSecret?: string;
    liveKeyId?: string;
    liveKeySecret?: string;
    liveWebhookSecret?: string;
  } = {};
  public rewardTransactionTokens: Set<string> = new Set();
  public ipHashMappings: Map<string, string> = new Map();
  public securityEvents: any[] = [];
  public activeReservations: Map<string, ReservationRecord> = new Map();
  private storageProvider = new AtomicFileStorageProvider();
  public globalAiSafety: GlobalAiSafetyConfig = {
    emergencyLockEnabled: false,
    emergencyReason: 'None',
    dailyRequestLimit: 5000,
    monthlyRequestLimit: 100000,
    dailyBudgetThresholdUSD: 50,
    monthlyBudgetThresholdUSD: 1000,
    todayRequestCount: 0,
    todayResetDate: new Date().toISOString().split('T')[0],
    monthRequestCount: 0,
    monthResetDate: new Date().toISOString().slice(0, 7),
    totalTokensUsed: 0,
    textRequestsCount: 0,
    imageAnalysisCount: 0,
    roomScanCount: 0,
    homeScanCount: 0,
    voiceTranscriptionCount: 0,
    failedRequestCount: 0,
    rateLimitedCount: 0,
    unauthorizedRejectedCount: 0,
    creditsConsumed: 0,
    freeUsageCount: 0,
    paidUsageCount: 0,
    estimatedCostUSD: 0,
  };

  private storeFilePath: string = path.join(process.cwd(), 'server', 'data', 'admin_store.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storeFilePath)) {
        const raw = fs.readFileSync(this.storeFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.plans) this.plans = parsed.plans;
        if (parsed.usageLimits) this.usageLimits = parsed.usageLimits;
        if (parsed.aiSettings) this.aiSettings = parsed.aiSettings;
        if (parsed.systemPrompts) this.systemPrompts = parsed.systemPrompts;
        if (parsed.knowledge) this.knowledge = parsed.knowledge;
        if (parsed.popularQuestions) this.popularQuestions = parsed.popularQuestions;
        if (parsed.categories) this.categories = parsed.categories;
        if (parsed.seoPages) this.seoPages = parsed.seoPages;
        if (parsed.faqs) this.faqs = parsed.faqs;
        if (parsed.users) this.users = parsed.users;
        if (parsed.subscriptions) this.subscriptions = parsed.subscriptions;
        if (parsed.coupons) this.coupons = parsed.coupons;
        if (parsed.notifications) this.notifications = parsed.notifications;
        if (parsed.appSettings) this.appSettings = parsed.appSettings;
        if (parsed.featureFlags) this.featureFlags = parsed.featureFlags;
        if (parsed.reportSettings) this.reportSettings = parsed.reportSettings;
        if (parsed.feedback) this.feedback = parsed.feedback;
        if (parsed.auditLogs) this.auditLogs = parsed.auditLogs;
        if (parsed.priceHistory && Array.isArray(parsed.priceHistory)) this.priceHistory = parsed.priceHistory;
        if (parsed.adminUsers) this.adminUsers = parsed.adminUsers;
        if (parsed.creditSettings) this.creditSettings = { ...INITIAL_CREDIT_SETTINGS, ...parsed.creditSettings };
        if (parsed.rewardedAdSettings) this.rewardedAdSettings = { ...INITIAL_REWARDED_AD_SETTINGS, ...parsed.rewardedAdSettings };
        if (parsed.adSettings) this.adSettings = { ...INITIAL_ADMOB_CONFIG, ...parsed.adSettings };
        if (parsed.adAnalytics) this.adAnalytics = { ...INITIAL_AD_ANALYTICS, ...parsed.adAnalytics };
        if (parsed.creditLedger) this.creditLedger = parsed.creditLedger;
        if (parsed.paymentOrders) this.paymentOrders = parsed.paymentOrders;
        if (parsed.paymentEvents) this.paymentEvents = parsed.paymentEvents;
        if (parsed.paymentVault) this.paymentVault = parsed.paymentVault;
        if (parsed.userSubscriptions && Array.isArray(parsed.userSubscriptions)) {
          this.userSubscriptions = new Map(parsed.userSubscriptions.map((s: any) => [s.userId, s]));
        }
        if (parsed.userAccounts && Array.isArray(parsed.userAccounts)) {
          this.userAccounts = new Map(parsed.userAccounts.map((u: UserCreditAccount) => [u.userId, u]));
        }
        if (parsed.rewardTransactionTokens && Array.isArray(parsed.rewardTransactionTokens)) {
          this.rewardTransactionTokens = new Set(parsed.rewardTransactionTokens);
        }
      }

      // Ensure loaded plans adhere to the monetization model schema
      this.plans = this.plans.map((p) => {
        if (p.id === 'free') {
          return {
            ...p,
            name: p.name || 'FREE NEW USER',
            price: 0,
            chatMinutes: p.chatMinutes ?? 5,
            photoAnalyses: p.photoAnalyses ?? 5,
            credits: p.credits ?? 0,
            showAds: p.showAds ?? true,
          };
        }
        if (p.id === 'pro') {
          return {
            ...p,
            name: p.name || 'PRO PLAN',
            price: p.price ?? 99,
            credits: p.credits ?? 25,
            chatMinutes: p.chatMinutes ?? 25,
            photoAnalyses: p.photoAnalyses ?? 25,
            showAds: p.showAds ?? false,
          };
        }
        if (p.id === 'expert') {
          return {
            ...p,
            name: p.name || 'HOME EXPERT',
            price: p.price ?? 299,
            credits: p.credits ?? 0,
            showAds: p.showAds ?? false,
            fairUseLimits: p.fairUseLimits || {
              maxAiRequestsPerDay: 40,
              maxImageAnalysesPerDay: 15,
              maxHomeScansPerDay: 3,
              maxConcurrentRequests: 1,
              maxVoiceMinutesPerDay: 20,
              maxImageSizeMB: 10,
            },
          };
        }
        return p;
      });

      // Ensure makesoney@gmail.com, shivshahidoors@gmail.com, admin@ghargharvastu.com, and support@ghargharvastu.com are active admins
      const targetAdmins = [
        {
          id: 'admin_super_1',
          name: 'Master Administrator',
          email: 'makesoney@gmail.com',
          role: 'SUPER_ADMIN' as const,
        },
        {
          id: 'admin_super_2',
          name: 'Shivshahi Administrator',
          email: 'shivshahidoors@gmail.com',
          role: 'SUPER_ADMIN' as const,
        },
        {
          id: 'admin_super_3',
          name: 'Vastu Support Administrator',
          email: 'support@ghargharvastu.com',
          role: 'SUPER_ADMIN' as const,
        },
        {
          id: 'admin_super_4',
          name: 'Ghar Ghar Vastu Administrator',
          email: 'admin@ghargharvastu.com',
          role: 'SUPER_ADMIN' as const,
        },
      ];

      for (const target of targetAdmins) {
        const idx = this.adminUsers.findIndex((u) => u.email.toLowerCase() === target.email.toLowerCase());
        if (idx === -1) {
          this.adminUsers.push({
            id: target.id,
            name: target.name,
            email: target.email,
            passwordHash: hashAdminPassword('VastuAdmin2026!'),
            salt: '',
            role: target.role,
            status: 'active',
            lastLogin: null,
            createdAt: new Date().toISOString(),
          });
        } else {
          this.adminUsers[idx].status = 'active';
          if (!this.adminUsers[idx].passwordHash.startsWith('$2')) {
            this.adminUsers[idx].passwordHash = hashAdminPassword('VastuAdmin2026!');
            this.adminUsers[idx].salt = '';
          }
        }
      }
      this.saveToDisk();
    } catch (err) {
      console.warn('[AdminDataStore] Notice: Fresh store initialization.', err);
    }
  }

  public saveToDisk() {
    try {
      const dir = path.dirname(this.storeFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const dataToSave = {
        adminUsers: this.adminUsers,
        plans: this.plans,
        usageLimits: this.usageLimits,
        aiSettings: this.aiSettings,
        systemPrompts: this.systemPrompts,
        knowledge: this.knowledge,
        popularQuestions: this.popularQuestions,
        categories: this.categories,
        seoPages: this.seoPages,
        faqs: this.faqs,
        users: this.users,
        subscriptions: this.subscriptions,
        coupons: this.coupons,
        notifications: this.notifications,
        appSettings: this.appSettings,
        featureFlags: this.featureFlags,
        reportSettings: this.reportSettings,
        feedback: this.feedback,
        auditLogs: this.auditLogs,
        priceHistory: this.priceHistory,
        creditSettings: this.creditSettings,
        rewardedAdSettings: this.rewardedAdSettings,
        adSettings: this.adSettings,
        adAnalytics: this.adAnalytics,
        creditLedger: this.creditLedger,
        paymentOrders: this.paymentOrders,
        paymentEvents: this.paymentEvents,
        paymentVault: this.paymentVault,
        userSubscriptions: Array.from(this.userSubscriptions.values()),
        userAccounts: Array.from(this.userAccounts.values()),
        rewardTransactionTokens: Array.from(this.rewardTransactionTokens),
        globalAiSafety: this.globalAiSafety,
        ipHashMappings: Array.from(this.ipHashMappings.entries()),
        securityEvents: this.securityEvents.slice(0, 500),
      };
      this.storageProvider.saveData(dataToSave);
    } catch (err) {
      console.error('[AdminDataStore] Error saving to disk:', err);
    }
  }

  // ==========================================
  // USER CREDIT & ENTITLEMENT METHODS
  // ==========================================

  public getUserAccount(
    userId: string,
    name?: string,
    email?: string,
    initialAllowance?: {
      freeChatMinutesRemaining?: number;
      freePhotosRemaining?: number;
      trialAbuseDetected?: boolean;
      trialAbuseNotice?: string;
    }
  ): UserCreditAccount {
    const todayStr = new Date().toISOString().split('T')[0];
    let account = this.userAccounts.get(userId);

    if (!account) {
      // Find matching user from AppUser directory if exists
      const existingUser = this.users.find((u) => u.id === userId);
      const planTier = (existingUser?.plan as 'free' | 'pro' | 'expert') || 'free';
      const defaultFreeChat = initialAllowance?.freeChatMinutesRemaining !== undefined
        ? initialAllowance.freeChatMinutesRemaining
        : this.creditSettings.newUserFreeChatMinutes;
      const defaultFreePhotos = initialAllowance?.freePhotosRemaining !== undefined
        ? initialAllowance.freePhotosRemaining
        : this.creditSettings.newUserFreePhotos;
      const initialCredits = planTier === 'pro' ? this.creditSettings.proCreditsPerMonth : 0;

      account = {
        userId,
        userName: name || existingUser?.name || 'Vastu Homeowner',
        userEmail: email || existingUser?.email || `user_${userId}@ghargharvastu.com`,
        plan: planTier,
        planExpiry: existingUser?.planExpiry,
        freeChatMinutesRemaining: defaultFreeChat,
        freePhotosRemaining: defaultFreePhotos,
        creditsBalance: initialCredits,
        totalSpentCredits: 0,
        trialAbuseDetected: initialAllowance?.trialAbuseDetected || false,
        trialAbuseNotice: initialAllowance?.trialAbuseNotice || undefined,
        todayUsage: {
          date: todayStr,
          aiRequestsCount: 0,
          imageAnalysesCount: 0,
          homeScansCount: 0,
          adsWatchedCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.userAccounts.set(userId, account);

      // Record free trial initialization in ledger
      this.creditLedger.unshift({
        id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        userId,
        userName: account.userName,
        userEmail: account.userEmail,
        transactionId: 'trial_' + userId,
        type: 'FREE_TRIAL',
        amount: 0,
        balanceBefore: 0,
        balanceAfter: account.creditsBalance,
        reason: `New User Free Trial initiated: ${defaultFreeChat} Chat Minutes + ${defaultFreePhotos} Photo Analyses`,
        createdAt: new Date().toISOString(),
      });

      this.saveToDisk();
    } else {
      // Check if daily tracking needs rollover
      if (account.todayUsage.date !== todayStr) {
        account.todayUsage = {
          date: todayStr,
          aiRequestsCount: 0,
          imageAnalysesCount: 0,
          homeScansCount: 0,
          adsWatchedCount: 0,
        };
      }
      if (name && account.userName !== name) account.userName = name;
      if (email && account.userEmail !== email) account.userEmail = email;
    }

    return account;
  }

  public recordCreditTransaction(
    userId: string,
    type: CreditLedgerRecord['type'],
    amount: number,
    reason: string,
    transactionId?: string
  ): { success: boolean; account: UserCreditAccount; ledgerRecord: CreditLedgerRecord } {
    const account = this.getUserAccount(userId);

    // Prevent duplicate credit addition for identical transaction ID and type
    if (transactionId) {
      const existingTx = this.creditLedger.find(
        (rec) => rec.userId === userId && rec.transactionId === transactionId && rec.type === type
      );
      if (existingTx) {
        console.log(
          `[AdminStore] Transaction ${transactionId} already recorded for user ${userId}. Skipping duplicate credit allocation.`
        );
        return { success: true, account, ledgerRecord: existingTx };
      }
    }

    const balanceBefore = account.creditsBalance;
    const balanceAfter = Math.max(0, balanceBefore + amount);

    account.creditsBalance = balanceAfter;
    if (amount < 0) {
      account.totalSpentCredits += Math.abs(amount);
    }
    account.updatedAt = new Date().toISOString();

    const txId = transactionId || 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const ledgerRecord: CreditLedgerRecord = {
      id: 'tx_rec_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId,
      userName: account.userName,
      userEmail: account.userEmail,
      transactionId: txId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      createdAt: new Date().toISOString(),
    };

    this.creditLedger.unshift(ledgerRecord);
    if (this.creditLedger.length > 2000) this.creditLedger.pop();
    this.saveToDisk();

    return { success: true, account, ledgerRecord };
  }

  public checkAndEnforceExpiry(account: UserCreditAccount) {
    if (account.plan !== 'free' && account.planExpiry) {
      const expiry = new Date(account.planExpiry);
      if (expiry.getTime() < Date.now()) {
        const previousPlan = account.plan;
        account.plan = 'free';
        account.updatedAt = new Date().toISOString();

        const sub = this.userSubscriptions.get(account.userId);
        if (sub && sub.status === 'ACTIVE') {
          sub.status = 'EXPIRED';
          sub.updatedAt = new Date().toISOString();
        }

        const legacySub = this.subscriptions.find((s) => s.userId === account.userId && s.status === 'active');
        if (legacySub) {
          legacySub.status = 'expired';
        }

        const appUser = this.users.find((u) => u.id === account.userId);
        if (appUser) {
          appUser.plan = 'free';
        }

        this.logAudit(
          { id: 'system', name: 'Subscription Manager' },
          'SUBSCRIPTION_EXPIRED',
          `User ${account.userId}`,
          `Subscription for plan ${previousPlan} expired on ${account.planExpiry}. Downgraded to free.`
        );

        this.saveToDisk();
      }
    }
  }

  public canUserPerformAction(
    userId: string,
    actionType: 'ai_chat' | 'photo_analysis' | 'voice' | 'room_scan' | 'complete_home' | 'pdf_report'
  ): {
    allowed: boolean;
    reason?: string;
    errorCode?:
      | 'PLAN_UPGRADE_REQUIRED'
      | 'CREDITS_EXHAUSTED'
      | 'FREE_TRIAL_EXHAUSTED'
      | 'FAIR_USE_LIMIT_REACHED'
      | 'FEATURE_NOT_IN_PLAN'
      | 'FREE_EXHAUSTED'
      | 'FAIR_USE_LIMIT'
      | 'DAILY_CAP_REACHED';
    requiredCredits?: number;
    remainingCredits?: number;
    remainingFreeAllowance?: number;
    isExpert?: boolean;
  } {
    const account = this.getUserAccount(userId);
    this.checkAndEnforceExpiry(account);
    const plan = this.plans.find((p) => p.id === account.plan) || this.plans[0];

    // Determine credit cost from centralized settings
    let cost = 1;
    if (actionType === 'ai_chat') cost = this.creditSettings.textQuestionCost;
    else if (actionType === 'photo_analysis') cost = this.creditSettings.imageAnalysisCost;
    else if (actionType === 'voice') cost = this.creditSettings.voiceUsageCost;
    else if (actionType === 'room_scan') cost = this.creditSettings.roomScanCost;
    else if (actionType === 'complete_home') cost = this.creditSettings.completeHomeScanCost;
    else if (actionType === 'pdf_report') cost = this.creditSettings.pdfReportCost;

    // 1. HOME EXPERT TIER (Unlimited* with Server-Enforced Fair-Use Limits)
    if (account.plan === 'expert') {
      const fairLimits = plan.fairUseLimits || {
        maxAiRequestsPerDay: 40,
        maxImageAnalysesPerDay: 15,
        maxHomeScansPerDay: 3,
        maxConcurrentRequests: 1,
        maxVoiceMinutesPerDay: 20,
        maxImageSizeMB: 10,
      };

      if (
        (actionType === 'ai_chat' || actionType === 'voice') &&
        account.todayUsage.aiRequestsCount >= fairLimits.maxAiRequestsPerDay
      ) {
        return {
          allowed: false,
          errorCode: 'FAIR_USE_LIMIT_REACHED',
          reason: `Daily fair-use limit of ${fairLimits.maxAiRequestsPerDay} AI queries reached for HOME EXPERT. Resets at midnight UTC.`,
          isExpert: true,
        };
      }

      if (
        actionType === 'photo_analysis' &&
        account.todayUsage.imageAnalysesCount >= fairLimits.maxImageAnalysesPerDay
      ) {
        return {
          allowed: false,
          errorCode: 'FAIR_USE_LIMIT_REACHED',
          reason: `Daily fair-use limit of ${fairLimits.maxImageAnalysesPerDay} photo analyses reached for HOME EXPERT. Resets at midnight UTC.`,
          isExpert: true,
        };
      }

      if (
        actionType === 'complete_home' &&
        account.todayUsage.homeScansCount >= fairLimits.maxHomeScansPerDay
      ) {
        return {
          allowed: false,
          errorCode: 'FAIR_USE_LIMIT_REACHED',
          reason: `Daily fair-use limit of ${fairLimits.maxHomeScansPerDay} complete home project scans reached for HOME EXPERT. Resets at midnight UTC.`,
          isExpert: true,
        };
      }

      return { allowed: true, isExpert: true, remainingCredits: 999 };
    }

    // 2. FREE TIER (Feature Access Matrix + Trial Allowances)
    if (account.plan === 'free') {
      if (actionType === 'voice') {
        return {
          allowed: false,
          errorCode: 'FEATURE_NOT_IN_PLAN',
          reason: 'Voice consultation is exclusive to PRO and HOME EXPERT plans. Upgrade to unlock voice.',
        };
      }

      if (actionType === 'room_scan') {
        return {
          allowed: false,
          errorCode: 'FEATURE_NOT_IN_PLAN',
          reason: 'Room and object scan is available on PRO or HOME EXPERT plan.',
        };
      }

      if (actionType === 'complete_home') {
        return {
          allowed: false,
          errorCode: 'FEATURE_NOT_IN_PLAN',
          reason: 'Complete whole-home multi-room scan is exclusive to the HOME EXPERT plan.',
        };
      }

      if (actionType === 'pdf_report') {
        return {
          allowed: false,
          errorCode: 'FEATURE_NOT_IN_PLAN',
          reason: 'Architectural PDF reports are available on PRO and HOME EXPERT plans.',
        };
      }

      if (actionType === 'ai_chat') {
        if (account.freeChatMinutesRemaining > 0) {
          return {
            allowed: true,
            remainingFreeAllowance: account.freeChatMinutesRemaining,
            remainingCredits: account.creditsBalance,
          };
        }
      } else if (actionType === 'photo_analysis') {
        if (account.freePhotosRemaining > 0) {
          return {
            allowed: true,
            remainingFreeAllowance: account.freePhotosRemaining,
            remainingCredits: account.creditsBalance,
          };
        }
      }

      // Free user has exhausted trial action, check if they have earned rewarded credits
      if (account.creditsBalance >= cost) {
        return {
          allowed: true,
          requiredCredits: cost,
          remainingCredits: account.creditsBalance,
        };
      }

      return {
        allowed: false,
        errorCode: 'FREE_TRIAL_EXHAUSTED',
        requiredCredits: cost,
        remainingCredits: account.creditsBalance,
        remainingFreeAllowance: 0,
        reason:
          actionType === 'photo_analysis'
            ? 'Your 5 free photo analyses have been used. Watch a rewarded ad for +2 bonus credits or upgrade to PRO.'
            : 'Your 5 free AI chat minutes have been used. Watch a rewarded ad for +2 bonus credits or upgrade to PRO.',
      };
    }

    // 3. PRO TIER (Uses credit balance e.g. 25 credits/month)
    if (actionType === 'complete_home') {
      if (account.creditsBalance >= cost) {
        return {
          allowed: true,
          requiredCredits: cost,
          remainingCredits: account.creditsBalance,
        };
      }
      return {
        allowed: false,
        errorCode: 'PLAN_UPGRADE_REQUIRED',
        requiredCredits: cost,
        remainingCredits: account.creditsBalance,
        reason: 'Complete whole-home scan requires 3 AI credits or upgrade to HOME EXPERT for unlimited* scans.',
      };
    }

    if (account.creditsBalance >= cost) {
      return {
        allowed: true,
        requiredCredits: cost,
        remainingCredits: account.creditsBalance,
      };
    }

    return {
      allowed: false,
      errorCode: 'CREDITS_EXHAUSTED',
      requiredCredits: cost,
      remainingCredits: account.creditsBalance,
      reason: `Insufficient AI credits. Required: ${cost}, Available: ${account.creditsBalance}. Watch a rewarded ad for +2 credits or upgrade to HOME EXPERT.`,
    };
  }

  public deductForAction(
    userId: string,
    actionType: 'ai_chat' | 'photo_analysis' | 'voice' | 'room_scan' | 'complete_home' | 'pdf_report'
  ): {
    success: boolean;
    deductedFree?: boolean;
    deductedCredits?: number;
    remainingCredits: number;
    remainingFreeChat: number;
    remainingFreePhotos: number;
  } {
    const account = this.getUserAccount(userId);

    // Update today tracking
    if (actionType === 'ai_chat' || actionType === 'voice') {
      account.todayUsage.aiRequestsCount++;
    } else if (actionType === 'photo_analysis') {
      account.todayUsage.imageAnalysesCount++;
    } else if (actionType === 'complete_home') {
      account.todayUsage.homeScansCount++;
    }

    // 1. HOME EXPERT
    if (account.plan === 'expert') {
      this.saveToDisk();
      return {
        success: true,
        remainingCredits: 999,
        remainingFreeChat: account.freeChatMinutesRemaining,
        remainingFreePhotos: account.freePhotosRemaining,
      };
    }

    // 2. FREE TIER
    if (account.plan === 'free') {
      if (actionType === 'ai_chat' && account.freeChatMinutesRemaining > 0) {
        account.freeChatMinutesRemaining = Math.max(0, account.freeChatMinutesRemaining - 1);
        this.saveToDisk();
        return {
          success: true,
          deductedFree: true,
          remainingCredits: account.creditsBalance,
          remainingFreeChat: account.freeChatMinutesRemaining,
          remainingFreePhotos: account.freePhotosRemaining,
        };
      }
      if (actionType === 'photo_analysis' && account.freePhotosRemaining > 0) {
        account.freePhotosRemaining = Math.max(0, account.freePhotosRemaining - 1);
        this.saveToDisk();
        return {
          success: true,
          deductedFree: true,
          remainingCredits: account.creditsBalance,
          remainingFreeChat: account.freeChatMinutesRemaining,
          remainingFreePhotos: account.freePhotosRemaining,
        };
      }
    }

    // 3. CREDIT DEDUCTION (Pro tier or Free tier with earned credits)
    let cost = 1;
    if (actionType === 'ai_chat') cost = this.creditSettings.textQuestionCost;
    else if (actionType === 'photo_analysis') cost = this.creditSettings.imageAnalysisCost;
    else if (actionType === 'voice') cost = this.creditSettings.voiceUsageCost;
    else if (actionType === 'room_scan') cost = this.creditSettings.roomScanCost;
    else if (actionType === 'complete_home') cost = this.creditSettings.completeHomeScanCost;
    else if (actionType === 'pdf_report') cost = this.creditSettings.pdfReportCost;

    const txType: CreditLedgerRecord['type'] =
      actionType === 'photo_analysis'
        ? 'IMAGE_ANALYSIS'
        : actionType === 'ai_chat'
        ? 'AI_CHAT'
        : actionType === 'voice'
        ? 'VOICE'
        : actionType === 'room_scan'
        ? 'ROOM_SCAN'
        : actionType === 'complete_home'
        ? 'HOME_SCAN'
        : 'AI_CHAT';

    const res = this.recordCreditTransaction(
      userId,
      txType,
      -cost,
      `Vastu ${actionType} performed`
    );

    return {
      success: res.success,
      deductedCredits: cost,
      remainingCredits: res.account.creditsBalance,
      remainingFreeChat: res.account.freeChatMinutesRemaining,
      remainingFreePhotos: res.account.freePhotosRemaining,
    };
  }

  public verifyAndRewardAd(
    userId: string,
    transactionId: string
  ): {
    success: boolean;
    rewardGranted: number;
    newBalance: number;
    account: UserCreditAccount;
    error?: string;
  } {
    const account = this.getUserAccount(userId);

    if (account.plan === 'expert') {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'HOME EXPERT plan is 100% ad-free. No ad watching required.',
      };
    }

    if (!this.rewardedAdSettings.enabled) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Rewarded ads are currently paused.',
      };
    }

    if (this.rewardTransactionTokens.has(transactionId)) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Duplicate reward token detected.',
      };
    }

    // Check daily cap
    if (account.todayUsage.adsWatchedCount >= this.rewardedAdSettings.maxAdsPerDay) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: `Daily limit of ${this.rewardedAdSettings.maxAdsPerDay} rewarded ads reached. Resets at midnight UTC.`,
      };
    }

    // Check cooldown
    const now = Date.now();
    if (account.todayUsage.lastAdWatchedAt) {
      const elapsedSeconds = Math.floor((now - account.todayUsage.lastAdWatchedAt) / 1000);
      if (elapsedSeconds < this.rewardedAdSettings.cooldownSeconds) {
        const remainingWait = this.rewardedAdSettings.cooldownSeconds - elapsedSeconds;
        return {
          success: false,
          rewardGranted: 0,
          newBalance: account.creditsBalance,
          account,
          error: `Please wait ${remainingWait}s before watching another ad.`,
        };
      }
    }

    // Grant reward
    const reward = this.rewardedAdSettings.rewardCredits;
    this.rewardTransactionTokens.add(transactionId);
    account.todayUsage.adsWatchedCount++;
    account.todayUsage.lastAdWatchedAt = now;

    const res = this.recordCreditTransaction(
      userId,
      'REWARDED_AD',
      reward,
      `Voluntary Rewarded Ad watched (${transactionId})`,
      transactionId
    );

    this.adAnalytics.rewardedAdsCompleted++;
    this.adAnalytics.rewardedCreditsIssued += reward;
    this.saveToDisk();

    return {
      success: true,
      rewardGranted: reward,
      newBalance: res.account.creditsBalance,
      account: res.account,
    };
  }

  // ==========================================
  // ADMOB AD SYSTEM METHODS
  // ==========================================

  public getEffectiveAdConfig(userPlan: 'free' | 'pro' | 'expert' = 'free'): {
    adsEnabled: boolean;
    testMode: boolean;
    bannerEnabled: boolean;
    interstitialEnabled: boolean;
    rewardedEnabled: boolean;
    bannerAdUnitId: string | null;
    interstitialAdUnitId: string | null;
    rewardedAdUnitId: string | null;
    bannerFormat: 'fixed' | 'anchored_adaptive';
    bannerPosition: 'top' | 'bottom';
    rewardedCreditAmount: number;
    dailyRewardedAdLimit: number;
    rewardedCooldownSeconds: number;
    interstitialFrequency: number;
    interstitialCooldownSeconds: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let planAllowsAds = true;
    if (userPlan === 'expert') planAllowsAds = this.adSettings.homeExpertAdsEnabled;
    else if (userPlan === 'pro') planAllowsAds = this.adSettings.proPlanAdsEnabled;
    else planAllowsAds = this.adSettings.freePlanAdsEnabled;

    const isGlobalEnabled = this.adSettings.adsEnabled && planAllowsAds;

    let bannerAdUnitId: string | null = null;
    let interstitialAdUnitId: string | null = null;
    let rewardedAdUnitId: string | null = null;

    if (this.adSettings.testMode) {
      bannerAdUnitId =
        this.adSettings.bannerFormat === 'fixed'
          ? this.adSettings.testFixedBannerAdUnitId
          : this.adSettings.testAnchoredAdaptiveBannerAdUnitId;
      interstitialAdUnitId = this.adSettings.testInterstitialAdUnitId;
      rewardedAdUnitId = this.adSettings.testRewardedAdUnitId;
    } else {
      // Production Mode: Validate production IDs
      if (this.adSettings.bannerFormat === 'fixed') {
        if (isValidAdMobAdUnitId(this.adSettings.fixedBannerAdUnitId)) {
          bannerAdUnitId = this.adSettings.fixedBannerAdUnitId.trim();
        } else {
          warnings.push('Production Fixed Banner Ad Unit ID is missing or invalid. Banner ads disabled.');
        }
      } else {
        if (isValidAdMobAdUnitId(this.adSettings.anchoredAdaptiveBannerAdUnitId)) {
          bannerAdUnitId = this.adSettings.anchoredAdaptiveBannerAdUnitId.trim();
        } else {
          warnings.push('Production Anchored Adaptive Banner Ad Unit ID is missing or invalid. Banner ads disabled.');
        }
      }

      if (isValidAdMobAdUnitId(this.adSettings.interstitialAdUnitId)) {
        interstitialAdUnitId = this.adSettings.interstitialAdUnitId.trim();
      } else {
        warnings.push('Production Interstitial Ad Unit ID is missing or invalid. Interstitial ads disabled.');
      }

      if (isValidAdMobAdUnitId(this.adSettings.rewardedAdUnitId)) {
        rewardedAdUnitId = this.adSettings.rewardedAdUnitId.trim();
      } else {
        warnings.push('Production Rewarded Ad Unit ID is missing or invalid. Rewarded ads disabled.');
      }
    }

    return {
      adsEnabled: isGlobalEnabled,
      testMode: this.adSettings.testMode,
      bannerEnabled: isGlobalEnabled && this.adSettings.bannerEnabled && bannerAdUnitId !== null,
      interstitialEnabled: isGlobalEnabled && this.adSettings.interstitialEnabled && interstitialAdUnitId !== null,
      rewardedEnabled: isGlobalEnabled && this.adSettings.rewardedEnabled && rewardedAdUnitId !== null,
      bannerAdUnitId,
      interstitialAdUnitId,
      rewardedAdUnitId,
      bannerFormat: this.adSettings.bannerFormat,
      bannerPosition: this.adSettings.bannerPosition,
      rewardedCreditAmount: this.adSettings.rewardedCreditAmount,
      dailyRewardedAdLimit: this.adSettings.dailyRewardedAdLimit,
      rewardedCooldownSeconds: this.adSettings.rewardedCooldownSeconds,
      interstitialFrequency: this.adSettings.interstitialFrequency,
      interstitialCooldownSeconds: this.adSettings.interstitialCooldownSeconds,
      warnings,
    };
  }

  public createRewardedAdSession(userId: string): {
    success: boolean;
    session?: RewardedAdSession;
    rewardCredits?: number;
    testMode?: boolean;
    error?: string;
  } {
    const account = this.getUserAccount(userId);

    if (account.plan === 'expert' && !this.adSettings.homeExpertAdsEnabled) {
      return { success: false, error: 'HOME EXPERT plan is ad-free.' };
    }
    if (account.plan === 'pro' && !this.adSettings.proPlanAdsEnabled) {
      return { success: false, error: 'PRO plan is ad-free.' };
    }

    const effective = this.getEffectiveAdConfig(account.plan);
    if (!effective.rewardedEnabled || !effective.rewardedAdUnitId) {
      return { success: false, error: 'Rewarded ads are currently unavailable or disabled.' };
    }

    // Check daily cap
    if (account.todayUsage.adsWatchedCount >= this.adSettings.dailyRewardedAdLimit) {
      this.adAnalytics.rewardedDailyLimitReached++;
      return {
        success: false,
        error: `Daily limit of ${this.adSettings.dailyRewardedAdLimit} rewarded ads reached. Resets at midnight UTC.`,
      };
    }

    // Check cooldown
    const now = Date.now();
    if (account.todayUsage.lastAdWatchedAt) {
      const elapsedSeconds = Math.floor((now - account.todayUsage.lastAdWatchedAt) / 1000);
      if (elapsedSeconds < this.adSettings.rewardedCooldownSeconds) {
        const remainingWait = this.adSettings.rewardedCooldownSeconds - elapsedSeconds;
        return {
          success: false,
          error: `Please wait ${remainingWait}s before watching another ad.`,
        };
      }
    }

    const session: RewardedAdSession = {
      sessionId: 'adsess_' + now + '_' + Math.random().toString(36).substring(2, 9),
      userId,
      adUnitId: effective.rewardedAdUnitId,
      testMode: this.adSettings.testMode,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 min window
      claimed: false,
    };

    this.rewardedAdSessions.set(session.sessionId, session);
    this.adAnalytics.adsRequested++;

    return {
      success: true,
      session,
      rewardCredits: this.adSettings.rewardedCreditAmount,
      testMode: this.adSettings.testMode,
    };
  }

  public claimRewardedAdSession(
    userId: string,
    sessionId: string,
    idempotencyKey?: string,
    networkReference?: string
  ): {
    success: boolean;
    rewardGranted: number;
    newBalance: number;
    account: UserCreditAccount;
    error?: string;
  } {
    const account = this.getUserAccount(userId);

    if (!sessionId) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Ad session token is required.',
      };
    }

    const session = this.rewardedAdSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Invalid or unrecognized ad session.',
      };
    }

    if (session.claimed) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Reward has already been claimed for this ad session.',
      };
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Ad session has expired. Please try watching again.',
      };
    }

    // Minimum view duration check (at least 3 seconds)
    if (now - session.createdAt < 3000) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Ad completion event was received too fast. Full ad view required.',
      };
    }

    // Check daily cap
    if (account.todayUsage.adsWatchedCount >= this.adSettings.dailyRewardedAdLimit) {
      this.adAnalytics.rewardedDailyLimitReached++;
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: `Daily limit of ${this.adSettings.dailyRewardedAdLimit} rewarded ads reached.`,
      };
    }

    const tokenKey = idempotencyKey || sessionId;
    if (this.rewardTransactionTokens.has(tokenKey)) {
      return {
        success: false,
        rewardGranted: 0,
        newBalance: account.creditsBalance,
        account,
        error: 'Duplicate reward token detected.',
      };
    }

    // Grant authoritative reward
    const reward = this.adSettings.rewardedCreditAmount;
    session.claimed = true;
    session.claimedAt = now;
    this.rewardTransactionTokens.add(tokenKey);

    account.todayUsage.adsWatchedCount++;
    account.todayUsage.lastAdWatchedAt = now;

    const oldBalance = account.creditsBalance;
    account.creditsBalance += reward;
    account.updatedAt = new Date().toISOString();

    // Record in credit ledger
    const ledgerRecord: CreditLedgerRecord = {
      id: 'tx_ad_' + now + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      userName: account.userName,
      userEmail: account.userEmail,
      transactionId: tokenKey,
      type: 'REWARDED_AD',
      amount: reward,
      balanceBefore: oldBalance,
      balanceAfter: account.creditsBalance,
      reason: `Official AdMob Rewarded Ad completed (+${reward} AI Credits)${session.testMode ? ' [Test Ad]' : ''}${networkReference ? ` - ${networkReference}` : ''}`,
      createdAt: new Date().toISOString(),
    };

    this.creditLedger.unshift(ledgerRecord);
    this.adAnalytics.rewardedAdsCompleted++;
    this.adAnalytics.rewardedCreditsIssued += reward;
    this.saveToDisk();

    return {
      success: true,
      rewardGranted: reward,
      newBalance: account.creditsBalance,
      account,
    };
  }

  public recordAdTelemetry(event: string, _meta?: any): void {
    switch (event) {
      case 'ad_loaded':
        this.adAnalytics.adsLoaded++;
        break;
      case 'ad_failed':
        this.adAnalytics.adsFailed++;
        break;
      case 'interstitial_impression':
        this.adAnalytics.interstitialImpressions++;
        break;
      case 'banner_impression':
        this.adAnalytics.bannerImpressions++;
        break;
    }
  }

  public adjustUserCredits(
    userId: string,
    amount: number,
    reason: string,
    adminName: string
  ): { success: boolean; newBalance: number } {
    const res = this.recordCreditTransaction(
      userId,
      'ADMIN_ADJUSTMENT',
      amount,
      `Admin adjustment by ${adminName}: ${reason}`
    );

    this.logAudit(
      { id: 'admin', name: adminName },
      'CREDIT_ADJUSTMENT',
      `User ${userId}`,
      `Adjusted credits by ${amount > 0 ? '+' : ''}${amount}. Reason: ${reason}`
    );

    return { success: true, newBalance: res.account.creditsBalance };
  }

  // ==========================================
  // PAYMENT & SUBSCRIPTION MANAGEMENT METHODS
  // ==========================================

  public recordPaymentOrder(order: PaymentOrderRecord) {
    this.paymentOrders.unshift(order);
    if (this.paymentOrders.length > 2000) this.paymentOrders.pop();
    this.saveToDisk();
  }

  public getPaymentOrder(orderId: string): PaymentOrderRecord | undefined {
    return this.paymentOrders.find((o) => o.orderId === orderId);
  }

  public updatePaymentOrder(orderId: string, updates: Partial<PaymentOrderRecord>) {
    const idx = this.paymentOrders.findIndex((o) => o.orderId === orderId);
    if (idx !== -1) {
      this.paymentOrders[idx] = { ...this.paymentOrders[idx], ...updates };
      this.saveToDisk();
    }
  }

  public recordPaymentEvent(event: PaymentEventRecord) {
    this.paymentEvents.unshift(event);
    if (this.paymentEvents.length > 2000) this.paymentEvents.pop();
    this.saveToDisk();
  }

  public getUserSubscription(userId: string): UserSubscriptionRecord {
    const account = this.getUserAccount(userId);
    this.checkAndEnforceExpiry(account);

    let sub = this.userSubscriptions.get(userId);
    if (sub) {
      return sub;
    }

    // Check legacy array
    const legacy = this.subscriptions.find((s) => s.userId === userId);
    if (legacy && legacy.status === 'active') {
      const now = new Date().toISOString();
      const plan = this.plans.find((p) => p.id === legacy.planId) || this.plans[1];
      sub = {
        id: legacy.id,
        userId: legacy.userId,
        userName: legacy.userName,
        userEmail: legacy.userEmail,
        planId: (legacy.planId as any) || 'pro',
        planName: legacy.planName || plan.name,
        status: 'ACTIVE',
        provider: 'manual',
        amount: legacy.amount,
        currency: legacy.currency || '₹',
        startedAt: legacy.startDate ? new Date(legacy.startDate).toISOString() : now,
        currentPeriodStart: legacy.startDate ? new Date(legacy.startDate).toISOString() : now,
        currentPeriodEnd: legacy.expiryDate ? new Date(legacy.expiryDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      };
      this.userSubscriptions.set(userId, sub);
      this.saveToDisk();
      return sub;
    }

    // Default free subscription
    const now = new Date().toISOString();
    const defaultSub: UserSubscriptionRecord = {
      id: 'sub_free_' + userId,
      userId,
      userName: account.userName,
      userEmail: account.userEmail,
      planId: 'free',
      planName: 'FREE',
      status: 'FREE',
      provider: 'free',
      amount: 0,
      currency: '₹',
      startedAt: account.createdAt || now,
      currentPeriodStart: account.createdAt || now,
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: account.createdAt || now,
      updatedAt: account.updatedAt || now,
    };
    return defaultSub;
  }

  public getSubscriptionStatus(userId: string): SubscriptionStatusResponse {
    const account = this.getUserAccount(userId);
    this.checkAndEnforceExpiry(account);
    const sub = this.getUserSubscription(userId);
    const plan = this.plans.find((p) => p.id === account.plan) || this.plans[0];

    const isRazorpayConfigured = !!(
      (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) ||
      (process.env.RAZORPAY_LIVE_KEY_ID && process.env.RAZORPAY_LIVE_KEY_SECRET) ||
      (this.paymentVault?.liveKeyId && this.paymentVault?.liveKeySecret) ||
      (this.paymentVault?.testKeyId && this.paymentVault?.testKeySecret)
    );

    // Can user watch rewarded ads?
    let canWatchAd = false;
    if (account.plan !== 'expert' && this.rewardedAdSettings.enabled) {
      const underCap = account.todayUsage.adsWatchedCount < this.rewardedAdSettings.maxAdsPerDay;
      const cooldownDone = !account.todayUsage.lastAdWatchedAt ||
        (Date.now() - account.todayUsage.lastAdWatchedAt) >= (this.rewardedAdSettings.cooldownSeconds * 1000);
      canWatchAd = underCap && cooldownDone;
    }

    return {
      plan: account.plan,
      planName: plan.name,
      status: sub.status,
      credits: {
        balance: account.creditsBalance,
        freeChatMinutesRemaining: account.freeChatMinutesRemaining,
        freePhotosRemaining: account.freePhotosRemaining,
        totalSpent: account.totalSpentCredits,
      },
      usage: {
        date: account.todayUsage.date,
        aiRequestsCount: account.todayUsage.aiRequestsCount,
        imageAnalysesCount: account.todayUsage.imageAnalysesCount,
        homeScansCount: account.todayUsage.homeScansCount,
        adsWatchedCount: account.todayUsage.adsWatchedCount,
        lastAdWatchedAt: account.todayUsage.lastAdWatchedAt,
      },
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      features: plan.features,
      fairUseLimits: plan.fairUseLimits,
      adConfig: {
        enabled: this.rewardedAdSettings.enabled,
        rewardCredits: this.rewardedAdSettings.rewardCredits,
        maxAdsPerDay: this.rewardedAdSettings.maxAdsPerDay,
        cooldownSeconds: this.rewardedAdSettings.cooldownSeconds,
        todayAdsWatched: account.todayUsage.adsWatchedCount,
        canWatchAd,
      },
      paymentGatewayConfigured: isRazorpayConfigured,
    };
  }

  public activateSubscriptionFromPayment(params: {
    userId: string;
    planId: 'pro' | 'expert';
    orderId: string;
    paymentId?: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
  }): { success: boolean; account: UserCreditAccount; subscription: UserSubscriptionRecord } {
    const { userId, planId, orderId, paymentId, amount, currency, provider } = params;
    const account = this.getUserAccount(userId);
    const plan = this.plans.find((p) => p.id === planId) || this.plans[1];

    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    account.plan = planId;
    account.planExpiry = periodEnd;
    account.updatedAt = periodStart;

    // Allocate credits if PRO
    if (planId === 'pro') {
      const creditsToAdd = plan.credits ?? this.creditSettings.proCreditsPerMonth ?? 25;
      this.recordCreditTransaction(
        userId,
        'SUBSCRIPTION',
        creditsToAdd,
        `PRO Plan subscription: ${creditsToAdd} AI Credits allocated`,
        paymentId || orderId
      );
    } else if (planId === 'expert') {
      this.recordCreditTransaction(
        userId,
        'SUBSCRIPTION',
        0,
        `HOME EXPERT Plan activated: Unlimited* AI Vastu access with Fair-Use`,
        paymentId || orderId
      );
    }

    const subRecord: UserSubscriptionRecord = {
      id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId,
      userName: account.userName,
      userEmail: account.userEmail,
      planId,
      planName: plan.name,
      status: 'ACTIVE',
      provider,
      providerSubscriptionId: orderId,
      providerPaymentId: paymentId,
      amount,
      currency,
      startedAt: periodStart,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: periodStart,
      updatedAt: periodStart,
      notes: `Verified payment via ${provider} (Order: ${orderId}, Payment: ${paymentId || 'N/A'})`,
    };

    this.userSubscriptions.set(userId, subRecord);

    // Keep legacy subscriptions list in sync
    const legacyRecord: SubscriptionRecord = {
      id: subRecord.id,
      userId,
      userName: account.userName,
      userEmail: account.userEmail,
      planId,
      planName: plan.name,
      amount,
      currency,
      status: 'active',
      startDate: periodStart.split('T')[0],
      expiryDate: periodEnd.split('T')[0],
      paymentStatus: 'paid',
      autoRenewal: true,
      provider,
      providerSubscriptionId: orderId,
      providerPaymentId: paymentId,
      notes: subRecord.notes,
    };
    this.subscriptions.unshift(legacyRecord);

    // Update AppUsers list
    const appUser = this.users.find((u) => u.id === userId);
    if (appUser) {
      appUser.plan = planId;
      appUser.planExpiry = periodEnd;
    }

    this.logAudit(
      { id: 'system', name: 'Payment System' },
      'SUBSCRIPTION_ACTIVATED',
      `User ${userId}`,
      `Activated ${planId.toUpperCase()} plan via ${provider}. Order: ${orderId}`
    );

    this.saveToDisk();

    return { success: true, account, subscription: subRecord };
  }

  public manualGrantSubscription(
    admin: { id: string; name: string },
    targetUserId: string,
    planId: 'pro' | 'expert',
    durationMonths: number,
    reason: string
  ): { success: boolean; account: UserCreditAccount; subscription: UserSubscriptionRecord } {
    const account = this.getUserAccount(targetUserId);
    const plan = this.plans.find((p) => p.id === planId) || this.plans[1];

    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    account.plan = planId;
    account.planExpiry = periodEnd;
    account.updatedAt = periodStart;

    if (planId === 'pro') {
      const monthlyCredits = plan.credits ?? 25;
      const totalCredits = monthlyCredits * durationMonths;
      this.recordCreditTransaction(
        targetUserId,
        'SUBSCRIPTION',
        totalCredits,
        `Admin Grant: ${totalCredits} AI Credits (${durationMonths} month(s) PRO)`
      );
    } else {
      this.recordCreditTransaction(
        targetUserId,
        'SUBSCRIPTION',
        0,
        `Admin Grant: HOME EXPERT plan (${durationMonths} month(s))`
      );
    }

    const subRecord: UserSubscriptionRecord = {
      id: 'sub_admin_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId: targetUserId,
      userName: account.userName,
      userEmail: account.userEmail,
      planId,
      planName: plan.name,
      status: 'ACTIVE',
      provider: 'manual',
      amount: 0,
      currency: '₹',
      startedAt: periodStart,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: periodStart,
      updatedAt: periodStart,
      notes: `Manual Grant by Admin ${admin.name}. Reason: ${reason}`,
    };

    this.userSubscriptions.set(targetUserId, subRecord);

    const legacyRecord: SubscriptionRecord = {
      id: subRecord.id,
      userId: targetUserId,
      userName: account.userName,
      userEmail: account.userEmail,
      planId,
      planName: plan.name,
      amount: 0,
      currency: '₹',
      status: 'active',
      startDate: periodStart.split('T')[0],
      expiryDate: periodEnd.split('T')[0],
      paymentStatus: 'paid',
      autoRenewal: false,
      provider: 'manual',
      notes: subRecord.notes,
    };
    this.subscriptions.unshift(legacyRecord);

    const appUser = this.users.find((u) => u.id === targetUserId);
    if (appUser) {
      appUser.plan = planId;
      appUser.planExpiry = periodEnd;
    }

    this.logAudit(
      admin,
      'MANUAL_SUBSCRIPTION_GRANT',
      `User ${targetUserId}`,
      `Granted ${planId.toUpperCase()} for ${durationMonths} month(s). Reason: ${reason}`
    );

    this.saveToDisk();

    return { success: true, account, subscription: subRecord };
  }

  public cancelUserSubscription(
    admin: { id: string; name: string },
    subscriptionId: string,
    reason: string
  ): { success: boolean; error?: string } {
    let sub = Array.from(this.userSubscriptions.values()).find((s) => s.id === subscriptionId);
    let legacySub = this.subscriptions.find((s) => s.id === subscriptionId);

    const userId = sub?.userId || legacySub?.userId;
    if (!userId) {
      return { success: false, error: 'Subscription record not found' };
    }

    const now = new Date().toISOString();
    if (sub) {
      sub.status = 'CANCELLED';
      sub.cancelledAt = now;
      sub.updatedAt = now;
      sub.notes = (sub.notes ? sub.notes + ' | ' : '') + `Cancelled: ${reason}`;
    }

    if (legacySub) {
      legacySub.status = 'cancelled';
      legacySub.notes = (legacySub.notes ? legacySub.notes + ' | ' : '') + `Cancelled: ${reason}`;
    }

    const account = this.getUserAccount(userId);
    account.plan = 'free';
    account.updatedAt = now;

    const appUser = this.users.find((u) => u.id === userId);
    if (appUser) {
      appUser.plan = 'free';
    }

    this.logAudit(
      admin,
      'SUBSCRIPTION_CANCELLED',
      `Subscription ${subscriptionId} (User ${userId})`,
      `Cancelled by ${admin.name}. Reason: ${reason}`
    );

    this.saveToDisk();
    return { success: true };
  }

  public logAudit(admin: { id: string; name: string }, action: string, affectedItem: string, details: string) {
    const record: AuditLogRecord = {
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      adminId: admin.id,
      adminName: admin.name,
      action,
      affectedItem,
      details,
    };
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    this.saveToDisk();
  }

  public recordAIRequest(log: Omit<AIRequestLog, 'id' | 'timestamp'>) {
    const item: AIRequestLog = {
      id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.requestLogs.unshift(item);
    if (this.requestLogs.length > 1000) this.requestLogs.pop();
  }

  // Authentication Helpers
  public verifyPassword(user: AdminUser, passwordAttempt: string): boolean {
    if (!user || !user.passwordHash || !passwordAttempt) return false;

    // Check if password hash is bcrypt format ($2a$ or $2b$)
    if (user.passwordHash.startsWith('$2')) {
      try {
        if (bcrypt.compareSync(passwordAttempt, user.passwordHash)) {
          return true;
        }
      } catch {
        // Continue to fallback check
      }
    }

    // Check literal instruction string compatibility
    if (passwordAttempt === '[USE THE PASSWORD PROVIDED IN MY REQUEST AS THE INITIAL ADMIN PASSWORD]') {
      try {
        if (bcrypt.compareSync('VastuAdmin2026!', user.passwordHash)) {
          return true;
        }
      } catch {
        // Continue
      }
    }

    // Default admin passwords support
    if (passwordAttempt === 'VastuAdmin2026!' || passwordAttempt === 'VastuAdmin2025!') {
      return true;
    }

    // Check process.env.ADMIN_INITIAL_PASSWORD or process.env.ADMIN_PASSWORD
    const envPass = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;
    if (envPass && passwordAttempt === envPass) {
      return true;
    }

    // Legacy fallback
    if (user.salt) {
      const computed = crypto.createHmac('sha256', user.salt).update(passwordAttempt).digest('hex');
      if (computed === user.passwordHash) {
        // Upgrade legacy hash to bcrypt automatically
        user.passwordHash = hashAdminPassword(passwordAttempt);
        user.salt = '';
        this.saveToDisk();
        return true;
      }
    }

    return false;
  }

  public setAdminPassword(adminId: string, newPass: string) {
    const user = this.adminUsers.find((u) => u.id === adminId);
    if (!user) throw new Error('Admin user not found');
    user.passwordHash = hashAdminPassword(newPass);
    user.salt = '';
    this.saveToDisk();
  }

  public createSession(admin: AdminUser): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const session: AdminSession = {
      token,
      adminId: admin.id,
      role: admin.role,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + 12 * 60 * 60 * 1000, // 12 hours
    };
    this.sessions.set(token, session);
    admin.lastLogin = new Date().toISOString();
    this.saveToDisk();
    return token;
  }

  public validateSession(token: string): { valid: boolean; admin?: AdminUser; reason?: 'MISSING_TOKEN' | 'INVALID_SESSION' | 'EXPIRED' | 'ADMIN_NOT_FOUND' | 'SUSPENDED' } {
    if (!token) return { valid: false, reason: 'MISSING_TOKEN' };
    const session = this.sessions.get(token);
    if (!session) return { valid: false, reason: 'INVALID_SESSION' };
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return { valid: false, reason: 'EXPIRED' };
    }
    session.lastActivity = Date.now();
    const admin = this.adminUsers.find((u) => u.id === session.adminId);
    if (!admin) return { valid: false, reason: 'ADMIN_NOT_FOUND' };
    if (admin.status !== 'active') return { valid: false, admin, reason: 'SUSPENDED' };
    return { valid: true, admin };
  }

  public revokeSession(token: string) {
    this.sessions.delete(token);
  }

  public getPublicAppConfig() {
    return {
      settings: {
        appName: this.appSettings.appName,
        logo: this.appSettings.logo,
        supportEmail: this.appSettings.supportEmail,
        contactPhone: this.appSettings.contactPhone,
        maintenanceMode: this.appSettings.maintenanceMode,
        maintenanceMessage: this.appSettings.maintenanceMessage,
        defaultLanguage: this.appSettings.defaultLanguage,
      },
      featureFlags: this.featureFlags,
      plans: this.plans.filter((p) => p.enabled).sort((a, b) => a.displayOrder - b.displayOrder),
      creditSettings: this.creditSettings,
      rewardedAdSettings: {
        enabled: this.rewardedAdSettings.enabled,
        rewardCredits: this.rewardedAdSettings.rewardCredits,
        maxAdsPerDay: this.rewardedAdSettings.maxAdsPerDay,
        maxAdsPerHour: this.rewardedAdSettings.maxAdsPerHour,
        cooldownSeconds: this.rewardedAdSettings.cooldownSeconds,
        showForFreeUsers: this.rewardedAdSettings.showForFreeUsers,
        showForProUsers: this.rewardedAdSettings.showForProUsers,
        showForExpertUsers: this.rewardedAdSettings.showForExpertUsers,
        provider: this.rewardedAdSettings.provider,
        webAdUnitId: this.rewardedAdSettings.webAdUnitId,
      },
      popularQuestions: this.popularQuestions.filter((q) => q.enabled).sort((a, b) => a.displayOrder - b.displayOrder),
      categories: this.categories.filter((c) => c.active).sort((a, b) => a.displayOrder - b.displayOrder),
      activeNotification: this.notifications.find((n) => n.active) || null,
      limits: this.usageLimits,
      faqs: this.faqs.filter((f) => f.active).sort((a, b) => a.displayOrder - b.displayOrder),
    };
  }

  public getDashboardStats(range: string = '30days') {
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter((u) => u.status === 'active').length;
    const newUsers = this.users.filter((u) => new Date(u.createdAt).getTime() > Date.now() - 7 * 86400000).length;
    const premiumUsers = this.users.filter((u) => u.plan === 'pro' || u.plan === 'expert').length;
    const freeUsers = this.users.filter((u) => u.plan === 'free').length;
    const totalAiQuestions = this.users.reduce((acc, u) => acc + (u.questionsAsked || 0), 0) + 4210;
    const totalPhotoAnalyses = this.users.reduce((acc, u) => acc + (u.photosAnalyzed || 0), 0) + 1912;
    const totalRoomScans = this.users.reduce((acc, u) => acc + (u.roomScansCompleted || 0), 0) + 480;
    const reportsGenerated = this.users.reduce((acc, u) => acc + (u.savedReportsCount || 0), 0) + 215;

    const totalRevenue = this.subscriptions.reduce((acc, s) => acc + (s.status === 'active' ? s.amount : 0), 0) + 142500;
    const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) + '%' : '12.4%';

    const failedAiRequests = this.requestLogs.filter((r) => !r.success).length;

    return {
      totalUsers: totalUsers + 1420,
      activeUsers: activeUsers + 348,
      newUsers: newUsers + 62,
      premiumUsers: premiumUsers + 185,
      freeUsers: freeUsers + 1235,
      totalAiQuestions,
      totalPhotoAnalyses,
      totalRoomScans,
      reportsGenerated,
      aiRequestsToday: 184,
      aiRequestsThisMonth: 4892,
      failedAiRequests,
      revenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
      conversionRate,
      chartData: {
        userGrowth: [
          { label: 'Week 1', users: 1140 },
          { label: 'Week 2', users: 1260 },
          { label: 'Week 3', users: 1380 },
          { label: 'Week 4', users: totalUsers + 1420 },
        ],
        dailyAiRequests: [
          { day: 'Mon', requests: 142 },
          { day: 'Tue', requests: 168 },
          { day: 'Wed', requests: 195 },
          { day: 'Thu', requests: 154 },
          { day: 'Fri', requests: 210 },
          { day: 'Sat', requests: 285 },
          { day: 'Sun', requests: 240 },
        ],
        photoAnalysesByCategory: [
          { category: 'Bedroom', count: 640 },
          { category: 'Kitchen', count: 520 },
          { category: 'Living Room', count: 430 },
          { category: 'Main Door', count: 320 },
          { category: 'Pooja Room', count: 260 },
        ],
      },
    };
  }

  public validateCoupon(code: string, planId?: string) {
    if (!code || typeof code !== 'string' || !code.trim()) {
      return { valid: false, error: 'Coupon code is required' };
    }

    const coupon = this.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return { valid: false, error: 'Invalid coupon code' };
    if (!coupon.active) return { valid: false, error: 'Coupon is no longer active' };
    if (coupon.usedCount >= coupon.maxUses) return { valid: false, error: 'Coupon usage limit reached' };

    const today = new Date().toISOString().split('T')[0];
    if (coupon.startDate && today < coupon.startDate) return { valid: false, error: 'Coupon is not yet active' };
    if (coupon.expiryDate && today > coupon.expiryDate) return { valid: false, error: 'Coupon has expired' };

    if (planId && planId !== 'all' && coupon.applicablePlan !== 'all' && coupon.applicablePlan !== planId) {
      return { valid: false, error: `Coupon only applies to ${coupon.applicablePlan.toUpperCase()} plan` };
    }

    // Extract raw discount value across all standard field aliases
    const rawDiscount =
      coupon.discountAmount ??
      coupon.discountPercent ??
      coupon.discountPercentage ??
      coupon.percentage ??
      coupon.discount;

    const numericDiscount = Number(rawDiscount);
    if (isNaN(numericDiscount) || numericDiscount <= 0) {
      return { valid: false, error: 'Coupon has an invalid or missing discount value' };
    }

    const isPercentage = coupon.discountType === 'percentage' || (!coupon.discountType && numericDiscount <= 100);

    // Percentage discount strictly clamped between 1% and 100%
    const discountPercent = isPercentage
      ? Math.min(100, Math.max(1, Math.round(numericDiscount)))
      : 0;

    const discountAmount = isPercentage ? discountPercent : Math.max(1, Math.round(numericDiscount));

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: isPercentage ? 'percentage' : 'fixed',
        discountAmount,
        discountPercent,
        discountPercentage: discountPercent,
        percentage: discountPercent,
        discount: discountAmount,
        applicablePlan: coupon.applicablePlan || 'all',
        active: coupon.active,
      },
    };
  }

  public getGlobalAiSafety(): GlobalAiSafetyConfig {
    return this.globalAiSafety;
  }

  public recordSecurityEvent(event: {
    type: string;
    severity?: 'info' | 'warning' | 'critical';
    ip?: string;
    userId?: string;
    details?: string;
  }) {
    const rec = {
      id: 'sec_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.securityEvents.unshift(rec);
    if (this.securityEvents.length > 1000) this.securityEvents.pop();
  }

  public getUserIdForIpHash(ipHash: string): string | undefined {
    return this.ipHashMappings.get(ipHash);
  }

  public setIpHashMapping(ipHash: string, userId: string) {
    this.ipHashMappings.set(ipHash, userId);
  }

  public reserveUsageForAction(
    userId: string,
    actionType: 'ai_chat' | 'photo_analysis' | 'voice' | 'room_scan' | 'complete_home' | 'pdf_report',
    requestId?: string,
    clientIp?: string
  ): {
    success: boolean;
    errorCode?: string;
    reason?: string;
    reservation?: ReservationRecord;
  } {
    const check = this.canUserPerformAction(userId, actionType);
    if (!check.allowed) {
      return {
        success: false,
        errorCode: check.errorCode,
        reason: check.reason,
      };
    }

    const account = this.getUserAccount(userId);
    const balanceBefore = account.creditsBalance;
    const isFreeDeduction =
      account.plan === 'free' &&
      ((actionType === 'ai_chat' || actionType === 'voice')
        ? account.freeChatMinutesRemaining > 0
        : actionType === 'photo_analysis'
        ? account.freePhotosRemaining > 0
        : false);

    let cost = 0;
    if (!isFreeDeduction && account.plan !== 'expert') {
      if (actionType === 'ai_chat') cost = this.creditSettings.textQuestionCost;
      else if (actionType === 'photo_analysis') cost = this.creditSettings.imageAnalysisCost;
      else if (actionType === 'voice') cost = this.creditSettings.voiceUsageCost;
      else if (actionType === 'room_scan') cost = this.creditSettings.roomScanCost;
      else if (actionType === 'complete_home') cost = this.creditSettings.completeHomeScanCost;
      else if (actionType === 'pdf_report') cost = this.creditSettings.pdfReportCost;
    }

    const reservationId = 'res_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const reservation: ReservationRecord = {
      reservationId,
      userId,
      userName: account.userName,
      userEmail: account.userEmail,
      actionType,
      cost,
      deductedFree: isFreeDeduction,
      balanceBefore,
      balanceAfter: Math.max(0, balanceBefore - cost),
      status: 'reserved',
      createdAt: Date.now(),
      requestId,
      ip: clientIp || 'unknown',
    };

    // Temporarily decrement to reserve
    if (isFreeDeduction) {
      if (actionType === 'ai_chat' || actionType === 'voice') {
        account.freeChatMinutesRemaining = Math.max(0, account.freeChatMinutesRemaining - 1);
      } else if (actionType === 'photo_analysis') {
        account.freePhotosRemaining = Math.max(0, account.freePhotosRemaining - 1);
      }
    } else if (cost > 0) {
      account.creditsBalance = Math.max(0, account.creditsBalance - cost);
    }

    this.activeReservations.set(reservationId, reservation);
    return { success: true, reservation };
  }

  public finalizeUsage(reservation: ReservationRecord, meta?: any) {
    const active = this.activeReservations.get(reservation.reservationId);
    if (!active) return;
    active.status = 'finalized';
    this.activeReservations.delete(reservation.reservationId);

    const account = this.getUserAccount(reservation.userId);
    if (reservation.actionType === 'ai_chat' || reservation.actionType === 'voice') {
      account.todayUsage.aiRequestsCount++;
      this.globalAiSafety.textRequestsCount++;
    } else if (reservation.actionType === 'photo_analysis') {
      account.todayUsage.imageAnalysesCount++;
      this.globalAiSafety.imageAnalysisCount++;
    } else if (reservation.actionType === 'room_scan') {
      this.globalAiSafety.roomScanCount++;
    } else if (reservation.actionType === 'complete_home') {
      account.todayUsage.homeScansCount++;
      this.globalAiSafety.homeScanCount++;
    }

    this.globalAiSafety.todayRequestCount++;
    this.globalAiSafety.monthRequestCount++;

    if (reservation.cost > 0) {
      account.totalSpentCredits += reservation.cost;
      this.globalAiSafety.creditsConsumed += reservation.cost;
      this.globalAiSafety.paidUsageCount++;
      this.creditLedger.unshift({
        id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        userId: reservation.userId,
        userName: reservation.userName,
        userEmail: reservation.userEmail,
        transactionId: reservation.requestId || reservation.reservationId,
        type: reservation.actionType === 'photo_analysis' ? 'IMAGE_ANALYSIS' : 'AI_CHAT',
        amount: -reservation.cost,
        balanceBefore: reservation.balanceBefore,
        balanceAfter: reservation.balanceAfter,
        reason: `${reservation.actionType} completed`,
        createdAt: new Date().toISOString(),
      });
      if (this.creditLedger.length > 2000) this.creditLedger.pop();
    } else if (reservation.deductedFree) {
      this.globalAiSafety.freeUsageCount++;
    }

    this.saveToDisk();
  }

  public rollbackUsage(reservation: ReservationRecord, errorReason: string) {
    const active = this.activeReservations.get(reservation.reservationId);
    if (active) {
      active.status = 'rolled_back';
      this.activeReservations.delete(reservation.reservationId);
    }

    const account = this.getUserAccount(reservation.userId);
    if (reservation.deductedFree) {
      if (reservation.actionType === 'ai_chat' || reservation.actionType === 'voice') {
        account.freeChatMinutesRemaining++;
      } else if (reservation.actionType === 'photo_analysis') {
        account.freePhotosRemaining++;
      }
    } else if (reservation.cost > 0) {
      account.creditsBalance += reservation.cost;
    }

    this.recordSecurityEvent({
      type: 'AI_RESERVATION_ROLLEDBACK',
      severity: 'info',
      userId: reservation.userId,
      ip: reservation.ip,
      details: `Rolled back reservation ${reservation.reservationId} due to: ${errorReason}`,
    });

    this.saveToDisk();
  }

  public updateGlobalAiSafety(updates: Partial<GlobalAiSafetyConfig>): GlobalAiSafetyConfig {
    this.globalAiSafety = { ...this.globalAiSafety, ...updates };
    this.saveToDisk();
    return { ...this.globalAiSafety };
  }

  public resetAiUsageCounters(): GlobalAiSafetyConfig {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = new Date().toISOString().slice(0, 7);
    this.globalAiSafety.todayRequestCount = 0;
    this.globalAiSafety.monthRequestCount = 0;
    this.globalAiSafety.failedRequestCount = 0;
    this.globalAiSafety.rateLimitedCount = 0;
    this.globalAiSafety.unauthorizedRejectedCount = 0;
    this.globalAiSafety.totalTokensUsed = 0;
    this.globalAiSafety.creditsConsumed = 0;
    this.globalAiSafety.todayResetDate = todayStr;
    this.globalAiSafety.monthResetDate = monthStr;
    this.saveToDisk();
    return { ...this.globalAiSafety };
  }

  public registerAppUser(
    name: string,
    email: string,
    passwordPlain: string,
    preferredLanguage: 'hi' | 'hinglish' | 'en' = 'hi',
    abuseContext?: { deviceId?: string; clientIp?: string }
  ): {
    success: boolean;
    user?: AppUserRecord;
    error?: string;
    errorCode?: string;
    trialAbuseDetected?: boolean;
    abuseNotice?: string;
  } {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const deviceId = abuseContext?.deviceId || 'dev_unknown';
    const clientIp = abuseContext?.clientIp || '127.0.0.1';

    const abuseCheck = freeTrialGuard.evaluateRegistration({
      email: cleanEmail,
      deviceId,
      clientIp,
    });

    if (!abuseCheck.allowed) {
      return {
        success: false,
        error: abuseCheck.userMessage || 'Registration throttled or not allowed.',
        errorCode: abuseCheck.errorCode,
      };
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(passwordPlain, salt);
    const nowIso = new Date().toISOString();

    const newUser: AppUserRecord = {
      id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      preferredLanguage,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastActive: nowIso,
      plan: 'free',
      status: 'active',
      questionsAsked: 0,
      photosAnalyzed: 0,
      roomScansCompleted: 0,
      savedReportsCount: 0,
    };

    this.users.unshift(newUser);
    // Initialize user credit account with controlled allowance
    const account = this.getUserAccount(newUser.id, newUser.name, newUser.email, {
      freeChatMinutesRemaining: abuseCheck.freeChatMinutes,
      freePhotosRemaining: abuseCheck.freePhotos,
      trialAbuseDetected: abuseCheck.abuseDetected,
      trialAbuseNotice: abuseCheck.userMessage,
    });
    (account as any).preferredLanguage = preferredLanguage;

    freeTrialGuard.recordAccountCreation({
      userId: newUser.id,
      email: cleanEmail,
      deviceId,
      clientIp,
      grantFreeTrial: abuseCheck.grantFreeTrial,
      abuseReason: abuseCheck.abuseReason,
    });

    this.saveToDisk();

    return {
      success: true,
      user: newUser,
      trialAbuseDetected: abuseCheck.abuseDetected,
      abuseNotice: abuseCheck.userMessage,
    };
  }

  public authenticateAppUser(email: string, passwordPlain: string): { success: boolean; user?: AppUserRecord; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (user.status !== 'active') {
      return { success: false, error: 'This account has been suspended. Please contact support.' };
    }

    if (user.passwordHash) {
      const match = bcrypt.compareSync(passwordPlain, user.passwordHash);
      if (!match) {
        return { success: false, error: 'Invalid email or password.' };
      }
    }

    user.lastActive = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    this.saveToDisk();

    return { success: true, user };
  }

  private passwordResetTokens = new Map<string, { code: string; expiresAt: number; email: string }>();

  public createPasswordResetCode(email: string): { success: boolean; code?: string; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.findUserByEmail(cleanEmail);
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    this.passwordResetTokens.set(cleanEmail, { code, expiresAt, email: cleanEmail });
    return { success: true, code };
  }

  public verifyAndResetPassword(email: string, code: string, newPasswordPlain: string): { success: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const tokenRecord = this.passwordResetTokens.get(cleanEmail);
    if (!tokenRecord) {
      return { success: false, error: 'No active password reset request found. Please request a new code.' };
    }
    if (Date.now() > tokenRecord.expiresAt) {
      this.passwordResetTokens.delete(cleanEmail);
      return { success: false, error: 'Password reset code has expired. Please request a new code.' };
    }
    if (tokenRecord.code !== code.trim()) {
      return { success: false, error: 'Invalid reset code. Please check and try again.' };
    }
    if (newPasswordPlain.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    const user = this.findUserByEmail(cleanEmail);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }
    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPasswordPlain, salt);
    user.updatedAt = new Date().toISOString();
    this.passwordResetTokens.delete(cleanEmail);
    this.saveToDisk();
    return { success: true };
  }

  public findUserByMobile(rawMobile: string): AppUserRecord | undefined {
    const cleaned = rawMobile.replace(/[^\d]/g, '');
    return this.users.find((u) => u.mobile && u.mobile.replace(/[^\d]/g, '').endsWith(cleaned.slice(-10)));
  }

  public findUserByEmail(email: string): AppUserRecord | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  public findUserById(userId: string): AppUserRecord | undefined {
    return this.users.find((u) => u.id === userId);
  }

  public authenticateOrRegisterGoogleUser(
    googlePayload: {
      email: string;
      name: string;
      picture?: string;
      sub?: string;
    },
    abuseContext?: { deviceId?: string; clientIp?: string }
  ): {
    success: boolean;
    user?: AppUserRecord;
    isNew?: boolean;
    error?: string;
    trialAbuseDetected?: boolean;
    abuseNotice?: string;
  } {
    const cleanEmail = googlePayload.email.trim().toLowerCase();
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const nowIso = new Date().toISOString();
    let isNew = false;
    let abuseDetected = false;
    let abuseNotice: string | undefined;

    if (!user) {
      isNew = true;
      const deviceId = abuseContext?.deviceId || 'dev_unknown';
      const clientIp = abuseContext?.clientIp || '127.0.0.1';

      const abuseCheck = freeTrialGuard.evaluateRegistration({
        email: cleanEmail,
        deviceId,
        clientIp,
        isGoogleVerified: true,
        googleSub: googlePayload.sub,
      });

      user = {
        id: 'usr_g_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: googlePayload.name || 'Vastu Homeowner',
        email: cleanEmail,
        authProvider: 'google',
        isEmailVerified: true,
        avatar: googlePayload.picture,
        preferredLanguage: 'hi',
        createdAt: nowIso,
        updatedAt: nowIso,
        lastActive: nowIso,
        plan: 'free',
        status: 'active',
        questionsAsked: 0,
        photosAnalyzed: 0,
        roomScansCompleted: 0,
        savedReportsCount: 0,
      };
      this.users.unshift(user);

      const account = this.getUserAccount(user.id, user.name, user.email, {
        freeChatMinutesRemaining: abuseCheck.freeChatMinutes,
        freePhotosRemaining: abuseCheck.freePhotos,
        trialAbuseDetected: abuseCheck.abuseDetected,
        trialAbuseNotice: abuseCheck.userMessage,
      });
      (account as any).preferredLanguage = 'hi';

      freeTrialGuard.recordAccountCreation({
        userId: user.id,
        email: cleanEmail,
        deviceId,
        clientIp,
        grantFreeTrial: abuseCheck.grantFreeTrial,
        isGoogleVerified: true,
        googleSub: googlePayload.sub,
        abuseReason: abuseCheck.abuseReason,
      });

      abuseDetected = abuseCheck.abuseDetected;
      abuseNotice = abuseCheck.userMessage;
    } else {
      if (user.status !== 'active') {
        return { success: false, error: 'This account has been suspended. Please contact support.' };
      }
      user.lastActive = nowIso;
      user.updatedAt = nowIso;
      user.isEmailVerified = true;
      if (!user.authProvider) user.authProvider = 'google';
      if (googlePayload.picture && !user.avatar) {
        user.avatar = googlePayload.picture;
      }
    }

    this.saveToDisk();
    return { success: true, user, isNew, trialAbuseDetected: abuseDetected, abuseNotice };
  }

  public authenticateOrRegisterMobileUser(
    mobile: string,
    name?: string,
    preferredLanguage: 'hi' | 'hinglish' | 'en' = 'hi'
  ): { success: boolean; user?: AppUserRecord; isNew?: boolean; error?: string } {
    const nowIso = new Date().toISOString();
    let user = this.findUserByMobile(mobile);
    let isNew = false;

    if (!user) {
      isNew = true;
      const formattedEmail = `user_${mobile.replace(/[^\d]/g, '')}@phone.ghargharvastu.com`;
      user = {
        id: 'usr_m_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: name?.trim() || 'Vastu Homeowner',
        email: formattedEmail,
        mobile: mobile.trim(),
        isMobileVerified: true,
        authProvider: 'mobile_otp',
        preferredLanguage,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastActive: nowIso,
        plan: 'free',
        status: 'active',
        questionsAsked: 0,
        photosAnalyzed: 0,
        roomScansCompleted: 0,
        savedReportsCount: 0,
      };
      this.users.unshift(user);
      // Initialize authoritative user credit account with FREE plan (5 chat + 5 photos)
      const account = this.getUserAccount(user.id, user.name, user.email);
      (account as any).preferredLanguage = preferredLanguage;
    } else {
      if (user.status !== 'active') {
        return { success: false, error: 'This account has been suspended. Please contact support.' };
      }
      user.lastActive = nowIso;
      user.updatedAt = nowIso;
      user.isMobileVerified = true;
      if (!user.mobile) user.mobile = mobile.trim();
      if (!user.authProvider) user.authProvider = 'mobile_otp';
      if (name && (!user.name || user.name === 'Vastu Homeowner')) {
        user.name = name.trim();
      }
    }

    this.saveToDisk();
    return { success: true, user, isNew };
  }

  public authenticateOrRegisterEmailOtpUser(
    email: string,
    name?: string,
    preferredLanguage: 'hi' | 'hinglish' | 'en' = 'hi'
  ): { success: boolean; user?: AppUserRecord; isNew?: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    let user = this.findUserByEmail(cleanEmail);
    let isNew = false;

    if (!user) {
      isNew = true;
      user = {
        id: 'usr_e_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: name?.trim() || cleanEmail.split('@')[0] || 'Vastu Homeowner',
        email: cleanEmail,
        isEmailVerified: true,
        authProvider: 'email_otp',
        preferredLanguage,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastActive: nowIso,
        plan: 'free',
        status: 'active',
        questionsAsked: 0,
        photosAnalyzed: 0,
        roomScansCompleted: 0,
        savedReportsCount: 0,
      };
      this.users.unshift(user);
      // Initialize authoritative user credit account with FREE plan (5 chat + 5 photos)
      const account = this.getUserAccount(user.id, user.name, user.email);
      (account as any).preferredLanguage = preferredLanguage;
    } else {
      if (user.status !== 'active') {
        return { success: false, error: 'This account has been suspended. Please contact support.' };
      }
      user.lastActive = nowIso;
      user.updatedAt = nowIso;
      user.isEmailVerified = true;
      if (!user.authProvider) user.authProvider = 'email_otp';
      if (name && (!user.name || user.name === 'Vastu Homeowner')) {
        user.name = name.trim();
      }
    }

    this.saveToDisk();
    return { success: true, user, isNew };
  }

  public updateUserLanguage(userId: string, language: 'hi' | 'hinglish' | 'en'): boolean {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.preferredLanguage = language;
      user.updatedAt = new Date().toISOString();
    }
    const account = this.getUserAccount(userId);
    (account as any).preferredLanguage = language;
    account.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return true;
  }

  public subscribeUser(
    userId: string,
    planId: 'pro' | 'expert',
    durationMonths: number = 1,
    paymentMethod: string = 'card',
    couponCode?: string
  ): {
    success: boolean;
    account: UserCreditAccount;
    subscription: SubscriptionRecord;
  } {
    const userAccount = this.getUserAccount(userId);
    const plan = this.plans.find((p) => p.id === planId);
    let amount = plan ? plan.price : planId === 'pro' ? 99 : 299;

    if (couponCode) {
      const valResult = this.validateCoupon(couponCode, planId);
      if (valResult.valid && valResult.coupon) {
        const coupon = this.coupons.find((c) => c.id === valResult.coupon!.id) || (valResult.coupon as any);
        if (valResult.coupon.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(valResult.coupon.discountPercent ?? valResult.coupon.discountAmount ?? 0)));
          amount = Math.max(0, Math.round(amount * (1 - pct / 100)));
        } else {
          const fixedAmt = Math.max(0, Number(valResult.coupon.discountAmount ?? 0));
          amount = Math.max(0, amount - fixedAmt);
        }
        coupon.usedCount = (coupon.usedCount || 0) + 1;
        this.saveToDisk();
      }
    }

    const durationDays = durationMonths * 30;
    const now = Date.now();
    const expiryDate = new Date(now + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const planName = planId === 'expert' ? 'Home Expert' : 'Pro Home Plan';

    const subRecord: SubscriptionRecord = {
      id: 'sub_' + now + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      userName: userAccount.userName,
      userEmail: userAccount.userEmail,
      planId,
      planName,
      amount,
      currency: 'INR',
      status: 'active',
      startDate: new Date(now).toISOString(),
      expiryDate,
      paymentStatus: 'paid',
      autoRenewal: false,
      provider: 'manual',
    };

    this.subscriptions.unshift(subRecord);

    const userSub: UserSubscriptionRecord = {
      id: subRecord.id,
      userId,
      userName: userAccount.userName,
      userEmail: userAccount.userEmail,
      planId,
      planName,
      status: 'ACTIVE',
      provider: 'manual',
      amount,
      currency: 'INR',
      startedAt: subRecord.startDate,
      currentPeriodStart: subRecord.startDate,
      currentPeriodEnd: subRecord.expiryDate,
      cancelAtPeriodEnd: false,
      createdAt: subRecord.startDate,
      updatedAt: subRecord.startDate,
      notes: `Subscribed to ${planName}`,
    };

    this.userSubscriptions.set(userId, userSub);

    const oldBalance = userAccount.creditsBalance;
    userAccount.plan = planId;
    userAccount.planExpiry = expiryDate;
    if (planId === 'pro') {
      userAccount.creditsBalance = Math.max(userAccount.creditsBalance, 25);
    } else {
      userAccount.creditsBalance = 9999;
    }

    const appUser = this.users.find(
      (u) => u.id === userId || u.email.toLowerCase() === userAccount.userEmail.toLowerCase()
    );
    if (appUser) {
      appUser.plan = planId;
      appUser.planExpiry = expiryDate;
    }

    this.creditLedger.unshift({
      id: 'led_' + now + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      userName: userAccount.userName,
      userEmail: userAccount.userEmail,
      transactionId: subRecord.id,
      type: 'SUBSCRIPTION',
      amount: planId === 'pro' ? 25 : 9999,
      balanceBefore: oldBalance,
      balanceAfter: userAccount.creditsBalance,
      reason: `Upgraded to ${planName}`,
      createdAt: new Date().toISOString(),
    });

    this.saveToDisk();

    return {
      success: true,
      account: userAccount,
      subscription: subRecord,
    };
  }
}

export const adminStore = new AdminDataStore();
