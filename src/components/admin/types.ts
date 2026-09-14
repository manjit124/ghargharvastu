export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CONTENT_MANAGER' | 'SUPPORT';

export interface AdminUserSanitized {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'active' | 'suspended';
  lastLogin: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  premiumUsers: number;
  freeUsers: number;
  totalAiQuestions: number;
  totalPhotoAnalyses: number;
  totalRoomScans: number;
  reportsGenerated: number;
  aiRequestsToday: number;
  aiRequestsThisMonth: number;
  failedAiRequests: number;
  revenue: string;
  conversionRate: string;
  chartData: {
    userGrowth: { label: string; users: number }[];
    dailyAiRequests: { day: string; requests: number }[];
    photoAnalysesByCategory: { category: string; count: number }[];
  };
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
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
  price: number;
  currency: string;
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
  };
  enabled: boolean;
  featured: boolean;
  displayOrder: number;
  promotionalPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
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

export interface AISettingsConfig {
  provider: string;
  activeModel: string;
  availableModels: string[];
  temperature: number;
  maxResponseLength: number;
  languageBehavior: 'auto_match' | 'english_only' | 'hindi_only';
  imageAnalysisMode: 'standard' | 'deep_audit' | 'fast';
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
  provider?: 'razorpay' | 'system' | 'manual' | 'free';
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
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
  requestType: string;
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

export type PaymentMode = 'TEST' | 'LIVE';
export type PaymentConnectionStatus = 'Connected' | 'Not Connected' | 'Error';

export interface AdminPaymentConfig {
  gateway: string;
  mode: PaymentMode;
  connectionStatus: PaymentConnectionStatus;
  connectionMessage?: string;
  activeKeyIdMasked: string;
  hasActiveSecret: boolean;
  hasActiveWebhook: boolean;
  testConfig: {
    keyIdMasked: string;
    hasKeyId: boolean;
    hasSecret: boolean;
    hasWebhook: boolean;
  };
  liveConfig: {
    keyIdMasked: string;
    hasKeyId: boolean;
    hasSecret: boolean;
    hasWebhook: boolean;
  };
  productionReadiness: {
    isReady: boolean;
    reasons: string[];
    blockers: string[];
  };
  webhookUrl: string;
  activePlans: {
    id: string;
    name: string;
    price: number;
    promotionalPrice?: number;
    currency: string;
    credits?: number;
    billingPeriod: string;
  }[];
}
