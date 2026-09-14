import React from 'react';
import {
  ShieldAlert,
  LogOut,
  ExternalLink,
  Menu,
  Sparkles,
  Server,
} from 'lucide-react';
import { AdminUserSanitized } from './types';

interface AdminHeaderProps {
  adminUser: AdminUserSanitized;
  activeTab: string;
  onLogout: () => void;
  onExitAdmin: () => void;
  onToggleMobileSidebar: () => void;
  geminiModel?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  adminUser,
  onLogout,
  onExitAdmin,
  onToggleMobileSidebar,
  geminiModel = 'gemini-3.1-flash-lite',
}) => {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ADMIN':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'CONTENT_MANAGER':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default:
        return 'bg-stone-500/20 text-stone-300 border-stone-500/30';
    }
  };

  return (
    <header className="bg-stone-900 border-b border-stone-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm sm:text-base tracking-tight">
                  VastuVision AI
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                  Admin Portal
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-400">
                <span className="flex items-center gap-1">
                  <Server className="w-3 h-3 text-emerald-400" />
                  Live Store Active
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {geminiModel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Admin Info & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="text-xs font-semibold text-stone-200">{adminUser?.name || 'Admin'}</div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${
                  adminUser?.role ? getRoleBadgeColor(adminUser.role) : ''
                }`}
              >
                {adminUser?.role ? adminUser.role.replace('_', ' ') : 'Admin'}
              </span>
              <span className="text-[10px] text-stone-400">{adminUser?.email || ''}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-stone-800 hidden sm:block" />

          <button
            onClick={onExitAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
            title="Go to User Application"
          >
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Public App</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-medium transition-colors"
            title="Sign out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
