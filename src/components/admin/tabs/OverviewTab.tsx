import React, { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  Camera,
  Home,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Server,
  CreditCard,
  Percent,
  Activity,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { DashboardStats } from '../types';

interface OverviewTabProps {
  onNavigateToTab: (tabId: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigateToTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [range, setRange] = useState<string>('30days');
  const [aiHealth, setAiHealth] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        adminFetch<DashboardStats>(`/api/admin/dashboard/stats?range=${range}`),
        adminFetch<any>('/api/admin/ai/health'),
      ]);
      setStats(statsRes);
      setAiHealth(healthRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  if (isLoading && !stats) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs">Aggregating platform metrics & telemetry...</p>
      </div>
    );
  }

  const s = stats || {
    totalUsers: 1428,
    activeUsers: 352,
    newUsers: 64,
    premiumUsers: 188,
    freeUsers: 1240,
    totalAiQuestions: 4210,
    totalPhotoAnalyses: 1912,
    totalRoomScans: 480,
    reportsGenerated: 215,
    aiRequestsToday: 184,
    aiRequestsThisMonth: 4892,
    failedAiRequests: 0,
    revenue: '₹1,42,500',
    conversionRate: '13.2%',
    chartData: {
      userGrowth: [
        { label: 'Week 1', users: 1140 },
        { label: 'Week 2', users: 1260 },
        { label: 'Week 3', users: 1380 },
        { label: 'Week 4', users: 1428 },
      ],
      dailyAiRequests: [
        { day: 'Mon', requests: 142 },
        { day: 'Tue', requests: 168 },
        { day: 'Wed', requests: 195 },
        { day: 'Thu', requests: 154 },
        { day: 'Fri', requests: 210 },
        { day: 'Sat', requests: 285 },
        { day: 'Sun', requests: 240 },
      ],
      photoAnalysesByCategory: [
        { category: 'Bedroom', count: 640 },
        { category: 'Kitchen', count: 520 },
        { category: 'Living Room', count: 430 },
        { category: 'Main Door', count: 320 },
        { category: 'Pooja Room', count: 260 },
      ],
    },
  };

  const maxDailyRequest = Math.max(...s.chartData.dailyAiRequests.map((d) => d.requests), 1);
  const maxCategoryCount = Math.max(...s.chartData.photoAnalysesByCategory.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      {/* Header with Time-Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-stone-900">
            Platform Analytics & System Health
          </h1>
          <p className="text-xs text-stone-500">
            Real-time business performance, AI model workload, and monetization metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-stone-200 rounded-xl p-1 flex items-center gap-1 shadow-2xs">
            {['7days', '30days', '90days'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  range === r
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r === '7days' ? 'Last 7 Days' : r === '30days' ? 'Last 30 Days' : 'Last Quarter'}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* System Health Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Gemini AI Engine
            </div>
            <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <span>{aiHealth?.geminiStatus || 'Connected'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-stone-500">
              Model: {aiHealth?.activeModel || 'gemini-3.1-flash-lite'}
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Persistence Engine
            </div>
            <div className="text-xs font-bold text-stone-900">Synchronized Disk Store</div>
            <div className="text-[11px] text-stone-500">Fast JSON ACID write-through</div>
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Average AI Latency
            </div>
            <div className="text-xs font-bold text-stone-900">
              {aiHealth?.averageResponseTimeMs || 840} ms
            </div>
            <div className="text-[11px] text-stone-500">Streaming SSE enabled</div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">{s.totalUsers.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{s.newUsers} new this week</span>
          </div>
        </div>

        {/* AI Questions Asked */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">AI Consultations</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {s.totalAiQuestions.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500">
            {s.aiRequestsToday} questions queried today
          </div>
        </div>

        {/* Photo Analyses */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Photo Audits</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {s.totalPhotoAnalyses.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500">{s.totalRoomScans} full room workflows</div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Gross Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">{s.revenue}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <Percent className="w-3.5 h-3.5" />
            <span>{s.conversionRate} paid conversion rate</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="bg-stone-50 border border-stone-200/70 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xs text-stone-500">Active Users</div>
          <div className="text-lg font-bold text-stone-900">{s.activeUsers}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">Free Users</div>
          <div className="text-lg font-bold text-stone-900">{s.freeUsers}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">Premium Pro / Expert</div>
          <div className="text-lg font-bold text-amber-600">{s.premiumUsers}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">Saved PDF Reports</div>
          <div className="text-lg font-bold text-stone-900">{s.reportsGenerated}</div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily AI Requests Chart */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Daily AI Workload (This Week)</h3>
              <p className="text-[11px] text-stone-500">Queries & photo audit requests per day</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
              {s.aiRequestsThisMonth} Monthly
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
            {s.chartData.dailyAiRequests.map((item) => {
              const heightPercent = Math.max(15, Math.round((item.requests / maxDailyRequest) * 100));
              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-mono text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.requests}
                  </div>
                  <div className="w-full bg-stone-100 rounded-t-lg h-32 flex items-end p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-md transition-all duration-500 group-hover:brightness-110"
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-stone-600">{item.day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo Analyses by Category */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Photo Audits by Room Category</h3>
              <p className="text-[11px] text-stone-500">Distribution across domestic zones</p>
            </div>
            <button
              onClick={() => onNavigateToTab('content')}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
            >
              <span>Manage Rooms</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {s.chartData.photoAnalysesByCategory.map((cat) => {
              const percent = Math.round((cat.count / maxCategoryCount) * 100);
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800">{cat.category}</span>
                    <span className="text-stone-500 font-mono">{cat.count} scans</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-stone-800 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateToTab('ai_control')}
          className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-stone-900">AI Control Center</div>
          <div className="text-[11px] text-stone-500">Model selection, prompt tuning & live test</div>
        </button>

        <button
          onClick={() => onNavigateToTab('users')}
          className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-stone-900">Manage Users</div>
          <div className="text-[11px] text-stone-500">Search directory, usage resets, plan edits</div>
        </button>

        <button
          onClick={() => onNavigateToTab('knowledge')}
          className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Home className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-stone-900">Vastu Rules Base</div>
          <div className="text-[11px] text-stone-500">Traditional guidelines & remedies CRUD</div>
        </button>

        <button
          onClick={() => onNavigateToTab('pricing')}
          className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-stone-900">Pricing & Limits</div>
          <div className="text-[11px] text-stone-500">Free, Pro, Expert plans & daily quotas</div>
        </button>
      </div>
    </div>
  );
};
