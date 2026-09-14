// AdMob completely disabled for production web SaaS platform
export class AdService {
  private static instance: AdService;

  public banner = {
    getState: () => ({ visible: false, position: 'bottom', format: 'fixed', testMode: false }),
    subscribe: (_cb: any) => () => {},
    hide: () => {},
    show: () => {},
    updateConfig: () => {},
  };

  public interstitial = {
    getState: () => ({ visible: false }),
    subscribe: (_cb: any) => () => {},
    showInterstitial: (onDismiss?: () => void) => {
      if (onDismiss) onDismiss();
      return false;
    },
    updateConfig: () => {},
  };

  public rewarded = {
    getState: () => ({ visible: false }),
    subscribe: (_cb: any) => () => {},
    watchAndClaimAd: async () => ({
      rewarded: false,
      error: 'AdMob ads have been disabled on the web version.',
    }),
    updateConfig: () => {},
  };

  public static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  public async init(): Promise<void> {}
  public async refresh(): Promise<void> {}
  public getConfig(): any { return null; }
  public getUserStatus(): any { return null; }
  public showInterstitial(_ctx?: string, onDismiss?: () => void): boolean {
    if (onDismiss) onDismiss();
    return false;
  }
  public async showInterstitialAd(_ctx?: string, onDismiss?: () => void): Promise<boolean> {
    if (onDismiss) onDismiss();
    return false;
  }
  public showInterstitialAtNaturalPause(_ctx: string, onDismiss?: () => void): boolean {
    if (onDismiss) onDismiss();
    return false;
  }
  public setUserTier(_tier: string): void {}
  public async watchRewardedAd(): Promise<{ rewarded: boolean; error: string }> {
    return { rewarded: false, error: 'Ads have been disabled on the web version. Please use standard credit plans.' };
  }
}

export const adService = AdService.getInstance();
