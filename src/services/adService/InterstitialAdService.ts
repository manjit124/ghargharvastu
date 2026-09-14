import { AdPlatform } from './adPlatform';
import { ClientAdConfig, AdUserStatus, InterstitialState } from './adTypes';

type InterstitialListener = (state: InterstitialState) => void;

export class InterstitialAdService {
  private config: ClientAdConfig | null = null;
  private userStatus: AdUserStatus | null = null;

  private actionCount = 0;
  private lastShownAt = 0;
  private state: InterstitialState = {
    isShowing: false,
    adUnitId: null,
    testMode: true,
  };

  private listeners: Set<InterstitialListener> = new Set();

  public subscribe(listener: InterstitialListener): () => void {
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

  public canShowInterstitial(contextName?: string): boolean {
    if (!this.config || !this.userStatus) return false;
    if (!this.config.adsEnabled || !this.config.interstitialEnabled) return false;
    if (!this.userStatus.eligibleForAds) return false;
    if (!this.config.interstitialAdUnitId) return false;

    // Strict guard checks: forbidden contexts
    const forbidden = [
      'app_start',
      'before_ai_response',
      'photo_uploading',
      'home_scan_in_progress',
      'payment_flow',
      'login_flow',
    ];
    if (contextName && forbidden.includes(contextName)) {
      return false;
    }

    // Cooldown check (default: 300s = 5 minutes)
    const now = Date.now();
    const cooldownMs = (this.config.interstitialCooldownSeconds || 300) * 1000;
    if (now - this.lastShownAt < cooldownMs) {
      return false;
    }

    return true;
  }

  public triggerAction(contextName: string): boolean {
    this.actionCount++;
    const frequency = this.config?.interstitialFrequency || 3;

    if (this.actionCount >= frequency && this.canShowInterstitial(contextName)) {
      return this.showInterstitial();
    }
    return false;
  }

  public showInterstitial(onDismiss?: () => void): boolean {
    if (!this.canShowInterstitial()) {
      onDismiss?.();
      return false;
    }

    const adUnitId = this.config?.interstitialAdUnitId || null;
    const testMode = this.config?.testMode ?? true;

    this.lastShownAt = Date.now();
    this.actionCount = 0;

    if (AdPlatform.isNativeAndroid() && window.AndroidAdMob && window.AndroidAdMob.showInterstitial) {
      if (adUnitId) {
        window.AndroidAdMob.showInterstitial(adUnitId);
        this.reportImpression();
      }
      onDismiss?.();
      return true;
    }

    // Web/PWA test mode flow
    this.state = {
      isShowing: true,
      adUnitId,
      testMode,
      onDismiss: () => {
        this.dismiss();
        onDismiss?.();
      },
    };
    this.notify();
    this.reportImpression();
    return true;
  }

  public dismiss(): void {
    this.state = {
      isShowing: false,
      adUnitId: null,
      testMode: true,
      onDismiss: undefined,
    };
    this.notify();
  }

  private async reportImpression(): Promise<void> {
    try {
      await fetch('/api/ads/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'interstitial_impression' }),
      });
    } catch {
      // Silent telemetry error
    }
  }
}
