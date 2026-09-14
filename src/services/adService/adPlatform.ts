import { AdPlatformType } from './adTypes';

declare global {
  interface Window {
    AndroidAdMob?: {
      showBanner?: (adUnitId: string, position: 'top' | 'bottom', format: string) => void;
      hideBanner?: () => void;
      showInterstitial?: (adUnitId: string) => void;
      showRewarded?: (adUnitId: string, callbackName: string) => void;
      isAvailable?: () => boolean;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

export class AdPlatform {
  public static getPlatform(): AdPlatformType {
    if (typeof window === 'undefined') return 'web_pwa';

    // Check for native Android WebView bridge or Capacitor Android container
    if (
      (window.AndroidAdMob && (typeof window.AndroidAdMob.isAvailable !== 'function' || window.AndroidAdMob.isAvailable())) ||
      (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
    ) {
      return 'android_native';
    }

    return 'web_pwa';
  }

  public static isNativeAndroid(): boolean {
    return this.getPlatform() === 'android_native';
  }

  public static isWebPwa(): boolean {
    return this.getPlatform() === 'web_pwa';
  }
}
