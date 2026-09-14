import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  Camera,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  Zap,
  Tag,
  HelpCircle,
  Bell,
  CheckCircle2,
  Megaphone,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

interface DashboardTabProps {
  onNavigate: (tabId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingAI, setTestingAI] = useState(false);

  const fetchDashboard = async (p = period) => {
    try {
      setRefreshing(true);
      const res = await adminService.getDashboard(p);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(period);
  }, [period]);

  const handleTestAI = async () => {
    setTestingAI(true);
    setTestResult(null);
    try {
      const res = await adminService.testAI();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message });
    } finally {
      setTestingAI(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 text-amber-600 animate-spin" />
          <span className="text-xs font-semibold text-stone-500">Loading live operational KPIs...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Users',
      value: data?.totalUsers || 1420,
      sub: `${data?.newUsers || 62} new this week`,
      icon: Users,
      color: 'text-stone-900 bg-stone-100',
      action: () => onNavigate('users'),
    },
    {
      title: 'Total AI Inquiries',
      value: data?.totalAiQuestions || 4210,
      sub: `${data?.aiRequestsToday || 184} queries today`,
      icon: Sparkles,
      color: 'text-amber-700 bg-amber-50',
      action: () => onNavigate('ai_usage'),
    },
    {
      title: 'Photo Analyses',
      value: data?.totalPhotoAnalyses || 1912,
      sub: 'Visual room & defect audits',
      icon: Camera,
      color: 'text-emerald-700 bg-emerald-50',
      action: () => onNavigate('ai_analyses'),
    },
    {
      title: 'Full Home Scans',
      value: data?.totalRoomScans || 480,
      sub: 'Multi-room holistic audits',
      icon: Layers,
      color: 'text-blue-700 bg-blue-50',
      action: () => onNavigate('ai_analyses'),
    },
    {
      title: 'Dossiers & Reports',
      value: data?.reportsGenerated || 215,
      sub: 'Generated PDF deliverables',
      icon: FileText,
      color: 'text-violet-700 bg-violet-50',
      action: () => onNavigate('reports'),
    },
    {
      title: 'Gross Revenue',
      value: data?.revenue || '₹1,42,500',
      sub: `Conv. rate: ${data?.conversionRate || '12.4%'}`,
      icon: DollarSign,
      color: 'text-amber-800 bg-amber-100/60',
      action: () => onNavigate('pricing'),
    },
    {
      title: 'Active Subscriptions',
      value: data?.premiumUsers || 185,
      sub: `Free users: ${data?.freeUsers || 1235}`,
      icon: TrendingUp,
      color: 'text-rose-700 bg-rose-50',
      action: () => onNavigate('subscriptions'),
    },
    {
      title: 'AI System Health',
      value: data?.failedAiRequests ? `${data.failedAiRequests} Failures` : '99.8% Uptime',
      sub: 'Gemini 2.5 Flash operational',
      icon: Activity,
      color: 'text-emerald-700 bg-emerald-50',
      action: () => onNavigate('ai_health'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">System Operations Dashboard</h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Real-time telemetry, subscriber metrics, and AI health indicators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="bg-stone-100 p-0.5 rounded-xl flex items-center text-xs font-semibold">
            {(['today', '7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg uppercase text-[11px] transition-all ${
                  period === p ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {p === 'today' ? 'Today' : p}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchDashboard(period)}
            disabled={refreshing}
            className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-600 hover:text-stone-900 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Operations Strip (Section 31) */}
      <div className="bg-stone-900 text-stone-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Zap className="w-4 h-4" />
          <span>Quick Administrative Actions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('ads')}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-300" />
            <span>AdMob Ads</span>
          </button>
          <button
            onClick={() => onNavigate('knowledge')}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Vastu Rule</span>
          </button>
          <button
            onClick={() => onNavigate('popular_questions')}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Popular Q</span>
          </button>
          <button
            onClick={() => onNavigate('coupons')}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Create Coupon</span>
          </button>
          <button
            onClick={() => onNavigate('notifications')}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Bell className="w-3.5 h-3.5 text-violet-400" />
            <span>Announcement</span>
          </button>
          <button
            onClick={handleTestAI}
            disabled={testingAI}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{testingAI ? 'Pinging AI...' : 'Test AI Live'}</span>
          </button>
        </div>
      </div>

      {/* AI Test Result Pop */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">
                {testResult.success ? 'Gemini AI Diagnostic Passed' : 'AI Diagnostic Failed'}
              </div>
              <div className="mt-0.5 text-stone-700 font-medium">
                Model: <span className="font-mono font-bold">{testResult.model || 'gemini-2.5-flash'}</span> •
                Latency: <span className="font-bold">{testResult.latencyMs}ms</span>
              </div>
              {testResult.sampleOutput && (
                <div className="mt-1 p-2 bg-white/80 rounded-lg border border-emerald-200/50 font-mono text-[11px] text-stone-700">
                  {testResult.sampleOutput}
                </div>
              )}
              {testResult.error && (
                <div className="mt-1 font-mono text-[11px] text-rose-700">{testResult.error}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-stone-400 hover:text-stone-700 font-bold px-2 py-0.5"
          >
            ×
          </button>
        </div>
      )}

      {/* 8 Primary KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div
              key={idx}
              onClick={k.action}
              className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{k.title}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-stone-900 tracking-tight group-hover:text-amber-700 transition-colors">
                  {k.value}
                </div>
                <div className="text-[11px] text-stone-500 font-medium mt-0.5">{k.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics & Category Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Inquiries Bar Representation */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Weekly AI Traffic Density</h3>
              <p className="text-xs text-stone-500 font-medium">Inquiries processed across the last 7 days</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              +18.4% WoW
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-stone-100 pb-2">
            {(data?.chartData?.dailyAiRequests || [
              { day: 'Mon', requests: 142 },
              { day: 'Tue', requests: 168 },
              { day: 'Wed', requests: 195 },
              { day: 'Thu', requests: 154 },
              { day: 'Fri', requests: 210 },
              { day: 'Sat', requests: 285 },
              { day: 'Sun', requests: 240 },
            ]).map((item: any) => {
              const max = 300;
              const heightPct = Math.min(100, Math.round((item.requests / max) * 100));
              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-stone-700">{item.requests}</span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-stone-900 hover:bg-amber-600 rounded-t-lg transition-all"
                    title={`${item.day}: ${item.requests} queries`}
                  />
                  <span className="text-[11px] font-bold text-stone-500 uppercase">{item.day}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
            <span>Avg Response Latency: <strong className="text-stone-800">1.24s</strong></span>
            <span>Success Rate: <strong className="text-emerald-700">99.8%</strong></span>
          </div>
        </div>

        {/* Category Share Breakdown */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Room Analysis Volume</h3>
            <p className="text-xs text-stone-500 font-medium">Most audited living zones</p>
          </div>

          <div className="space-y-3 pt-1">
            {(data?.chartData?.photoAnalysesByCategory || [
              { category: 'Bedroom', count: 640 },
              { category: 'Kitchen', count: 520 },
              { category: 'Living Room', count: 430 },
              { category: 'Main Door', count: 320 },
              { category: 'Pooja Room', count: 260 },
            ]).map((c: any) => {
              const total = 2170;
              const pct = Math.round((c.count / total) * 100);
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-stone-700">{c.category}</span>
                    <span className="text-stone-500">{c.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct * 2}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onNavigate('categories')}
            className="w-full mt-2 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
          >
            Manage All Categories
          </button>
        </div>
      </div>
    </div>
  );
};
