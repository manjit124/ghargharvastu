import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import {
  AnonymizedAIAnalysisRecord,
  AIRequestLog,
  AIQualityFeedbackRecord,
} from '../types';

export const AiAuditLogsTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'analyses' | 'errors' | 'quality'>('analyses');
  const [analyses, setAnalyses] = useState<AnonymizedAIAnalysisRecord[]>([]);
  const [errorLogs, setErrorLogs] = useState<AIRequestLog[]>([]);
  const [qualityLogs, setQualityLogs] = useState<AIQualityFeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [anRes, errRes, qRes] = await Promise.all([
        adminFetch<{ analyses: AnonymizedAIAnalysisRecord[] }>('/api/admin/ai/analyses'),
        adminFetch<{ errorLogs: AIRequestLog[] }>('/api/admin/ai/error-logs'),
        adminFetch<{ qualityLogs: AIQualityFeedbackRecord[] }>('/api/admin/ai/quality-feedback'),
      ]);
      setAnalyses(anRes.analyses);
      setErrorLogs(errRes.errorLogs);
      setQualityLogs(qRes.qualityLogs);
    } catch (err) {
      console.error('Error loading AI audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearErrors = async () => {
    if (!confirm('Are you sure you want to clear all recorded AI error logs?')) return;
    try {
      await adminFetch('/api/admin/ai/error-logs', { method: 'DELETE' });
      setErrorLogs([]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear errors');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-stone-900">
            AI Workload, Error Diagnostics & Quality Audit
          </h1>
          <p className="text-xs text-stone-500">
            Audit anonymized room evaluations, inspect runtime Gemini model errors, and monitor user ratings
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:text-stone-900 self-start sm:self-auto shadow-2xs transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setSubTab('analyses')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'analyses'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Recent Analyses ({analyses.length})
        </button>

        <button
          onClick={() => setSubTab('errors')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'errors'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          AI Error Logs ({errorLogs.length})
        </button>

        <button
          onClick={() => setSubTab('quality')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'quality'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Quality Ratings ({qualityLogs.length})
        </button>
      </div>

      {/* 1. Recent Analyses */}
      {subTab === 'analyses' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Analysis Type</th>
                <th className="py-3 px-4">Room Zone</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Vastu Score</th>
                <th className="py-3 px-4">Defects Detected</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {analyses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No photo analyses recorded yet.
                  </td>
                </tr>
              ) : (
                analyses.map((an) => (
                  <tr key={an.id} className="hover:bg-stone-50/80">
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-400">{an.id}</td>
                    <td className="py-3 px-4 font-medium">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] uppercase">
                        {an.analysisType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{an.roomType}</td>
                    <td className="py-3 px-4 font-mono text-stone-600">{an.direction || '—'}</td>
                    <td className="py-3 px-4 font-bold text-amber-600 font-mono">
                      {an.vastuScore || 80}/100
                    </td>
                    <td className="py-3 px-4 font-mono">{an.defectCount} non-structural remedies</td>
                    <td className="py-3 px-4 text-stone-400 text-[11px]">
                      {new Date(an.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Error Logs */}
      {subTab === 'errors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Diagnostic trace of failed Gemini API requests or invalid payloads
            </span>
            {errorLogs.length > 0 && (
              <button
                onClick={handleClearErrors}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Error Log</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {errorLogs.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>All AI service endpoints are executing cleanly with 0 active error logs.</span>
              </div>
            ) : (
              errorLogs.map((err) => (
                <div
                  key={err.id}
                  className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[10px]">
                        HTTP {err.httpStatus}
                      </span>
                      <span className="font-semibold text-rose-950">
                        {err.errorCategory || 'API Error'}
                      </span>
                    </div>
                    <span className="font-mono text-stone-400 text-[11px]">
                      {new Date(err.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="text-rose-900 font-medium">
                    {err.userQuerySnippet || 'Error occurred during AI processing'}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-stone-500 font-mono pt-1">
                    <span>Model: {err.model}</span>
                    <span>Endpoint: {err.requestType}</span>
                    <span>Latency: {err.responseTimeMs}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. AI Quality Review */}
      {subTab === 'quality' && (
        <div className="space-y-3">
          {qualityLogs.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-400 text-xs">
              No rating logs recorded yet.
            </div>
          ) : (
            qualityLogs.map((q) => (
              <div
                key={q.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5 text-xs"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    q.rating === 'helpful'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {q.rating === 'helpful' ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : (
                    <ThumbsDown className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900">{q.query}</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(q.timestamp).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {q.comment && (
                    <p className="text-stone-600 text-[11px] bg-stone-50 p-2 rounded-lg">
                      "{q.comment}"
                    </p>
                  )}
                  <span className="text-[10px] text-stone-400">Category: {q.category}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
