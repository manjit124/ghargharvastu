import { AdPlatform } from './adPlatform';
import { BannerAdState, ClientAdConfig, AdUserStatus } from './adTypes';

type BannerListener = (state: BannerAdState) => void;

export class BannerAdService {
  private state: BannerAdState = {
    visible: false,
    format: 'anchored_adaptive',
    position: 'bottom',
    adUnitId: null,
    testMode: true,
  };

  private listeners: Set<BannerListener> = new Set();
  private hasReportedImpression = false;

  public subscribe(listener: BannerListener): () => void {
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
    const shouldShow =
      config.adsEnabled &&
      config.bannerEnabled &&
      userStatus.eligibleForAds &&
      Boolean(config.bannerAdUnitId);

    const newState: BannerAdState = {
      visible: shouldShow,
      format: config.bannerFormat,
      position: config.bannerPosition,
      adUnitId: config.bannerAdUnitId,
      testMode: config.testMode,
    };

    this.state = newState;
    this.notify();

    // If native Android, forward to Android bridge
    if (AdPlatform.isNativeAndroid() && window.AndroidAdMob) {
      if (shouldShow && config.bannerAdUnitId) {
        window.AndroidAdMob.showBanner?.(
          config.bannerAdUnitId,
          config.bannerPosition,
          config.bannerFormat
        );
      } else {
        window.AndroidAdMob.hideBanner?.();
      }
    }

    if (shouldShow && !this.hasReportedImpression) {
      this.reportImpression();
      this.hasReportedImpression = true;
    }
  }

  public hide(): void {
    this.state.visible = false;
    this.notify();
    if (AdPlatform.isNativeAndroid() && window.AndroidAdMob) {
      window.AndroidAdMob.hideBanner?.();
    }
  }

  public getState(): BannerAdState {
    return { ...this.state };
  }

  private async reportImpression(): Promise<void> {
    try {
      await fetch('/api/ads/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'banner_impression' }),
      });
    } catch {
      // Telemetry failures are silent
    }
  }
}
