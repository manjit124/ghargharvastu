import React, { useEffect, useState } from 'react';
import {
  Megaphone,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  Eye,
  Gift,
  LayoutTemplate,
  Sliders,
  DollarSign,
  Activity,
  Smartphone,
  RefreshCw,
  ClipboardPaste,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { adminService } from '../../../services/adminService';

export interface AdMobConfig {
  adsEnabled: boolean;
  testMode: boolean;
  interstitialEnabled: boolean;
  rewardedEnabled: boolean;
  bannerEnabled: boolean;

  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  fixedBannerAdUnitId: string;
  anchoredAdaptiveBannerAdUnitId: string;

  testInterstitialAdUnitId: string;
  testRewardedAdUnitId: string;
  testFixedBannerAdUnitId: string;
  testAnchoredAdaptiveBannerAdUnitId: string;

  rewardedCreditAmount: number;
  dailyRewardedAdLimit: number;
  rewardedCooldownSeconds: number;

  interstitialFrequency: number;
  interstitialCooldownSeconds: number;

  bannerFormat: 'fixed' | 'anchored_adaptive';
  bannerPosition: 'top' | 'bottom';

  freePlanAdsEnabled: boolean;
  proPlanAdsEnabled: boolean;
  homeExpertAdsEnabled: boolean;
}

export const DEFAULT_ADMOB_CONFIG: AdMobConfig = {
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

interface AdAnalytics {
  adsRequested: number;
  adsLoaded: number;
  adsFailed: number;
  rewardedAdsCompleted: number;
  rewardedCreditsIssued: number;
  interstitialImpressions: number;
  bannerImpressions: number;
  rewardedDailyLimitReached: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: string;
  details: string;
  performedBy: { id: string; name: string };
}

export const AdsManagementTab: React.FC = () => {
  const [config, setConfig] = useState<AdMobConfig>(DEFAULT_ADMOB_CONFIG);
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadAdConfig = async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      let res: any;
      try {
        res = await adminService.getAdMobConfig();
      } catch {
        res = await adminFetch<{
          success: boolean;
          adSettings?: AdMobConfig;
          config?: AdMobConfig;
          adAnalytics?: AdAnalytics;
          analytics?: AdAnalytics;
          auditLogs?: AuditLog[];
        }>('/api/admin/ads');
      }

      const receivedConfig = res?.adSettings || res?.config || res?.data;
      if (receivedConfig) {
        setConfig(receivedConfig);
      }
      const receivedAnalytics = res?.adAnalytics || res?.analytics;
      if (receivedAnalytics) {
        setAnalytics(receivedAnalytics);
      }
      if (res?.auditLogs) {
        setAuditLogs(res.auditLogs);
      }
    } catch (err: any) {
      console.error('Failed to load ad config:', err);
      setLoadError(err.message || 'Unable to connect to AdMob backend settings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setWarnings([]);

    // Production check
    if (!config.testMode) {
      const missingUnits: string[] = [];
      if (config.rewardedEnabled && !config.rewardedAdUnitId) missingUnits.push('Rewarded Video');
      if (config.interstitialEnabled && !config.interstitialAdUnitId) missingUnits.push('Interstitial');
      if (config.bannerEnabled && !config.anchoredAdaptiveBannerAdUnitId && !config.fixedBannerAdUnitId) missingUnits.push('Banner');

      if (missingUnits.length > 0) {
        setWarnings([
          `Test Mode is turned OFF, but Real Production Ad Unit IDs are missing for: ${missingUnits.join(
            ', '
          )}. Users on Android will not see ads for unconfigured units until real IDs are supplied.`,
        ]);
      }
    }

    try {
      let res: any;
      try {
        res = await adminService.updateAdMobConfig(config);
      } catch {
        res = await adminFetch<{
          success: boolean;
          adSettings?: AdMobConfig;
          config?: AdMobConfig;
          warnings?: string[];
        }>('/api/admin/ads', {
          method: 'PUT',
          body: JSON.stringify(config),
        });
      }

      if (res?.success) {
        const savedConfig = res.adSettings || res.config || res.data;
        if (savedConfig) setConfig(savedConfig);
        setSuccessMessage('AdMob configuration saved and persisted to server successfully!');
        if (res.warnings && res.warnings.length > 0) {
          setWarnings((prev) => [...prev, ...res.warnings]);
        }
        await loadAdConfig();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save AdMob configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAnalytics = async () => {
    if (!confirm('Are you sure you want to reset all AdMob impression and request counters to 0?')) {
      return;
    }
    try {
      let res: any;
      try {
        res = await adminService.resetAdMobAnalytics();
      } catch {
        res = await adminFetch<{ success: boolean; adAnalytics: AdAnalytics }>(
          '/api/admin/ads/reset-analytics',
          { method: 'POST' }
        );
      }
      if (res?.success && res.adAnalytics) {
        setAnalytics(res.adAnalytics);
        setSuccessMessage('Ad analytics counters reset to 0.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reset analytics.');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Are you sure you want to restore official Google AdMob test IDs and factory defaults?')) {
      return;
    }
    setIsSaving(true);
    try {
      let res: any;
      try {
        res = await adminService.resetAdMobDefaults();
      } catch {
        res = await adminFetch<{
          success: boolean;
          message: string;
          adSettings: AdMobConfig;
          auditLogs: AuditLog[];
        }>('/api/admin/ads/reset-defaults', { method: 'POST' });
      }
      if (res?.success && res.adSettings) {
        setConfig(res.adSettings);
        if (res.auditLogs) setAuditLogs(res.auditLogs);
        setSuccessMessage('Restored official Google AdMob test IDs and factory defaults!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to restore defaults.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pasteFromClipboard = async (field: keyof AdMobConfig) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && config) {
        setConfig({ ...config, [field]: text.trim() });
      }
    } catch {
      alert('Clipboard permission denied. You can manually copy and paste the ID into the input field.');
    }
  };

  const validateAdIdFormat = (id: string): boolean => {
    if (!id) return false;
    return /^ca-app-pub-\d{16}\/\d{10}$/.test(id.trim());
  };

  if (isLoading && !config) {
    return (
      <div className="p-8 text-center text-stone-400 animate-pulse">
        Loading AdMob configuration & analytics...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* 0. TAB HEADER & REFRESH ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Google AdMob Management</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
              Admin Control Center
            </span>
          </div>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Configure real Google AdMob Ad Unit IDs, switch between Google Test and Production modes, and manage monetization policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAdConfig}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh active AdMob configuration from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : 'text-stone-600'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Backend Sync Error Notice if any */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="text-xs font-bold block">Backend Sync Warning</span>
              <p className="text-xs text-rose-700">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAdConfig}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0 shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 1. TOP BANNER / TEST MODE NOTICE */}
      {config.testMode ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                  Test Ads Active
                </span>
                <span className="text-sm font-bold text-amber-900">
                  Google Official Android Test IDs in Use
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Safe for Google Play Store testing & internal build verification. Switch to Production IDs before public launch.
              </p>
            </div>
          </div>

          <button
            onClick={() => setConfig({ ...config, testMode: false })}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-all"
          >
            Switch to Production IDs
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                  Production Mode
                </span>
                <span className="text-sm font-bold text-emerald-900">
                  Real AdMob Ad Unit IDs are Configured
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Real AdMob production IDs will be served to eligible app users on Android and verified server-side.
              </p>
            </div>
          </div>

          <button
            onClick={() => setConfig({ ...config, testMode: true })}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-all"
          >
            Enable Test Mode
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Warnings List */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>AdMob Configuration Notice</span>
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-700 pl-6">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* 2. ANALYTICS & REVENUE OVERVIEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-stone-700" />
            <h3 className="text-base font-bold text-stone-900">AdMob Performance Analytics</h3>
          </div>
          <button
            onClick={handleResetAnalytics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Counters</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Ads Requested</span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {analytics?.adsRequested.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Ads Loaded</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">
              {analytics?.adsLoaded.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Rewarded Completed</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {analytics?.rewardedAdsCompleted.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Credits Awarded</span>
            <span className="text-xl font-black text-amber-500 mt-1 block">
              +{analytics?.rewardedCreditsIssued.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Interstitial Impressions</span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {analytics?.interstitialImpressions.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Banner Impressions</span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {analytics?.bannerImpressions.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Daily Cap Reached</span>
            <span className="text-xl font-black text-stone-600 mt-1 block">
              {analytics?.rewardedDailyLimitReached.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-xs flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-stone-400">
              <DollarSign className="w-3 h-3" />
              <span>AdMob Revenue</span>
            </div>
            <span className="text-xs font-bold text-stone-500 mt-1">
              Revenue data unavailable
            </span>
            <span className="text-[9px] text-stone-400 mt-0.5">
              Connect AdMob Reporting API for live financial metrics
            </span>
          </div>
        </div>
      </div>

      {/* 3. MASTER CONTROLS & FORMAT TOGGLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Master Controls */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-stone-700" />
            <h4 className="text-sm font-bold text-stone-900">Master Ad Controls</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Ad System Enabled</span>
                <span className="text-[11px] text-stone-400">
                  Globally toggle all AdMob advertising across the platform
                </span>
              </div>
              <button
                onClick={() => setConfig({ ...config, adsEnabled: !config.adsEnabled })}
                className="cursor-pointer"
              >
                {config.adsEnabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-stone-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Test Mode Active</span>
                <span className="text-[11px] text-stone-400">
                  Uses Google official Android test IDs (never causes policy strikes)
                </span>
              </div>
              <button
                onClick={() => setConfig({ ...config, testMode: !config.testMode })}
                className="cursor-pointer"
              >
                {config.testMode ? (
                  <ToggleRight className="w-8 h-8 text-amber-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-stone-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Ad Formats */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-stone-700" />
            <h4 className="text-sm font-bold text-stone-900">Active Ad Formats</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Banner Ads</span>
                <span className="text-[11px] text-stone-400">
                  Fixed or Anchored Adaptive non-intrusive banner
                </span>
              </div>
              <button
                onClick={() => setConfig({ ...config, bannerEnabled: !config.bannerEnabled })}
                className="cursor-pointer"
              >
                {config.bannerEnabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-stone-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Interstitial Ads</span>
                <span className="text-[11px] text-stone-400">
                  Full-screen ads shown only at natural pauses with 5m cooldown
                </span>
              </div>
              <button
                onClick={() =>
                  setConfig({ ...config, interstitialEnabled: !config.interstitialEnabled })
                }
                className="cursor-pointer"
              >
                {config.interstitialEnabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-stone-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Rewarded Ads</span>
                <span className="text-[11px] text-stone-400">
                  Voluntary video ads awarding server-verified credits
                </span>
              </div>
              <button
                onClick={() => setConfig({ ...config, rewardedEnabled: !config.rewardedEnabled })}
                className="cursor-pointer"
              >
                {config.rewardedEnabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-stone-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. AD UNIT IDS CONFIGURATION */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6">
        <div>
          <h4 className="text-sm font-bold text-stone-900">AdMob Ad Unit IDs Configuration</h4>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure your real Google AdMob production Ad Unit IDs. In Test Mode, official Google Test IDs are served automatically.
          </p>
        </div>

        <div className="space-y-5">
          {/* Rewarded Ad Unit ID */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Rewarded Video Ad Unit</span>
                <span className="text-[11px] text-stone-400">
                  Used for voluntary +2 credit video rewards
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                Active: {config.testMode ? 'Google Test ID' : 'Production ID'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Official Google Android Test ID
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-600">
                  <span className="truncate flex-1">{config.testRewardedAdUnitId}</span>
                  <button
                    onClick={() => copyToClipboard(config.testRewardedAdUnitId, 'test-rewarded')}
                    className="p-1 hover:bg-stone-100 rounded text-stone-400 cursor-pointer"
                  >
                    {copiedId === 'test-rewarded' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-stone-700 block">
                    Real Production Ad Unit ID
                  </span>
                  {config.rewardedAdUnitId && (
                    <span
                      className={`text-[10px] font-bold ${
                        validateAdIdFormat(config.rewardedAdUnitId)
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {validateAdIdFormat(config.rewardedAdUnitId)
                        ? 'Valid AdMob format'
                        : 'Invalid format'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                    value={config.rewardedAdUnitId}
                    onChange={(e) => setConfig({ ...config, rewardedAdUnitId: e.target.value.trim() })}
                    className="w-full p-2.5 rounded-xl bg-white border border-stone-300 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard('rewardedAdUnitId')}
                    className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                    title="Paste Ad Unit ID from Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                  {config.rewardedAdUnitId && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, rewardedAdUnitId: '' })}
                      className="px-2 py-2.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-700 text-xs cursor-pointer shrink-0"
                      title="Clear field"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interstitial Ad Unit ID */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Interstitial Ad Unit</span>
                <span className="text-[11px] text-stone-400">
                  Served only during natural audit completion pauses
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                Active: {config.testMode ? 'Google Test ID' : 'Production ID'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Official Google Android Test ID
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-600">
                  <span className="truncate flex-1">{config.testInterstitialAdUnitId}</span>
                  <button
                    onClick={() =>
                      copyToClipboard(config.testInterstitialAdUnitId, 'test-interstitial')
                    }
                    className="p-1 hover:bg-stone-100 rounded text-stone-400 cursor-pointer"
                  >
                    {copiedId === 'test-interstitial' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-stone-700 block">
                    Real Production Ad Unit ID
                  </span>
                  {config.interstitialAdUnitId && (
                    <span
                      className={`text-[10px] font-bold ${
                        validateAdIdFormat(config.interstitialAdUnitId)
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {validateAdIdFormat(config.interstitialAdUnitId)
                        ? 'Valid AdMob format'
                        : 'Invalid format'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                    value={config.interstitialAdUnitId}
                    onChange={(e) => setConfig({ ...config, interstitialAdUnitId: e.target.value.trim() })}
                    className="w-full p-2.5 rounded-xl bg-white border border-stone-300 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard('interstitialAdUnitId')}
                    className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                    title="Paste Ad Unit ID from Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                  {config.interstitialAdUnitId && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, interstitialAdUnitId: '' })}
                      className="px-2 py-2.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-700 text-xs cursor-pointer shrink-0"
                      title="Clear field"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Banner Ad Unit ID */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Fixed Size Banner (320×50)</span>
                <span className="text-[11px] text-stone-400">
                  Standard fixed-dimension bottom banner
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                Active: {config.testMode ? 'Google Test ID' : 'Production ID'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Official Google Android Test ID
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-600">
                  <span className="truncate flex-1">{config.testFixedBannerAdUnitId}</span>
                  <button
                    onClick={() =>
                      copyToClipboard(config.testFixedBannerAdUnitId, 'test-fixed-banner')
                    }
                    className="p-1 hover:bg-stone-100 rounded text-stone-400 cursor-pointer"
                  >
                    {copiedId === 'test-fixed-banner' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-stone-700 block">
                    Real Production Ad Unit ID
                  </span>
                  {config.fixedBannerAdUnitId && (
                    <span
                      className={`text-[10px] font-bold ${
                        validateAdIdFormat(config.fixedBannerAdUnitId)
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {validateAdIdFormat(config.fixedBannerAdUnitId)
                        ? 'Valid AdMob format'
                        : 'Invalid format'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                    value={config.fixedBannerAdUnitId}
                    onChange={(e) => setConfig({ ...config, fixedBannerAdUnitId: e.target.value.trim() })}
                    className="w-full p-2.5 rounded-xl bg-white border border-stone-300 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard('fixedBannerAdUnitId')}
                    className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                    title="Paste Ad Unit ID from Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                  {config.fixedBannerAdUnitId && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, fixedBannerAdUnitId: '' })}
                      className="px-2 py-2.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-700 text-xs cursor-pointer shrink-0"
                      title="Clear field"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Anchored Adaptive Banner Ad Unit ID */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Anchored Adaptive Banner Ad Unit
                </span>
                <span className="text-[11px] text-stone-400">
                  Modern responsive banner dynamically sized to user display width
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                Active: {config.testMode ? 'Google Test ID' : 'Production ID'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Official Google Android Test ID
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-600">
                  <span className="truncate flex-1">
                    {config.testAnchoredAdaptiveBannerAdUnitId}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        config.testAnchoredAdaptiveBannerAdUnitId,
                        'test-adaptive-banner'
                      )
                    }
                    className="p-1 hover:bg-stone-100 rounded text-stone-400 cursor-pointer"
                  >
                    {copiedId === 'test-adaptive-banner' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-stone-700 block">
                    Real Production Ad Unit ID
                  </span>
                  {config.anchoredAdaptiveBannerAdUnitId && (
                    <span
                      className={`text-[10px] font-bold ${
                        validateAdIdFormat(config.anchoredAdaptiveBannerAdUnitId)
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {validateAdIdFormat(config.anchoredAdaptiveBannerAdUnitId)
                        ? 'Valid AdMob format'
                        : 'Invalid format'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                    value={config.anchoredAdaptiveBannerAdUnitId}
                    onChange={(e) =>
                      setConfig({ ...config, anchoredAdaptiveBannerAdUnitId: e.target.value.trim() })
                    }
                    className="w-full p-2.5 rounded-xl bg-white border border-stone-300 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard('anchoredAdaptiveBannerAdUnitId')}
                    className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                    title="Paste Ad Unit ID from Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                  {config.anchoredAdaptiveBannerAdUnitId && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, anchoredAdaptiveBannerAdUnitId: '' })}
                      className="px-2 py-2.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-700 text-xs cursor-pointer shrink-0"
                      title="Clear field"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. REWARDED & INTERSTITIAL POLICY SETTINGS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rewarded Settings */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-stone-700" />
            <h4 className="text-sm font-bold text-stone-900">Rewarded Ad Limits</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Reward Credits / View
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={isNaN(config.rewardedCreditAmount) ? '' : (config.rewardedCreditAmount ?? '')}
                onChange={(e) =>
                  setConfig({ ...config, rewardedCreditAmount: Number(e.target.value) || 0 })
                }
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">Default: +2 AI Credits</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Daily Limit (Ads/Day)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={isNaN(config.dailyRewardedAdLimit) ? '' : (config.dailyRewardedAdLimit ?? '')}
                onChange={(e) =>
                  setConfig({ ...config, dailyRewardedAdLimit: Number(e.target.value) || 0 })
                }
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Default: 5 ads/day (Max +10 credits)
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="0"
                max="600"
                value={isNaN(config.rewardedCooldownSeconds) ? '' : (config.rewardedCooldownSeconds ?? '')}
                onChange={(e) =>
                  setConfig({ ...config, rewardedCooldownSeconds: Number(e.target.value) || 0 })
                }
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">Default: 60 seconds</span>
            </div>
          </div>
        </div>

        {/* Interstitial Settings */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-stone-700" />
            <h4 className="text-sm font-bold text-stone-900">Interstitial Policy</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Frequency (Actions)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={isNaN(config.interstitialFrequency) ? '' : (config.interstitialFrequency ?? '')}
                onChange={(e) =>
                  setConfig({ ...config, interstitialFrequency: Number(e.target.value) || 0 })
                }
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Show after every X natural pauses
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="60"
                max="1200"
                value={isNaN(config.interstitialCooldownSeconds) ? '' : (config.interstitialCooldownSeconds ?? '')}
                onChange={(e) =>
                  setConfig({ ...config, interstitialCooldownSeconds: Number(e.target.value) || 0 })
                }
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Default: 300s (5 minutes between interstitials)
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Banner Format
              </label>
              <select
                value={config.bannerFormat}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bannerFormat: e.target.value as 'fixed' | 'anchored_adaptive',
                  })
                }
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
              >
                <option value="anchored_adaptive">Anchored Adaptive (Recommended)</option>
                <option value="fixed">Fixed Size (320×50)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plan Targeting */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-stone-700" />
            <h4 className="text-sm font-bold text-stone-900">Plan Ad Targeting</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Free Users</span>
                <span className="text-[10px] text-stone-400">Display banner and rewarded ads</span>
              </div>
              <button
                onClick={() =>
                  setConfig({ ...config, freePlanAdsEnabled: !config.freePlanAdsEnabled })
                }
                className="cursor-pointer"
              >
                {config.freePlanAdsEnabled ? (
                  <ToggleRight className="w-7 h-7 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-stone-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">PRO Advisor</span>
                <span className="text-[10px] text-stone-400">Default: 100% ad-free experience</span>
              </div>
              <button
                onClick={() =>
                  setConfig({ ...config, proPlanAdsEnabled: !config.proPlanAdsEnabled })
                }
                className="cursor-pointer"
              >
                {config.proPlanAdsEnabled ? (
                  <ToggleRight className="w-7 h-7 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-stone-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Home Expert</span>
                <span className="text-[10px] text-stone-400">Default: 100% ad-free experience</span>
              </div>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    homeExpertAdsEnabled: !config.homeExpertAdsEnabled,
                  })
                }
                className="cursor-pointer"
              >
                {config.homeExpertAdsEnabled ? (
                  <ToggleRight className="w-7 h-7 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-stone-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. SAVE & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleResetDefaults}
          disabled={isSaving}
          className="px-5 py-3 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4 text-stone-500" />
          <span>Restore Official Google Test IDs & Defaults</span>
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.01] transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save & Deploy AdMob Settings'}</span>
        </button>
      </div>

      {/* 7. AUDIT LOG */}
      {auditLogs.length > 0 && (
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-stone-900">Recent Ad Configuration Audits</h4>
          <div className="divide-y divide-stone-100 overflow-hidden">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-800">{log.action}</span>
                  <p className="text-[11px] text-stone-500">{log.details}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="text-[10px] font-bold text-stone-400 block">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    By {typeof log.performedBy === 'object' ? log.performedBy?.name : log.performedBy || 'Admin'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
