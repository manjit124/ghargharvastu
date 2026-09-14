import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Lock,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Sliders,
  Server,
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { AdminPaymentConfig, AuditLogRecord } from '../types';

export const PaymentSettingsTab: React.FC = () => {
  const [config, setConfig] = useState<AdminPaymentConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitchingMode, setIsSwitchingMode] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Credentials Modal / Form
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [showSecretFields, setShowSecretFields] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    testKeyId: '',
    testKeySecret: '',
    testWebhookSecret: '',
    liveKeyId: '',
    liveKeySecret: '',
    liveWebhookSecret: '',
  });

  const loadPaymentConfig = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [res, auditRes] = await Promise.all([
        adminFetch<{ success: boolean; config: AdminPaymentConfig }>('/api/admin/payments/config'),
        adminFetch<{ auditLogs: AuditLogRecord[] }>('/api/admin/audit-logs'),
      ]);

      if (res.config) {
        setConfig(res.config);
      }
      if (auditRes.auditLogs) {
        // Filter payment-related audit logs
        const paymentAudits = auditRes.auditLogs.filter(
          (log) =>
            log.action.includes('PAYMENT') ||
            log.affectedItem.includes('razorpay') ||
            log.action.includes('PRICE')
        );
        setAuditLogs(paymentAudits);
      }
    } catch (err: any) {
      console.error('Failed to load payment config:', err);
      setErrorMessage(err.message || 'Failed to load payment gateway settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const handleSwitchMode = async (targetMode: 'TEST' | 'LIVE') => {
    if (!config || config.mode === targetMode) return;

    if (targetMode === 'LIVE') {
      // Check production readiness blockers
      if (!config.productionReadiness.isReady) {
        setErrorMessage(
          `Live payment configuration is incomplete. Please resolve the following before switching to LIVE:\n• ${config.productionReadiness.blockers.join(
            '\n• '
          )}`
        );
        return;
      }

      const confirmed = window.confirm(
        'Are you sure you want to switch Razorpay to LIVE mode?\n\nReal money transactions will be processed for all incoming PRO and HOME EXPERT subscription checkouts.'
      );
      if (!confirmed) return;
    }

    setIsSwitchingMode(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await adminFetch<{
        success: boolean;
        message: string;
        config: AdminPaymentConfig;
      }>('/api/admin/payments/mode', {
        method: 'POST',
        body: JSON.stringify({ mode: targetMode }),
      });

      if (res.success && res.config) {
        setConfig(res.config);
        setSuccessMessage(res.message);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch payment mode');
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleTestConnection = async (mode?: 'TEST' | 'LIVE') => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await adminFetch<{
        success: boolean;
        message: string;
        details?: any;
      }>('/api/admin/payments/test-connection', {
        method: 'POST',
        body: JSON.stringify({ mode: mode || config?.mode }),
      });

      setTestResult(res);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
      setErrorMessage(err.message || 'Connection test failed.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload: any = {};
      if (formData.testKeyId.trim()) payload.testKeyId = formData.testKeyId.trim();
      if (formData.testKeySecret.trim()) payload.testKeySecret = formData.testKeySecret.trim();
      if (formData.testWebhookSecret.trim()) payload.testWebhookSecret = formData.testWebhookSecret.trim();
      if (formData.liveKeyId.trim()) payload.liveKeyId = formData.liveKeyId.trim();
      if (formData.liveKeySecret.trim()) payload.liveKeySecret = formData.liveKeySecret.trim();
      if (formData.liveWebhookSecret.trim()) payload.liveWebhookSecret = formData.liveWebhookSecret.trim();

      const res = await adminFetch<{
        success: boolean;
        message: string;
        config: AdminPaymentConfig;
      }>('/api/admin/payments/credentials', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success && res.config) {
        setConfig(res.config);
        setIsEditModalOpen(false);
        // Clear sensitive secret inputs
        setFormData({
          testKeyId: '',
          testKeySecret: '',
          testWebhookSecret: '',
          liveKeyId: '',
          liveKeySecret: '',
          liveWebhookSecret: '',
        });
        setSuccessMessage('Credentials securely saved to server memory vault!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading && !config) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-stone-500">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium">Loading Razorpay Payment Configuration...</p>
      </div>
    );
  }

  const isLive = config?.mode === 'LIVE';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>Razorpay Payment Gateway Settings</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isLive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {config?.mode} MODE ACTIVE
                  </span>
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Server-authoritative payment control for Android Play Store app & Web. Switch between TEST and LIVE
                  without requiring client APK/AAB updates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleTestConnection()}
              disabled={isTestingConnection}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTestingConnection ? 'animate-pulse' : ''}`} />
              <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={loadPaymentConfig}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="whitespace-pre-line">{errorMessage}</div>
          </div>
        )}
      </div>

      {/* 2. MODE TOGGLE & CURRENT CONNECTION CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Active Mode & Switch Control */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Operational Payment Mode
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    config?.connectionStatus === 'Connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : config?.connectionStatus === 'Error'
                      ? 'bg-rose-500'
                      : 'bg-stone-400'
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    config?.connectionStatus === 'Connected'
                      ? 'text-emerald-700'
                      : config?.connectionStatus === 'Error'
                      ? 'text-rose-700'
                      : 'text-stone-500'
                  }`}
                >
                  {config?.connectionStatus}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200 mb-4">
              <div>
                <div className="text-xs text-stone-500 font-medium">Active Gateway Key ID</div>
                <div className="text-base font-mono font-bold text-stone-800 tracking-wide mt-0.5">
                  {config?.activeKeyIdMasked || 'Not Configured'}
                </div>
                <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-stone-400" />
                  <span>Key Secret is stored securely server-side and never exposed to the client.</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSwitchMode('TEST')}
                  disabled={isSwitchingMode || config?.mode === 'TEST'}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                    config?.mode === 'TEST'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>TEST Mode</span>
                  {config?.mode === 'TEST' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => handleSwitchMode('LIVE')}
                  disabled={isSwitchingMode || config?.mode === 'LIVE'}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                    config?.mode === 'LIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>LIVE Mode</span>
                  {config?.mode === 'LIVE' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-xs text-stone-600 leading-relaxed">
              {config?.mode === 'TEST' ? (
                <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-200/60 p-3 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900">Test Simulator Active: </span>
                    <span>
                      Orders use Razorpay Test credentials. No real money will be charged. Subscriptions and 25 PRO
                      credits are activated upon cryptographic signature verification.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-900">Live Production Gateway Active: </span>
                    <span>
                      Orders use live Razorpay credentials. Real card/UPI transactions will be processed and
                      subscriptions will be verified via webhooks and signatures.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Connection Details: {config?.connectionMessage}</span>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-teal-700 hover:text-teal-800 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              <span>Manage Credentials in Vault</span>
            </button>
          </div>
        </div>

        {/* 3. STATUS PANEL (Requirement 19) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Configuration Status
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  config?.productionReadiness.isReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {config?.productionReadiness.isReady ? 'Production Ready' : 'Setup Pending'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-50">
                <span className="text-stone-500">Payment Gateway</span>
                <span className="font-semibold text-stone-800">Razorpay</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-50">
                <span className="text-stone-500">Current Mode</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {config?.mode}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-50">
                <span className="text-stone-500">Active Key ID</span>
                <span className="font-mono text-stone-700 font-medium">{config?.activeKeyIdMasked}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-50">
                <span className="text-stone-500">Active Key Secret</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>{config?.hasActiveSecret ? 'Configured' : 'Missing'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-50">
                <span className="text-stone-500">Webhook Secret</span>
                <span
                  className={`font-semibold ${
                    config?.hasActiveWebhook ? 'text-emerald-700' : 'text-stone-400'
                  }`}
                >
                  {config?.hasActiveWebhook ? 'Configured' : 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-stone-500">Live Readiness</span>
                <span
                  className={`font-bold ${
                    config?.productionReadiness.isReady ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {config?.productionReadiness.isReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100">
            <div className="text-[11px] text-stone-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Zero client exposure: Secrets never leave the secure backend.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ZERO-UPDATE PLAY STORE ARCHITECTURE BANNER (Requirement 18) */}
      <div className="bg-gradient-to-r from-teal-900 to-stone-900 text-white rounded-2xl p-6 shadow-md border border-teal-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Google Play Store Zero-Rebuild Architecture</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Switch From TEST to LIVE Without Releasing a New Play Store Update
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              When published on Google Play, the Android app does not contain hard-coded credentials. It dynamically
              retrieves checkout parameters from <code className="bg-white/10 px-1.5 py-0.5 rounded text-teal-300">/api/payments/create-order</code>.
              When you switch to LIVE mode on this server, the published Android app immediately begins accepting live
              payments with zero APK/AAB rebuild or Google Play review required.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 w-full lg:w-auto shrink-0">
            <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider mb-2">
              Architecture Data Flow
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-200 flex-wrap">
              <span className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700">Android APK</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700">Backend API</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="bg-teal-800/80 text-teal-200 px-2 py-1 rounded border border-teal-600 font-bold">
                {config?.mode} Razorpay
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SIDE-BY-SIDE CREDENTIALS & WEBHOOK STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test vs Live Credentials Inspection */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-stone-500" />
              <span>Credentials State Breakdown</span>
            </h3>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              Edit in Vault
            </button>
          </div>

          <div className="space-y-4">
            {/* Test Credentials Card */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>TEST Mode Credentials</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    config?.testConfig.hasKeyId && config?.testConfig.hasSecret
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {config?.testConfig.hasKeyId && config?.testConfig.hasSecret ? 'Ready' : 'Incomplete'}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Key ID:</span>
                  <span className="font-mono text-stone-800">{config?.testConfig.keyIdMasked}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Key Secret:</span>
                  <span className="font-semibold text-stone-700">
                    {config?.testConfig.hasSecret ? 'Configured (Server Env)' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Webhook Secret:</span>
                  <span className="font-semibold text-stone-700">
                    {config?.testConfig.hasWebhook ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Credentials Card */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>LIVE Mode Credentials (Production)</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    config?.liveConfig.hasKeyId && config?.liveConfig.hasSecret
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {config?.liveConfig.hasKeyId && config?.liveConfig.hasSecret ? 'Ready' : 'Incomplete'}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Key ID:</span>
                  <span className="font-mono text-stone-800">{config?.liveConfig.keyIdMasked}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Key Secret:</span>
                  <span className="font-semibold text-stone-700">
                    {config?.liveConfig.hasSecret ? 'Configured (Server Env)' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Webhook Secret:</span>
                  <span className="font-semibold text-stone-700">
                    {config?.liveConfig.hasWebhook ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Details (Requirement 13) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-stone-500" />
              <span>Razorpay Webhook Endpoint</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
              HMAC-SHA256
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-500 font-medium block mb-1">Active Webhook URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={config?.webhookUrl || '/api/payments/webhook'}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-800 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(config?.webhookUrl || '/api/payments/webhook', 'webhook')}
                  className="px-3 py-2 border border-stone-200 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedField === 'webhook' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Configure this URL in your Razorpay Dashboard &gt; Settings &gt; Webhooks.
              </p>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Handled Webhook Events
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 font-mono">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>payment.captured</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>payment.failed</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>subscription.activated</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>subscription.charged</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>subscription.cancelled</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>subscription.completed</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 leading-relaxed">
              <span className="font-semibold text-stone-700">Idempotent Processing: </span>
              All incoming webhooks are validated with HMAC cryptographic signatures and deduplicated via unique event
              IDs to prevent duplicate subscription activation or crediting.
            </div>
          </div>
        </div>
      </div>

      {/* 6. AUTHORITATIVE SERVER-SIDE PRICING ENFORCEMENT (Requirement 10 & 15) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <span>Server-Authoritative Pricing &amp; Entitlement Enforcement</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Client requests only provide plan ID. The backend computes authoritative prices from the server database.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-stone-100 text-stone-700 border border-stone-200">
            Client Price Injections Strictly Rejected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {config?.activePlans.map((plan) => (
            <div
              key={plan.id}
              className={`p-4 rounded-xl border ${
                plan.id === 'expert'
                  ? 'border-teal-300 bg-teal-50/30'
                  : plan.id === 'pro'
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-stone-200 bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-stone-800">{plan.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                  {plan.id}
                </span>
              </div>
              <div className="text-lg font-bold text-stone-900 mt-1">
                ₹{plan.promotionalPrice && plan.promotionalPrice > 0 ? plan.promotionalPrice : plan.price}
                <span className="text-xs font-normal text-stone-500"> / {plan.billingPeriod || 'month'}</span>
              </div>
              {plan.promotionalPrice && plan.promotionalPrice > 0 && plan.promotionalPrice < plan.price && (
                <div className="text-[11px] text-amber-700 font-medium line-through">Original: ₹{plan.price}</div>
              )}
              <div className="text-xs text-stone-600 mt-2">
                {plan.id === 'pro' ? (
                  <span className="font-semibold text-amber-900">25 AI Credits / month</span>
                ) : plan.id === 'expert' ? (
                  <span className="font-semibold text-teal-900">Unlimited* AI Vastu Scans</span>
                ) : (
                  <span className="text-stone-500">5 trial credits included</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. AUDIT TRAIL LOGS */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-stone-500" />
            <span>Payment Configuration Audit Trail</span>
          </h3>
          <span className="text-[11px] text-stone-400">Zero Secrets Stored in Logs</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            No payment configuration changes recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
            {auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>{log.action}</span>
                    <span className="text-[11px] text-stone-400 font-normal">by {log.adminName}</span>
                  </div>
                  <div className="text-stone-600 text-[11px] mt-0.5">{log.details}</div>
                </div>
                <div className="text-[10px] text-stone-400 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. EDIT CREDENTIALS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-600" />
                <span>Update Razorpay Server Vault Credentials</span>
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Credentials entered here are retained in the secure server memory vault and are never returned in public
              APIs or stored in JSON files. For permanent persistence across Cloud Run container restarts, set these
              variables in Secret Manager / Cloud Run environment settings.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              {/* Test Credentials Group */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-stone-800">TEST Environment Credentials</div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razorpay Test Key ID (rzp_test_...)
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_test_..."
                    value={formData.testKeyId}
                    onChange={(e) => setFormData({ ...formData, testKeyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razorpay Test Key Secret
                  </label>
                  <input
                    type={showSecretFields ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing server secret"
                    value={formData.testKeySecret}
                    onChange={(e) => setFormData({ ...formData, testKeySecret: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razorpay Test Webhook Secret
                  </label>
                  <input
                    type={showSecretFields ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing webhook secret"
                    value={formData.testWebhookSecret}
                    onChange={(e) => setFormData({ ...formData, testWebhookSecret: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Live Credentials Group */}
              <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-900">LIVE Production Credentials</div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razorpay Live Key ID (rzp_live_...)
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_live_..."
                    value={formData.liveKeyId}
                    onChange={(e) => setFormData({ ...formData, liveKeyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razorpay Live Key Secret
                  </label>
                  <input
                    type={showSecretFields ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing server secret"
                    value={formData.liveKeySecret}
                    onChange={(e) => setFormData({ ...formData, liveKeySecret: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razorpay Live Webhook Secret
                  </label>
                  <input
                    type={showSecretFields ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing webhook secret"
                    value={formData.liveWebhookSecret}
                    onChange={(e) => setFormData({ ...formData, liveWebhookSecret: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowSecretFields(!showSecretFields)}
                  className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 cursor-pointer"
                >
                  {showSecretFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSecretFields ? 'Hide Secret Fields' : 'Show Secret Text'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm disabled:opacity-50"
                  >
                    Save Credentials
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
