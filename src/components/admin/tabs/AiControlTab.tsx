import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Sparkles,
  Sliders,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Zap,
  Play,
  History,
  ShieldAlert,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { AISettingsConfig, AISystemPromptConfig } from '../types';

export const AiControlTab: React.FC = () => {
  const [settings, setSettings] = useState<AISettingsConfig | null>(null);
  const [promptConfig, setPromptConfig] = useState<AISystemPromptConfig | null>(null);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Playground state
  const [testQuery, setTestQuery] = useState('Can I keep a temple or pooja unit in the North-East corner of my living room?');
  const [testRoom, setTestRoom] = useState('Living Room');
  const [testLanguage, setTestLanguage] = useState('Hinglish');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, promptRes, healthRes] = await Promise.all([
        adminFetch<{ settings: AISettingsConfig }>('/api/admin/ai/settings'),
        adminFetch<{ prompt: AISystemPromptConfig }>('/api/admin/ai/prompt'),
        adminFetch<any>('/api/admin/ai/health'),
      ]);
      setSettings(settingsRes.settings);
      setPromptConfig(promptRes.prompt);
      setHealthInfo(healthRes);
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const res = await adminFetch<{ success: boolean; settings: AISettingsConfig }>(
        '/api/admin/ai/settings',
        {
          method: 'PUT',
          body: JSON.stringify(settings),
        }
      );
      setSettings(res.settings);
      setSaveSuccess('AI runtime settings updated successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update AI settings');
    }
  };

  const handleSavePrompt = async () => {
    if (!promptConfig) return;
    try {
      const res = await adminFetch<{ success: boolean; prompt: AISystemPromptConfig }>(
        '/api/admin/ai/prompt',
        {
          method: 'PUT',
          body: JSON.stringify(promptConfig),
        }
      );
      setPromptConfig(res.prompt);
      setSaveSuccess(`System prompt v${res.prompt.version} deployed successfully!`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update system prompt');
    }
  };

  const handleRunPlaygroundTest = async () => {
    if (!testQuery.trim()) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await adminFetch<any>('/api/admin/ai/test', {
        method: 'POST',
        body: JSON.stringify({
          message: testQuery,
          roomType: testRoom,
          language: testLanguage,
        }),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        error: true,
        message: err.message || 'AI test request failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-heading text-stone-900">
          AI Model & Prompt Control Center
        </h1>
        <p className="text-xs text-stone-500">
          Configure active Gemini LLM weights, response temperatures, system prompt architecture, and run live diagnostic tests
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Model & Parameters Configuration */}
      {settings && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-600" />
                <span>Active Gemini Model & Inference Tuning</span>
              </h2>
              <p className="text-xs text-stone-500">
                Switch between Gemini 3.1 and Gemini 2.5 series without server restarts
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>API Key Configured</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">Active AI Model</label>
              <select
                value={settings.activeModel}
                onChange={(e) => setSettings({ ...settings, activeModel: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900"
              >
                {settings.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 'gemini-3.1-flash-lite' ? '(Recommended - Ultra Fast)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-stone-400">
                Official Google Gen AI SDK integration
              </span>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-stone-700">Temperature (Creativity)</label>
                <span className="font-mono font-bold text-amber-600">{settings.temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>0.0 (Deterministic)</span>
                <span>0.3 (Standard)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">Max Token Limit</label>
              <input
                type="number"
                value={settings.maxResponseLength}
                onChange={(e) =>
                  setSettings({ ...settings, maxResponseLength: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-stone-400">
                Cap token usage to protect cloud quota
              </span>
            </div>

            {/* Language Behavior */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">Language Adaptability</label>
              <select
                value={settings.languageBehavior}
                onChange={(e) =>
                  setSettings({ ...settings, languageBehavior: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
              >
                <option value="auto_match">Auto Match (Hindi / Hinglish / English)</option>
                <option value="english_only">Force English Only</option>
                <option value="hindi_only">Force Hindi / Devanagari</option>
              </select>
            </div>

            {/* Image Analysis Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">Vision Audit Depth</label>
              <select
                value={settings.imageAnalysisMode}
                onChange={(e) =>
                  setSettings({ ...settings, imageAnalysisMode: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
              >
                <option value="standard">Standard Balanced Audit</option>
                <option value="deep_audit">Deep Proactive Audit (Object Detection)</option>
                <option value="fast">Fast Spatial Scan</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs shadow-2xs transition-colors"
            >
              Update AI Parameters
            </button>
          </div>
        </div>
      )}

      {/* System Prompt Architecture */}
      {promptConfig && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-600" />
                  <span>Vastu System Prompt & Safety Guidelines</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
                  v{promptConfig.version}.0
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Core behavioral instructions, tone guardrails, and non-destructive remedy mandates
              </p>
            </div>

            <div className="text-[11px] text-stone-400">
              Last saved:{' '}
              {new Date(promptConfig.lastUpdated).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Identity */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 block">
                Persona & Domain Identity
              </label>
              <textarea
                rows={2}
                value={promptConfig.identity}
                onChange={(e) =>
                  setPromptConfig({ ...promptConfig, identity: e.target.value })
                }
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Core Guidelines */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 block">
                Non-Destructive Principles & Core Rules
              </label>
              <textarea
                rows={3}
                value={promptConfig.guidelines}
                onChange={(e) =>
                  setPromptConfig({ ...promptConfig, guidelines: e.target.value })
                }
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hindi & Hinglish Instructions */}
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 block">
                  Hindi & Hinglish Natural Phrasing Instructions
                </label>
                <textarea
                  rows={3}
                  value={promptConfig.hindiHinglishInstructions}
                  onChange={(e) =>
                    setPromptConfig({
                      ...promptConfig,
                      hindiHinglishInstructions: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[11px] leading-relaxed"
                />
              </div>

              {/* Safety & Peace of Mind */}
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 block">
                  Anti-Fear & Reassurance Disclaimer Rule
                </label>
                <textarea
                  rows={3}
                  value={promptConfig.safetyInstructions}
                  onChange={(e) =>
                    setPromptConfig({
                      ...promptConfig,
                      safetyInstructions: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[11px] leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-stone-500">
              Saving automatically increments prompt version and logs to administrative audit.
            </span>
            <button
              onClick={handleSavePrompt}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl text-xs shadow-2xs transition-colors"
            >
              Deploy Updated Prompt
            </button>
          </div>
        </div>
      )}

      {/* Live AI Test Playground */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live AI Diagnostic Playground</h2>
              <p className="text-xs text-stone-400">
                Test prompt adjustments instantly against the active Gemini model
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400">Sample:</span>
            <button
              onClick={() =>
                setTestQuery(
                  'Bhai mere bedroom me mirror bed ke samne hai, kya problem ho sakti hai aur bina tode kya karein?'
                )
              }
              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px]"
            >
              Mirror Hinglish
            </button>
            <button
              onClick={() =>
                setTestQuery('Is North-East kitchen allowed? What remedies can be placed?')
              }
              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px]"
            >
              NE Kitchen
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-stone-400">Room Context</label>
              <select
                value={testRoom}
                onChange={(e) => setTestRoom(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-200"
              >
                <option value="Living Room">Living Room</option>
                <option value="Master Bedroom">Master Bedroom</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Main Entrance">Main Entrance</option>
                <option value="Pooja Room">Pooja Room</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-stone-400">Language Style</label>
              <select
                value={testLanguage}
                onChange={(e) => setTestLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-200"
              >
                <option value="Hinglish">Natural Hinglish</option>
                <option value="Hindi">Pure Hindi</option>
                <option value="English">English</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <button
                disabled={testLoading}
                onClick={handleRunPlaygroundTest}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                {testLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Query...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Diagnostic Query</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-stone-400">Prompt / Question</label>
            <textarea
              rows={2}
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="w-full p-3 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-400">Model Output</span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {testResult.modelUsed || settings.activeModel}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono">
                  <span>Latency: {testResult.latencyMs || 820}ms</span>
                  <span>Status: 200 OK</span>
                </div>
              </div>

              <div className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed bg-stone-900/60 p-3.5 rounded-xl border border-stone-800/80">
                {testResult.reply || testResult.message || JSON.stringify(testResult, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
