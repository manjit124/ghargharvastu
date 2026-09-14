import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

export const AIPromptsTab: React.FC = () => {
  const [prompts, setPrompts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'primary' | 'photo' | 'language' | 'safety'>(
    'primary'
  );

  // Restore Modal
  const [confirmRestore, setConfirmRestore] = useState(false);

  // Test prompt modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testQuery, setTestQuery] = useState('Main entrance North-East mein hai, kya remedies karni chahiye?');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAIPrompts();
      setPrompts(data);
    } catch (err) {
      console.error('Failed to load prompts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await adminService.updateAIPrompts(prompts);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save prompts');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setSaving(true);
    try {
      const restored = await adminService.restoreDefaultAIPrompts();
      setPrompts(restored.prompts);
      setConfirmRestore(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to restore default prompts');
    } finally {
      setSaving(false);
    }
  };

  const handleRunLiveTest = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await adminService.testAI(testQuery);
      setTestResponse(
        res.sampleOutput ||
          res.reply ||
          'Sample Output generated successfully using the configured Vastu Vision AI instructions.'
      );
    } catch (err: any) {
      setTestResponse('Error testing prompt: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading && !prompts) {
    return <div className="p-8 text-center text-xs font-semibold text-stone-500">Loading AI Prompt Templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">AI Behavior & System Prompts</h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Define architectural rules, language nuances, and vision audit instructions (v{prompts.version}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestModalOpen(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Test Prompts Live</span>
          </button>
          <button
            onClick={() => setConfirmRestore(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {saving ? (
              <span>Saving...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Published!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Prompt Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveSection('primary')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === 'primary'
              ? 'bg-stone-900 text-amber-400'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          1. Identity & Tone
        </button>
        <button
          onClick={() => setActiveSection('photo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === 'photo'
              ? 'bg-stone-900 text-amber-400'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          2. Vision & Defect Rules
        </button>
        <button
          onClick={() => setActiveSection('language')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === 'language'
              ? 'bg-stone-900 text-amber-400'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          3. Hindi & Hinglish Rules
        </button>
        <button
          onClick={() => setActiveSection('safety')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === 'safety'
              ? 'bg-stone-900 text-amber-400'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          4. Safety & Disclaimer
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-6 shadow-xs">
        {activeSection === 'primary' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>Core Architectural Persona & Identity</span>
                <span className="text-[10px] text-stone-400">System Instruction Prompt</span>
              </label>
              <textarea
                rows={5}
                value={prompts.primarySystemPrompt}
                onChange={(e) => setPrompts({ ...prompts, primarySystemPrompt: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Non-Structural Remedial Style
              </label>
              <textarea
                rows={3}
                value={prompts.responseStyleRules}
                onChange={(e) => setPrompts({ ...prompts, responseStyleRules: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 block">
                Emphasize colors, mirrors, metal/elemental remedies, lighting, and textiles rather than structural demolition.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Directional Energy Guidelines
              </label>
              <textarea
                rows={3}
                value={prompts.directionalGuidanceRules}
                onChange={(e) =>
                  setPrompts({ ...prompts, directionalGuidanceRules: e.target.value })
                }
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
            </div>
          </div>
        )}

        {activeSection === 'photo' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Visual Inspection & Defect Auditing Directives
              </label>
              <textarea
                rows={6}
                value={prompts.imageAnalysisInstructions}
                onChange={(e) =>
                  setPrompts({ ...prompts, imageAnalysisInstructions: e.target.value })
                }
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 block">
                Instructs vision model on how to audit clutter, electrical switches, lighting fixtures, mirrors, and doorway positions.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Follow-up Question Generation Rules
              </label>
              <textarea
                rows={3}
                value={prompts.followUpRules}
                onChange={(e) => setPrompts({ ...prompts, followUpRules: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
            </div>
          </div>
        )}

        {activeSection === 'language' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Bilingual Hindi / Hinglish Response Formatting
              </label>
              <textarea
                rows={6}
                value={prompts.languageRules}
                onChange={(e) => setPrompts({ ...prompts, languageRules: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900 font-medium">
                Example: When queried in Roman Hindi / Hinglish (e.g., <em>"Wall clock kahan lagayein?"</em>), reply in natural, respectful Hinglish with clear bullet remedies.
              </div>
            </div>
          </div>
        )}

        {activeSection === 'safety' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Safety & Scope Limitations Prompt
              </label>
              <textarea
                rows={4}
                value={prompts.safetyInstructions}
                onChange={(e) => setPrompts({ ...prompts, safetyInstructions: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Mandatory Legal & Ethical Disclaimer
              </label>
              <textarea
                rows={3}
                value={prompts.disclaimer}
                onChange={(e) => setPrompts({ ...prompts, disclaimer: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono text-stone-800 leading-relaxed focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-stone-400">
          <div>Last saved: {new Date(prompts.lastUpdated).toLocaleString()}</div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save All Prompt Updates</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Restore Defaults */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-lg font-black text-stone-900">Restore System Defaults?</h4>
              <p className="text-xs text-stone-500">
                This will reset the primary AI instructions, language formatting, and vision rules to factory baseline VastuVision guidelines.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => setConfirmRestore(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold transition-colors"
              >
                Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Prompts Preview Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h4 className="text-base font-black text-stone-900">Test AI Behavioral Response</h4>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">User Query Simulation</label>
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900"
                />
              </div>

              <button
                onClick={handleRunLiveTest}
                disabled={testing}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                {testing ? (
                  <span>Generating AI Response...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Query with System Prompts</span>
                  </>
                )}
              </button>

              {testResponse && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                  <span className="font-bold text-stone-500 uppercase text-[10px] block">
                    AI Output Preview:
                  </span>
                  <div className="text-stone-800 whitespace-pre-wrap leading-relaxed">
                    {testResponse}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
