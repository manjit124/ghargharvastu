import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Cpu,
  BookOpen,
  FolderTree,
  FileText,
  Activity,
  Sliders,
  FileSpreadsheet,
  X,
  MessageSquareText,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import { AdminRole } from './types';

export type AdminTabId =
  | 'overview'
  | 'users'
  | 'pricing'
  | 'payments'
  | 'ai_control'
  | 'knowledge'
  | 'content'
  | 'subscriptions'
  | 'ai_audit'
  | 'settings'
  | 'export';

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  userRole: AdminRole;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  openFeedbackCount?: number;
  unresolvedErrorsCount?: number;
}

interface NavGroup {
  label: string;
  items: {
    id: AdminTabId;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    roles?: AdminRole[];
  }[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  isMobileOpen,
  onCloseMobile,
  openFeedbackCount = 0,
  unresolvedErrorsCount = 0,
}) => {
  const navGroups: NavGroup[] = [
    {
      label: 'Core Management',
      items: [
        { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'users', label: 'User Directory', icon: Users },
        { id: 'pricing', label: 'Pricing & Usage Limits', icon: CreditCard },
        { id: 'payments', label: 'Payment Settings', icon: CreditCard, badge: 'Razorpay', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
        { id: 'ai_control', label: 'AI Control Center', icon: Cpu, badge: 'Live', badgeColor: 'bg-amber-500/20 text-amber-300' },
        { id: 'knowledge', label: 'Vastu Knowledge Base', icon: BookOpen },
      ],
    },
    {
      label: 'Content & Monetization',
      items: [
        { id: 'content', label: 'Categories, SEO & FAQ', icon: FolderTree },
        { id: 'subscriptions', label: 'Subscriptions & Coupons', icon: FileSpreadsheet },
        {
          id: 'ai_audit',
          label: 'AI Analyses & Errors',
          icon: Activity,
          badge: unresolvedErrorsCount > 0 ? unresolvedErrorsCount : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300',
        },
      ],
    },
    {
      label: 'Platform & Controls',
      items: [
        {
          id: 'settings',
          label: 'Settings & Feature Flags',
          icon: Sliders,
          badge: openFeedbackCount > 0 ? `${openFeedbackCount} Feedbacks` : undefined,
          badgeColor: 'bg-sky-500/20 text-sky-300',
        },
        { id: 'export', label: 'Audit Logs & CSV Export', icon: FileText },
      ],
    },
  ];

  const handleItemClick = (id: AdminTabId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-stone-900 text-stone-200 border-r border-stone-800 select-none">
      {/* Mobile close bar */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
          <Sparkles className="w-4 h-4" />
          <span>Admin Modules</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1 rounded-lg text-stone-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              {group.label}
            </div>

            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 font-bold shadow'
                        : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-stone-950' : 'text-stone-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-stone-900/30 text-stone-950'
                            : item.badgeColor || 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Info Card */}
      <div className="p-3 m-3 rounded-2xl bg-stone-950/60 border border-stone-800 text-[11px] space-y-1.5 text-stone-400">
        <div className="font-semibold text-stone-300 flex items-center justify-between">
          <span>Security Level</span>
          <span className="text-[10px] text-amber-400 font-mono">RBAC OK</span>
        </div>
        <div className="text-[10px] leading-relaxed">
          Authorized as <span className="text-stone-200">{userRole}</span>. Changes sync immediately to runtime configuration.
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs flex-1 z-50 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
