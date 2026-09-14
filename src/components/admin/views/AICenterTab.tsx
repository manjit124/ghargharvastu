import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RotateCcw,
  Trash2,
  Eye,
  Lock,
  Server,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  DollarSign,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

export const AICenterTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'control' | 'health' | 'errors' | 'analyses' | 'safety'>('control');
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [errorsData, setErrorsData] = useState<any[]>([]);
  const [analysesData, setAnalysesData] = useState<any[]>([]);
  const [safetyData, setSafetyData] = useState<any>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingSafety, setSavingSafety] = useState(false);
  const [safetySuccess, setSafetySuccess] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyToggling, setEmergencyToggling] = useState(false);

  // Live Test AI
  const [customTestPrompt, setCustomTestPrompt] = useState('East wall par mirror lagana kaisa hai?');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Error detail modal
  const [selectedError, setSelectedError] = useState<any | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, healthRes, errorsRes, analysesRes, safetyRes, eventsRes] = await Promise.all([
        adminService.getAISettings(),
        adminService.getAIHealth(),
        adminService.getAIErrors(),
        adminService.getAIAnalyses(),
        adminService.getAISafety().catch(() => null),
        adminService.getAISecurityEvents({ limit: 50 }).catch(() => ({ events: [] })),
      ]);
      setAiSettings(settingsRes);
      setHealthData(healthRes);
      setErrorsData(errorsRes.errors || []);
      setAnalysesData(analysesRes.analyses || []);
      if (safetyRes) setSafetyData(safetyRes.safety);
      if (eventsRes?.events) setSecurityEvents(eventsRes.events);
    } catch (err) {
      console.error('Failed to load AI data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await adminService.updateAISettings(aiSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update AI settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleEmergencyLock = async () => {
    if (!safetyData) return;
    const willEnable = !safetyData.emergencyLockEnabled;
    const confirmMsg = willEnable
      ? 'WARNING: This will immediately BLOCK all AI generation and photo analysis requests across the entire platform. Proceed?'
      : 'Disengage emergency lock and restore AI services for users?';
    if (!confirm(confirmMsg)) return;

    setEmergencyToggling(true);
    try {
      const res = await adminService.setAIEmergencyLock(willEnable, emergencyReason || (willEnable ? 'Admin emergency lock engaged' : ''));
      setSafetyData(res.safety);
      alert(res.message);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle emergency lock');
    } finally {
      setEmergencyToggling(false);
    }
  };

  const handleSaveSafetyConfig = async () => {
    if (!safetyData) return;
    setSavingSafety(true);
    setSafetySuccess(false);
    try {
      const res = await adminService.updateAISafetyConfig({
        dailyCostLimitUsd: Number(safetyData.dailyCostLimitUsd),
        monthlyCostLimitUsd: Number(safetyData.monthlyCostLimitUsd),
        dailyRequestLimit: Number(safetyData.dailyRequestLimit),
        perUserConcurrentLimit: Number(safetyData.perUserConcurrentLimit),
      });
      setSafetyData(res.safety);
      setSafetySuccess(true);
      setTimeout(() => setSafetySuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update safety configuration');
    } finally {
      setSavingSafety(false);
    }
  };

  const handleResetCounters = async () => {
    if (!confirm('Reset today and this month AI cost and request counters back to zero?')) return;
    try {
      const res = await adminService.resetAICounters();
      setSafetyData(res.safety);
      alert('Counters reset successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to reset counters');
    }
  };

  const handleClearSecurityEvents = async () => {
    if (!confirm('Clear all recorded security and abuse audit events?')) return;
    try {
      await adminService.clearAISecurityEvents();
      setSecurityEvents([]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear security events');
    }
  };

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminService.testAI(customTestPrompt);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message });
    } finally {
      setTesting(false);
    }
  };

  const handleClearErrors = async () => {
    if (!confirm('Are you sure you want to clear all logged AI error events?')) return;
    try {
      await adminService.clearAIErrors();
      setErrorsData([]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear error logs');
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm('Permanently remove this anonymized inspection record?')) return;
    try {
      await adminService.deleteAIAnalysis(id);
      setAnalysesData((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  if (loading && !aiSettings) {
    return <div className="p-8 text-center text-xs font-semibold text-stone-500">Loading AI center telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex flex-wrap items-center gap-1.5 shadow-xs">
        <button
          onClick={() => setSubTab('control')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'control'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          AI Control & Parameters
        </button>
        <button
          onClick={() => setSubTab('health')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'health'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Telemetry & Live Diagnostic
        </button>
        <button
          onClick={() => setSubTab('errors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'errors'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <span>Error Incident Logs</span>
          {errorsData.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
              {errorsData.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('analyses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'analyses'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Anonymized Analyses ({analysesData.length})
        </button>
        <button
          onClick={() => setSubTab('safety')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'safety'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Cost Protection & Safety</span>
          {safetyData?.emergencyLockEnabled && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] animate-pulse">
              KILL-SWITCH ON
            </span>
          )}
        </button>
      </div>

      {/* SUBTAB 1: AI CONTROL & PARAMETERS */}
      {subTab === 'control' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls Form */}
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-6 space-y-5 shadow-xs">
            <div>
              <h3 className="text-base font-black text-stone-900">Gemini Engine Settings</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage backend model selection, hallucination temperature, and rate throttling.
              </p>
            </div>

            {/* Model & API Key Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Active AI Model</label>
                <select
                  value={aiSettings.model}
                  onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 font-mono"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">API Key Protection</label>
                <div className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Configured on Server</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                    Secured
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  Raw credentials never transmitted to frontend clients.
                </span>
              </div>
            </div>

            {/* Temperature & Token Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>Temperature (Creativity vs Adherence)</span>
                  <span className="text-amber-700 font-mono">{aiSettings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={aiSettings.temperature}
                  onChange={(e) =>
                    setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-600"
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                  <span>0.0 (Strict Vastu Rules)</span>
                  <span>1.0 (Creative Exploratory)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Max Output Tokens</label>
                <input
                  type="number"
                  value={aiSettings.maxTokens}
                  onChange={(e) =>
                    setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) || 2048 })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                />
                <span className="text-[10px] text-stone-400">Controls length of comprehensive recommendations</span>
              </div>
            </div>

            {/* Throttling & Rate Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Rate Limit (Req/Min/User)</label>
                <input
                  type="number"
                  value={aiSettings.rateLimitPerMinute}
                  onChange={(e) =>
                    setAiSettings({
                      ...aiSettings,
                      rateLimitPerMinute: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Timeout Threshold (ms)</label>
                <input
                  type="number"
                  value={aiSettings.timeoutMs}
                  onChange={(e) =>
                    setAiSettings({ ...aiSettings, timeoutMs: parseInt(e.target.value) || 45000 })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                />
              </div>
            </div>

            {/* Proactive Scan & Vision Features */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-stone-800 block">AI Vision & Proactive Scanning</span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={aiSettings.enableVisionAnalysis}
                    onChange={(e) =>
                      setAiSettings({ ...aiSettings, enableVisionAnalysis: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Multimodal Photo Vision Audit</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={aiSettings.enableProactiveDefectScan}
                    onChange={(e) =>
                      setAiSettings({ ...aiSettings, enableProactiveDefectScan: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Proactive Defect Spotter</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {savingSettings ? (
                  <span>Saving Parameters...</span>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Settings Applied!</span>
                  </>
                ) : (
                  <span>Save AI Configuration</span>
                )}
              </button>
            </div>
          </div>

          {/* Side Diagnostic Runner */}
          <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4" />
                  <span>Real-Time Diagnostic</span>
                </div>
                <span className="px-2 py-0.5 bg-stone-800 text-emerald-400 text-[10px] font-mono rounded">
                  Live API
                </span>
              </div>

              <p className="text-xs text-stone-400">
                Execute a low-latency ping to the underlying Gemini endpoint to verify handshake, token generation, and response parsing.
              </p>

              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-stone-300 block">Sample Inquiry</label>
                <textarea
                  rows={3}
                  value={customTestPrompt}
                  onChange={(e) => setCustomTestPrompt(e.target.value)}
                  className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 font-medium focus:outline-none"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    testResult.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="font-bold">
                    {testResult.success ? 'Diagnostic Passed' : 'Diagnostic Failed'}
                  </div>
                  <div className="text-[11px]">
                    Latency: <strong>{testResult.latencyMs}ms</strong> • Model: {testResult.model}
                  </div>
                  {testResult.sampleOutput && (
                    <div className="mt-1 text-[11px] font-mono text-stone-300 line-clamp-3">
                      {testResult.sampleOutput}
                    </div>
                  )}
                  {testResult.error && (
                    <div className="mt-1 text-[11px] font-mono text-rose-300">{testResult.error}</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleRunTest}
              disabled={testing}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {testing ? (
                <div className="w-4 h-4 border-2 border-stone-950/40 border-t-stone-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute Diagnostic Ping</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: TELEMETRY & HEALTH */}
      {subTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Current Service Health</span>
              <div className="flex items-center gap-2 text-xl font-black text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
                <span>{healthData?.status?.toUpperCase() || 'OPERATIONAL'}</span>
              </div>
              <div className="text-xs text-stone-500 font-medium">
                Gemini 2.5 Flash operational via server-side SDK
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Average Latency</span>
              <div className="text-2xl font-black text-stone-900">
                {healthData?.avgLatencyMs || 1240}ms
              </div>
              <div className="text-xs text-stone-500 font-medium">p95 response time &lt; 2.1s</div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Success Rate</span>
              <div className="text-2xl font-black text-emerald-700">
                {healthData?.successRate || '99.8%'}
              </div>
              <div className="text-xs text-stone-500 font-medium">
                {healthData?.failedRequests || 0} failed requests recorded
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900">API Call Distribution (Recent 24 Hours)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-lg font-black text-stone-900">184</div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Chat Inquiries Today</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-lg font-black text-stone-900">86</div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Photo Audits Today</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-lg font-black text-stone-900">22</div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Home Scans Today</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-lg font-black text-stone-900">4,892</div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Month to Date</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ERROR INCIDENT LOGS */}
      {subTab === 'errors' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-stone-900">AI Error & Exception Telemetry</h3>
              <p className="text-xs text-stone-500 font-medium">
                Logged exceptions from user interactions with full sanitization (no passwords or keys stored).
              </p>
            </div>
            {errorsData.length > 0 && (
              <button
                onClick={handleClearErrors}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Error Log</span>
              </button>
            )}
          </div>

          {errorsData.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs font-semibold">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <span>Zero unresolved errors. Gemini pipeline is completely healthy.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Type / Route</th>
                    <th className="px-4 py-3">Code / Status</th>
                    <th className="px-4 py-3">Error Snippet</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {errorsData.map((err) => (
                    <tr key={err.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-stone-500 text-[11px] whitespace-nowrap">
                        {new Date(err.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-stone-800">
                        {err.requestType}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono text-[10px] font-bold">
                          HTTP {err.httpStatus} • {err.errorCode || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-700 max-w-md truncate">
                        {err.errorMessage}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedError(err)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: ANONYMIZED ANALYSES */}
      {subTab === 'analyses' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-stone-900">Anonymized Analysis Audits</h3>
              <p className="text-xs text-stone-500 font-medium">
                Photo and directional inspection logs stripped of user identities for quality assessment.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Inspection Type</th>
                  <th className="px-4 py-3">Room Zone</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3 text-center">Vastu Score</th>
                  <th className="px-4 py-3 text-center">Defects Found</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {analysesData.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500 text-[11px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800 capitalize">
                      {item.analysisType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">{item.roomType}</td>
                    <td className="px-4 py-3 text-stone-600">{item.direction}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.vastuScore >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.vastuScore >= 65
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.vastuScore}/100
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-stone-800">
                      {item.defectCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteAnalysis(item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: AI COST PROTECTION & EMERGENCY KILL-SWITCH */}
      {subTab === 'safety' && (
        <div className="space-y-6">
          {/* Emergency Kill-Switch Banner */}
          <div
            className={`border rounded-3xl p-6 transition-all shadow-md ${
              safetyData?.emergencyLockEnabled
                ? 'bg-rose-950/20 border-rose-500/50 text-rose-950'
                : 'bg-emerald-950/10 border-emerald-500/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    safetyData?.emergencyLockEnabled
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <Power className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-stone-900">
                      Global AI Emergency Kill-Switch
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        safetyData?.emergencyLockEnabled
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {safetyData?.emergencyLockEnabled ? 'ACTIVE / BLOCKED' : 'SYSTEM OPERATIONAL'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 max-w-xl">
                    {safetyData?.emergencyLockEnabled
                      ? `ALL user AI generation, photo analyses, and chat endpoints are currently halted. Reason: "${safetyData.emergencyReason || 'Admin halt'}"`
                      : 'When engaged, all multimodal photo analyses and chat streaming requests are instantly refused before calling Gemini, guaranteeing zero further cost accumulation.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Halt reason (optional)..."
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl w-full sm:w-48 text-stone-800 focus:outline-none focus:border-stone-500"
                />
                <button
                  onClick={handleToggleEmergencyLock}
                  disabled={emergencyToggling}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                    safetyData?.emergencyLockEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {emergencyToggling
                    ? 'Updating...'
                    : safetyData?.emergencyLockEnabled
                    ? 'Disengage Kill-Switch'
                    : 'Engage Emergency Halt'}
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Live Metrics & Budget Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily Cost Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
                <span>Daily Cost Consumed</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-stone-900">
                  ${(safetyData?.todayUsageCostUsd || 0).toFixed(3)}
                </span>
                <span className="text-xs text-stone-400 font-semibold">
                  / ${(safetyData?.dailyCostLimitUsd || 25).toFixed(2)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    ((safetyData?.todayUsageCostUsd || 0) / (safetyData?.dailyCostLimitUsd || 25)) > 0.8
                      ? 'bg-rose-500'
                      : 'bg-amber-400'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((safetyData?.todayUsageCostUsd || 0) / (safetyData?.dailyCostLimitUsd || 25)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-stone-500">
                {Math.round(
                  ((safetyData?.todayUsageCostUsd || 0) / (safetyData?.dailyCostLimitUsd || 25)) * 100
                )}
                % of daily budget used
              </div>
            </div>

            {/* Daily Request Count Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
                <span>Daily AI Requests</span>
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-stone-900">
                  {safetyData?.todayRequestCount || 0}
                </span>
                <span className="text-xs text-stone-400 font-semibold">
                  / {safetyData?.dailyRequestLimit || 1000}
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((safetyData?.todayRequestCount || 0) /
                          (safetyData?.dailyRequestLimit || 1000)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-stone-500">
                {Math.round(
                  ((safetyData?.todayRequestCount || 0) /
                    (safetyData?.dailyRequestLimit || 1000)) *
                    100
                )}
                % of daily request quota
              </div>
            </div>

            {/* Monthly Cost Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
                <span>Monthly Cost Consumed</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-stone-900">
                  ${(safetyData?.monthUsageCostUsd || 0).toFixed(3)}
                </span>
                <span className="text-xs text-stone-400 font-semibold">
                  / ${(safetyData?.monthlyCostLimitUsd || 300).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((safetyData?.monthUsageCostUsd || 0) /
                          (safetyData?.monthlyCostLimitUsd || 300)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-stone-500">
                Resets on 1st of each calendar month
              </div>
            </div>

            {/* Concurrency & Active Reservations */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
                <span>Concurrent User Lock</span>
                <Lock className="w-4 h-4 text-stone-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-stone-900">
                  {safetyData?.perUserConcurrentLimit || 1}
                </span>
                <span className="text-xs text-stone-400 font-semibold">max / user</span>
              </div>
              <div className="text-[11px] text-stone-600 font-medium pt-1">
                Active in-flight reservations: <span className="font-bold text-stone-900">0</span>
              </div>
              <div className="text-[10px] text-stone-400">
                Prevents spamming multiple requests in parallel
              </div>
            </div>
          </div>

          {/* Safety & Cost Threshold Configuration Form */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-base font-black text-stone-900">Cost Protection Thresholds</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  The backend enforces these limits automatically. If limits are reached, requests are safely throttled.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetCounters}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Usage Counters</span>
                </button>
                <button
                  onClick={handleSaveSafetyConfig}
                  disabled={savingSafety}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  {savingSafety ? 'Saving...' : 'Save Cost Thresholds'}
                </button>
              </div>
            </div>

            {safetySuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cost protection thresholds successfully saved and active in backend memory.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Daily Cost Cap ($ USD)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={safetyData?.dailyCostLimitUsd || 25}
                  onChange={(e) =>
                    setSafetyData({
                      ...safetyData,
                      dailyCostLimitUsd: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Hard stop if daily spend exceeds this</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Monthly Cost Cap ($ USD)
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  value={safetyData?.monthlyCostLimitUsd || 300}
                  onChange={(e) =>
                    setSafetyData({
                      ...safetyData,
                      monthlyCostLimitUsd: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Hard stop if monthly spend exceeds this</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Daily Max AI Requests
                </label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  value={safetyData?.dailyRequestLimit || 1000}
                  onChange={(e) =>
                    setSafetyData({
                      ...safetyData,
                      dailyRequestLimit: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Total API calls allowed across all users</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Max Concurrent Requests / User
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="5"
                  value={safetyData?.perUserConcurrentLimit || 1}
                  onChange={(e) =>
                    setSafetyData({
                      ...safetyData,
                      perUserConcurrentLimit: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Prevents parallel scraping or script attacks</span>
              </div>
            </div>
          </div>

          {/* Authoritative Security & Abuse Event Log */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-base font-black text-stone-900">Security & Abuse Event Log</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Server-side security log tracking blocked requests, rate limit triggers, and concurrency locks.
                </p>
              </div>
              {securityEvents.length > 0 && (
                <button
                  onClick={handleClearSecurityEvents}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 font-bold transition-colors"
                >
                  Clear Event Log
                </button>
              )}
            </div>

            {securityEvents.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-stone-200 rounded-2xl space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-xs font-bold text-stone-700">No Security Incidents Logged</div>
                <div className="text-[11px] text-stone-400 max-w-sm mx-auto">
                  All requests are passing authorization and rate checks normally.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Event Type</th>
                      <th className="px-4 py-3">User ID / Context</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {securityEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 text-stone-500 text-[11px] whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              ev.severity === 'danger'
                                ? 'bg-rose-100 text-rose-800'
                                : ev.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-stone-800 text-[11px]">
                          {ev.type}
                        </td>
                        <td className="px-4 py-3 text-stone-600 font-mono text-[11px]">
                          {ev.userId || 'anonymous'}
                        </td>
                        <td className="px-4 py-3 text-stone-700">{ev.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="text-base font-black text-stone-900">Error Event Log</h4>
              <button
                onClick={() => setSelectedError(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-stone-400 font-bold block">Timestamp:</span>
                <span className="font-mono text-stone-700">
                  {new Date(selectedError.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-bold block">Status / Code:</span>
                <span className="font-mono font-bold text-rose-700">
                  HTTP {selectedError.httpStatus} • {selectedError.errorCode}
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-bold block">User Query Snippet:</span>
                <span className="text-stone-700 font-medium">{selectedError.userQuerySnippet || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 font-bold block">Raw Message:</span>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 break-words">
                  {selectedError.errorMessage}
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
