export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface ProactiveIssue {
  id: string;
  object: string;
  issue: string;
  vastuPrinciple: string;
  recommendation: string;
  alternative: string;
  confidence: 'High' | 'Medium' | 'Needs confirmation';
  directionCheckNeeded: boolean;
}

export interface DirectionStatus {
  needed: boolean;
  currentDirection: CardinalDirection | null;
  instruction: string;
}

export interface PhotoAnalysisResult {
  roomType: string;
  detectedObjects: string[];
  observations: string;
  traditionalVastuGuidance: string;
  proactiveIssues: ProactiveIssue[];
  directionStatus: DirectionStatus;
  recommendation: string;
  easyAlternatives: string[];
  confidence: 'High' | 'Medium' | 'Low';
  disclaimer: string;
  timestamp?: number;
  id?: string;
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachedImage?: string;
  direction?: CardinalDirection;
  suggestedQuestions?: string[];
  needsPhoto?: boolean;
  needsDirection?: boolean;
  category?: string;
  isError?: boolean;
  isStreaming?: boolean;
  failedQuery?: string;
  failedImage?: string | null;
  errorCode?: string;
  modelUsed?: string;
}

export interface VastuCategory {
  id: string;
  name: string;
  hindiName: string;
  icon: string;
  description: string;
  keyRule: string;
  idealDirections: CardinalDirection[];
}

export interface PopularQuestion {
  id: string;
  question: string;
  category: string;
  shortAnswer: string;
  detailedGuidance: string;
  idealDirection?: CardinalDirection;
}

export interface RoomScore {
  name: string;
  score: number;
  status: 'Excellent' | 'Good' | 'Review';
  notes: string;
}

export interface PriorityImprovement {
  room: string;
  item: string;
  action: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface HomeProjectReport {
  homeName: string;
  propertyType: string;
  overallScore: number;
  scoreLabel: string;
  positiveAreas: string[];
  areasToReview: string[];
  priorityImprovements: PriorityImprovement[];
  roomScores: RoomScore[];
  summaryReport: string;
  createdAt: number;
}

export interface HomeRoomEntry {
  id: string;
  name: string;
  type: string;
  direction: CardinalDirection;
  photoBase64?: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
  tier: 'free' | 'pro' | 'expert';
  homeName: string;
  city: string;
  propertyType: string;
  savedAnalyses: PhotoAnalysisResult[];
  savedReports: HomeProjectReport[];
  queriesRemaining: number;
  photosRemaining: number;
  preferredLanguage?: 'hi' | 'hinglish' | 'en';
  createdAt?: string;
  updatedAt?: string;
  // Enhanced server-backed monetization fields
  creditsBalance?: number;
  freeChatMinutesRemaining?: number;
  freePhotosRemaining?: number;
  planExpiry?: string;
  showAds?: boolean;
  mobile?: string;
  avatar?: string;
  authProvider?: string;
  isMobileVerified?: boolean;
  isEmailVerified?: boolean;
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

export interface ActionEntitlementResult {
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

