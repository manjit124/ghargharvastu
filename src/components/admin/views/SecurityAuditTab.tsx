import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  FileText,
  Download,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  UserCheck,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

export const SecurityAuditTab: React.FC = () => {
  const [activeSub, setActiveSub] = useState<'profile' | 'audit' | 'export'>('profile');

  // Profile / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchAudit, setSearchAudit] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [loadingLogs, setLoadingLogs] = useState(false);

  const currentUser = adminService.getCurrentAdminUser();

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await adminService.getAuditLogs({
        action: actionFilter,
        search: searchAudit,
      });
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSub === 'audit') {
      fetchLogs();
    }
  }, [activeSub, actionFilter]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setChangingPass(true);
    try {
      await adminService.changePassword(currentPassword, newPassword);
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update admin credentials');
    } finally {
      setChangingPass(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      await adminService.downloadExport(type);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSub('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSub === 'profile'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Admin Profile & Credentials
          </button>
          <button
            onClick={() => setActiveSub('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSub === 'audit'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Security & Audit Ledger
          </button>
          <button
            onClick={() => setActiveSub('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSub === 'export'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Data Backup & One-Click Export
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PROFILE & PASSWORD */}
      {activeSub === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Session Info */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-lg border border-amber-200/60">
                VA
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {currentUser?.name || 'Administrator'}
                </h3>
                <p className="text-xs text-stone-500 font-medium">{currentUser?.email}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs border-t border-stone-100">
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Assigned Role:</span>
                <span className="font-bold text-stone-900 capitalize">
                  {currentUser?.role || 'super_admin'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Session Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Authenticated & Active
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Token Verification:</span>
                <span className="font-mono text-stone-600">Bearer Signed (HttpOnly Safe)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500 font-medium">Session Inactivity Timeout:</span>
                <span className="font-bold text-stone-900">30 minutes auto-lock</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => adminService.logout()}
                className="w-full py-2.5 bg-stone-100 hover:bg-rose-50 text-stone-800 hover:text-rose-700 rounded-xl text-xs font-bold transition-colors"
              >
                Terminate Active Session & Logout
              </button>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-black text-stone-900">Change Admin Password</h3>
              <p className="text-xs text-stone-500 font-medium">
                Update the master administrator credentials for VastuVision AI.
              </p>
            </div>

            {passSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}

            {passError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  {changingPass ? 'Verifying & Saving...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 2: AUDIT LEDGER */}
      {activeSub === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Search audit actions, resources, or admin..."
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
            >
              <option value="all">All Action Categories</option>
              <option value="USER">User Operations</option>
              <option value="SYSTEM">System & Config</option>
              <option value="AI">AI Prompts & Model</option>
              <option value="PRICING">Pricing & Plans</option>
            </select>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Resource Target</th>
                  <th className="px-4 py-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-800">{log.adminEmail}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-700">{log.targetResource}</td>
                    <td className="px-4 py-3 text-stone-600 max-w-sm truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DATA EXPORT */}
      {activeSub === 'export' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900">Users Roster</h4>
              <p className="text-xs text-stone-500">
                Full export of registered user accounts, active plans, and usage counters.
              </p>
            </div>
            <button
              onClick={() => handleExport('users')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900">Subscriptions & Billing</h4>
              <p className="text-xs text-stone-500">
                Payment transactions, active subscriptions, revenue values, and periods.
              </p>
            </div>
            <button
              onClick={() => handleExport('subscriptions')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900">Vedic Knowledge Base</h4>
              <p className="text-xs text-stone-500">
                Curated rules, spatial guidelines, directions, and remedial instructions.
              </p>
            </div>
            <button
              onClick={() => handleExport('knowledge')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900">Feedback & Ratings</h4>
              <p className="text-xs text-stone-500">
                User feedback submissions, ratings, satisfaction marks, and support tickets.
              </p>
            </div>
            <button
              onClick={() => handleExport('feedback')}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
