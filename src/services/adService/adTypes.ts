export type AdPlatformType = 'android_native' | 'web_pwa';

export interface ClientAdConfig {
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
  warnings?: string[];
}

export interface AdUserStatus {
  plan: 'free' | 'pro' | 'expert';
  eligibleForAds: boolean;
  adsWatchedToday: number;
  remainingAdsToday: number;
  cooldownRemainingSeconds: number;
}

export interface RewardedSessionResponse {
  success: boolean;
  session?: {
    sessionId: string;
    userId: string;
    adUnitId: string;
    testMode: boolean;
    expiresAt: number;
  };
  rewardCredits?: number;
  testMode?: boolean;
  error?: string;
}

export interface RewardedClaimResponse {
  success: boolean;
  rewardGranted: number;
  newBalance: number;
  account?: any;
  error?: string;
}

export interface InterstitialState {
  isShowing: boolean;
  adUnitId: string | null;
  testMode: boolean;
  onDismiss?: () => void;
}

export interface RewardedModalState {
  isOpen: boolean;
  adUnitId: string | null;
  rewardAmount: number;
  testMode: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

export interface BannerAdState {
  visible: boolean;
  format: 'fixed' | 'anchored_adaptive';
  position: 'top' | 'bottom';
  adUnitId: string | null;
  testMode: boolean;
}
