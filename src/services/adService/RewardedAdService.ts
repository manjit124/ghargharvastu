import { AdPlatform } from './adPlatform';
import {
  ClientAdConfig,
  AdUserStatus,
  RewardedModalState,
  RewardedSessionResponse,
  RewardedClaimResponse,
} from './adTypes';

type RewardedModalListener = (state: RewardedModalState) => void;

export class RewardedAdService {
  private config: ClientAdConfig | null = null;
  private userStatus: AdUserStatus | null = null;

  private state: RewardedModalState = {
    isOpen: false,
    adUnitId: null,
    rewardAmount: 2,
    testMode: true,
  };

  private listeners: Set<RewardedModalListener> = new Set();

  public subscribe(listener: RewardedModalListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public updateConfig(config: ClientAdConfig, userStatus: AdUserStatus): void {
    this.config = config;
    this.userStatus = userStatus;
  }

  public canWatchRewardedAd(): { eligible: boolean; reason?: string } {
    if (!this.config || !this.userStatus) {
      return { eligible: false, reason: 'Ad service initializing. Please try again in a moment.' };
    }

    if (!this.config.adsEnabled || !this.config.rewardedEnabled) {
      return { eligible: false, reason: 'Rewarded ads are currently unavailable.' };
    }

    if (!this.userStatus.eligibleForAds) {
      return { eligible: false, reason: 'Your subscription already includes an ad-free experience.' };
    }

    if (this.userStatus.remainingAdsToday <= 0) {
      return {
        eligible: false,
        reason: `Daily limit of ${this.config.dailyRewardedAdLimit} rewarded ads reached. Resets at midnight UTC.`,
      };
    }

    if (this.userStatus.cooldownRemainingSeconds > 0) {
      return {
        eligible: false,
        reason: `Please wait ${this.userStatus.cooldownRemainingSeconds}s before watching another ad.`,
      };
    }

    return { eligible: true };
  }

  public async watchAndClaimAd(
    onRewarded?: (reward: number, newBalance: number) => void,
    onError?: (errorMessage: string) => void
  ): Promise<{ rewarded: boolean; creditsGranted?: number; newBalance?: number; error?: string }> {
    return new Promise(async (resolve) => {
      const handleSuccess = (reward: number, newBalance: number) => {
        if (onRewarded) onRewarded(reward, newBalance);
        resolve({ rewarded: true, creditsGranted: reward, newBalance });
      };

      const handleFail = (msg: string) => {
        if (onError) onError(msg);
        resolve({ rewarded: false, error: msg });
      };

      const check = this.canWatchRewardedAd();
      if (!check.eligible) {
        handleFail(check.reason || 'Ad is currently unavailable.');
        return;
      }

      try {
        // 1. Authoritative session creation
        const sessionRes = await fetch('/api/ads/rewarded/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const sessionData: RewardedSessionResponse = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.success || !sessionData.session) {
          throw new Error(sessionData.error || 'Ad load nahi ho paya. Please thodi der baad try karein.');
        }

        const activeSession = sessionData.session;
        const rewardAmount = sessionData.rewardCredits || this.config?.rewardedCreditAmount || 2;

        // Report ad loaded telemetry
        this.reportTelemetry('ad_loaded');

        // 2. Playback based on environment
        if (AdPlatform.isNativeAndroid() && window.AndroidAdMob && window.AndroidAdMob.showRewarded) {
          // Native Android Bridge integration
          const callbackId = 'vastu_reward_cb_' + Date.now();
          (window as any)[callbackId] = async (nativeSuccess: boolean) => {
            delete (window as any)[callbackId];
            if (nativeSuccess) {
              await this.claimReward(activeSession.sessionId, rewardAmount, handleSuccess, handleFail);
            } else {
              this.reportTelemetry('ad_failed');
              handleFail('Ad load nahi ho paya. Please thodi der baad try karein.');
            }
          };

          window.AndroidAdMob.showRewarded(activeSession.adUnitId, callbackId);
        } else {
          // Web / PWA Test Player Modal
          this.state = {
            isOpen: true,
            adUnitId: activeSession.adUnitId,
            rewardAmount,
            testMode: activeSession.testMode,
            onComplete: async () => {
              this.closeModal();
              await this.claimReward(activeSession.sessionId, rewardAmount, handleSuccess, handleFail);
            },
            onCancel: () => {
              this.closeModal();
              this.reportTelemetry('ad_failed');
              handleFail('Ad was cancelled. No credits granted.');
            },
          };
          this.notify();
        }
      } catch (err: any) {
        this.reportTelemetry('ad_failed');
        handleFail(err.message || 'Ad load nahi ho paya. Please thodi der baad try karein.');
      }
    });
  }

  private async claimReward(
    sessionId: string,
    expectedReward: number,
    onRewarded: (reward: number, newBalance: number) => void,
    onError: (errorMessage: string) => void
  ): Promise<void> {
    try {
      const idempotencyKey = 'claim_' + sessionId;
      const claimRes = await fetch('/api/ads/rewarded/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          idempotencyKey,
          networkReference: 'Google Mobile Ads SDK (Official Android Test Ad)',
        }),
      });

      const claimData: RewardedClaimResponse = await claimRes.json();
      if (!claimRes.ok || !claimData.success) {
        throw new Error(claimData.error || 'Failed to verify ad reward.');
      }

      // Update local status
      if (this.userStatus) {
        this.userStatus.adsWatchedToday++;
        this.userStatus.remainingAdsToday = Math.max(0, this.userStatus.remainingAdsToday - 1);
        this.userStatus.cooldownRemainingSeconds = this.config?.rewardedCooldownSeconds || 60;
      }

      onRewarded(claimData.rewardGranted || expectedReward, claimData.newBalance);
    } catch (err: any) {
      onError(err.message || 'Ad reward could not be verified.');
    }
  }

  public closeModal(): void {
    this.state = {
      isOpen: false,
      adUnitId: null,
      rewardAmount: 2,
      testMode: true,
      onComplete: undefined,
      onCancel: undefined,
    };
    this.notify();
  }

  private async reportTelemetry(event: string): Promise<void> {
    try {
      await fetch('/api/ads/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
    } catch {
      // Telemetry errors are non-blocking
    }
  }
}
