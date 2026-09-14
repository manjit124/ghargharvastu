import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Bell,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  FileSpreadsheet,
  Download,
  Shield,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import {
  AppSettingsConfig,
  FeatureFlagsConfig,
  NotificationRecord,
  UserFeedbackRecord,
  AuditLogRecord,
} from '../types';

export const PlatformSettingsTab: React.FC = () => {
  const [subTab, setSubTab] = useState<
    'settings' | 'flags' | 'banners' | 'feedback' | 'audit' | 'export'
  >('settings');

  const [settings, setSettings] = useState<AppSettingsConfig | null>(null);
  const [flags, setFlags] = useState<FeatureFlagsConfig | null>(null);
  const [banners, setBanners] = useState<NotificationRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<UserFeedbackRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Banner state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<NotificationRecord>>({
    title: '',
    message: '',
    type: 'announcement',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    dismissible: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stRes, flRes, bnRes, fbRes, auRes] = await Promise.all([
        adminFetch<{ settings: AppSettingsConfig }>('/api/admin/settings'),
        adminFetch<{ flags: FeatureFlagsConfig }>('/api/admin/feature-flags'),
        adminFetch<{ notifications: NotificationRecord[] }>('/api/admin/notifications'),
        adminFetch<{ feedback: UserFeedbackRecord[] }>('/api/admin/feedback'),
        adminFetch<{ auditLogs: AuditLogRecord[] }>('/api/admin/audit-logs'),
      ]);
      setSettings(stRes.settings);
      setFlags(flRes.flags);
      setBanners(bnRes.notifications);
      setFeedbacks(fbRes.feedback);
      setAuditLogs(auRes.auditLogs);
    } catch (err) {
      console.error('Error loading settings:', err);
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
      const res = await adminFetch<{ success: boolean; settings: AppSettingsConfig }>(
        '/api/admin/settings',
        { method: 'PUT', body: JSON.stringify(settings) }
      );
      setSettings(res.settings);
      setSuccessMessage('App settings saved and synced with public endpoints!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleSaveFlags = async () => {
    if (!flags) return;
    try {
      const res = await adminFetch<{ success: boolean; flags: FeatureFlagsConfig }>(
        '/api/admin/feature-flags',
        { method: 'PUT', body: JSON.stringify(flags) }
      );
      setFlags(res.flags);
      setSuccessMessage('Feature flags updated live!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update feature flags');
    }
  };

  const handleCreateBanner = async () => {
    if (!newBanner.title || !newBanner.message) return;
    try {
      const res = await adminFetch<{ success: boolean; notification: NotificationRecord }>(
        '/api/admin/notifications',
        { method: 'POST', body: JSON.stringify(newBanner) }
      );
      setBanners((prev) => [res.notification, ...prev]);
      setIsBannerModalOpen(false);
      setSuccessMessage('Site banner created');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete this announcement banner?')) return;
    try {
      await adminFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateFeedbackStatus = async (
    id: string,
    status: 'open' | 'in_progress' | 'resolved'
  ) => {
    try {
      const res = await adminFetch<{ success: boolean; feedback: UserFeedbackRecord }>(
        `/api/admin/feedback/${id}`,
        { method: 'PUT', body: JSON.stringify({ status }) }
      );
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? res.feedback : f)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-heading text-stone-900">
          Platform Controls, Banners & Feature Flags
        </h1>
        <p className="text-xs text-stone-500">
          Global application branding, maintenance mode toggles, runtime feature flags, and administrative audit trails
        </p>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setSubTab('settings')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'settings'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          General App Config
        </button>

        <button
          onClick={() => setSubTab('flags')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'flags'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Feature Flags
        </button>

        <button
          onClick={() => setSubTab('banners')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'banners'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Announcements ({banners.length})
        </button>

        <button
          onClick={() => setSubTab('feedback')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'feedback'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          User Feedback ({feedbacks.length})
        </button>

        <button
          onClick={() => setSubTab('audit')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'audit'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>

        <button
          onClick={() => setSubTab('export')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'export'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          CSV Export Center
        </button>
      </div>

      {/* 1. General Settings */}
      {subTab === 'settings' && settings && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-900">App Identity & Operational State</h2>
              <p className="text-xs text-stone-500">Live variables exposed via /api/app-config</p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>

          {/* Maintenance Mode Alert Box */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              settings.maintenanceMode
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    settings.maintenanceMode ? 'text-rose-600' : 'text-stone-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">
                    Maintenance Mode {settings.maintenanceMode ? '● ACTIVE' : '○ Standby'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    When active, public consumer interactions display a friendly maintenance splash.
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                  }
                  className="rounded border-stone-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-bold">Enable Mode</span>
              </label>
            </div>

            {settings.maintenanceMode && (
              <div className="mt-3 pt-3 border-t border-rose-200/60">
                <label className="text-xs font-semibold block mb-1">
                  Custom Maintenance Notice to Users:
                </label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMessage: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700">Application Name</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700">Contact Telephone / WhatsApp</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700">Default App Language</label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 2. Feature Flags */}
      {subTab === 'flags' && flags && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Live Feature Toggles</h2>
              <p className="text-xs text-stone-500">
                Instantly turn features on or off without deploying new code
              </p>
            </div>
            <button
              onClick={handleSaveFlags}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Flags</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(flags).map(([key, val]) => (
              <div
                key={key}
                className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/50 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-stone-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">{key}</div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Banner Announcements */}
      {subTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Sitewide notice banners displayed at top of app
            </span>
            <button
              onClick={() => setIsBannerModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Banner</span>
            </button>
          </div>

          <div className="space-y-3">
            {banners.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-stone-900">{b.title}</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] uppercase font-semibold">
                      {b.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {b.active ? 'ACTIVE' : 'DRAFT'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">{b.message}</p>
                </div>

                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. User Feedback */}
      {subTab === 'feedback' && (
        <div className="space-y-3">
          {feedbacks.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-400 text-xs">
              No user feedback tickets submitted yet.
            </div>
          ) : (
            feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900">
                      {fb.userName || 'Anonymous User'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] uppercase">
                      {fb.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={fb.status}
                      onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value as any)}
                      className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-[11px] font-semibold"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <p className="text-stone-700 bg-stone-50 p-2.5 rounded-xl">{fb.message}</p>
                <div className="text-[10px] text-stone-400 font-mono">
                  Submitted: {new Date(fb.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Audit Logs */}
      {subTab === 'audit' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Item Affected</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                    {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-semibold">{log.adminName}</td>
                  <td className="py-3 px-4 font-mono text-amber-700">{log.action}</td>
                  <td className="py-3 px-4 text-stone-800">{log.affectedItem}</td>
                  <td className="py-3 px-4 text-stone-500">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. CSV Export Center */}
      {subTab === 'export' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Users Master Directory CSV</h3>
            <p className="text-xs text-stone-500">
              Complete registry of all registered users, subscription plans, and AI query counters.
            </p>
            <button
              onClick={() => window.open('/api/admin/export/users', '_blank')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download users_export.csv</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Subscriptions Ledger CSV</h3>
            <p className="text-xs text-stone-500">
              Monetization history, payment states, and active renewal dates.
            </p>
            <button
              onClick={() => window.open('/api/admin/export/subscriptions', '_blank')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download subscriptions_export.csv</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Vastu Knowledge Base CSV</h3>
            <p className="text-xs text-stone-500">
              Vedic rules, directions, remedies, and traditional guidelines repository.
            </p>
            <button
              onClick={() => window.open('/api/admin/export/knowledge', '_blank')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download vastu_knowledge_export.csv</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Customer Feedback CSV</h3>
            <p className="text-xs text-stone-500">
              Audit log of user suggestions, AI quality reviews, and reported issues.
            </p>
            <button
              onClick={() => window.open('/api/admin/export/feedback', '_blank')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download customer_feedback_export.csv</span>
            </button>
          </div>
        </div>
      )}

      {/* New Banner Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Create Announcement Banner</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Banner Title</label>
                <input
                  type="text"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  placeholder="e.g. Diwal Special Vastu Consultation"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Notice Message</label>
                <textarea
                  rows={2}
                  value={newBanner.message}
                  onChange={(e) => setNewBanner({ ...newBanner, message: e.target.value })}
                  placeholder="e.g. Enjoy 30% off Pro Advisor plans this festive week!"
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Banner Type</label>
                <select
                  value={newBanner.type}
                  onChange={(e) => setNewBanner({ ...newBanner, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <option value="announcement">Announcement</option>
                  <option value="promotion">Promotional Offer</option>
                  <option value="feature">New Feature</option>
                  <option value="maintenance">Maintenance Warning</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBanner}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Publish Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
