import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Cpu,
  Sparkles,
  BookOpen,
  Layers,
  Tag,
  Settings,
  MessageSquare,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Menu,
  X,
  AlertTriangle,
  Compass,
  FileText,
  HelpCircle,
  Activity,
  Megaphone,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminLoginView } from './AdminLoginView';
import { DashboardTab } from './views/DashboardTab';
import { UsersTab } from './views/UsersTab';
import { PricingTab } from './views/PricingTab';
import { AICenterTab } from './views/AICenterTab';
import { AIPromptsTab } from './views/AIPromptsTab';
import { KnowledgeBaseTab } from './views/KnowledgeBaseTab';
import { ContentManagerTab } from './views/ContentManagerTab';
import { SubscriptionsCouponsTab } from './views/SubscriptionsCouponsTab';
import { AppSettingsTab } from './views/AppSettingsTab';
import { FeedbackQualityTab } from './views/FeedbackQualityTab';
import { SecurityAuditTab } from './views/SecurityAuditTab';
import { AdsManagementTab } from './tabs/AdsManagementTab';
import { useAppConfig } from '../../context/AppConfigContext';

export interface AdminPanelProps {
  onBackToApp?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        const normalized = tabParam.toLowerCase().trim();
        if (['ads', 'admob', 'ads_management', 'ads-management', 'monetization'].includes(normalized)) {
          return 'ads';
        }
        return normalized;
      }
      const hash = window.location.hash.replace('#', '').toLowerCase().trim();
      if (['ads', 'admob', 'ads_management', 'ads-management', 'monetization'].includes(hash)) {
        return 'ads';
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [confirmLogout, setConfirmLogout] = useState<boolean>(false);
  const { config } = useAppConfig();

  // Check auth on mount
  useEffect(() => {
    const isAuth = adminService.isAuthenticated();
    setIsAuthenticated(isAuth);
    if (isAuth) {
      setAdminUser(adminService.getCurrentAdminUser());
    }

    const handleCustomNav = (e: any) => {
      if (e?.detail?.tab) {
        const t = String(e.detail.tab).toLowerCase().trim();
        if (['ads', 'admob', 'ads_management', 'ads-management', 'monetization'].includes(t)) {
          setActiveTab('ads');
        } else {
          setActiveTab(t);
        }
      }
    };
    window.addEventListener('navigate_admin_tab', handleCustomNav);

    // Inactivity check (30 minutes)
    let lastActivity = Date.now();
    const handleActivity = () => {
      lastActivity = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    const interval = setInterval(() => {
      if (adminService.isAuthenticated() && Date.now() - lastActivity > 30 * 60 * 1000) {
        adminService.logout();
        setIsAuthenticated(false);
        alert('Admin session expired due to 30 minutes of inactivity.');
      }
    }, 60000);

    return () => {
      window.removeEventListener('navigate_admin_tab', handleCustomNav);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = (user: any) => {
    setIsAuthenticated(true);
    setAdminUser(user);
  };

  const handleLogout = () => {
    adminService.logout();
    setIsAuthenticated(false);
    setAdminUser(null);
    setConfirmLogout(false);
  };

  if (!isAuthenticated) {
    return (
      <AdminLoginView
        onLoginSuccess={handleLoginSuccess}
        onBackToApp={onBackToApp}
      />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users & Subscriptions', icon: Users },
    { id: 'pricing', label: 'Plans & Pricing', icon: CreditCard },
    { id: 'aicenter', label: 'AI Center & Models', icon: Cpu },
    { id: 'prompts', label: 'System Prompts & Rules', icon: Sparkles },
    { id: 'knowledge', label: 'Vastu Knowledge Base', icon: BookOpen },
    { id: 'content', label: 'Content, SEO & FAQs', icon: Layers },
    { id: 'orders', label: 'Subscriptions & Coupons', icon: Tag },
    { id: 'ads', label: 'Ads & Monetization', icon: Megaphone },
    { id: 'settings', label: 'App Settings & Features', icon: Settings },
    { id: 'feedback', label: 'Feedback & AI Quality', icon: MessageSquare },
    { id: 'security', label: 'Security & Audit Logs', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-stone-100 flex flex-col font-sans text-stone-900 antialiased selection:bg-amber-200">
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 text-stone-100 px-3 sm:px-6 py-3 flex items-center justify-between shadow-md w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-black tracking-tight text-white truncate">VastuVision AI</span>
                <span className="px-1.5 sm:px-2 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-400 text-[9px] sm:text-[10px] font-black uppercase rounded-full tracking-wider shrink-0">
                  Admin
                </span>
              </div>
              <div className="hidden sm:block text-[10px] text-stone-400 font-medium truncate">Enterprise Management Suite</div>
            </div>
          </div>
        </div>

        {/* Status Indicators & Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {config?.maintenanceMode && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Maintenance</span>
            </div>
          )}

          {/* Admin User Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-stone-800 rounded-xl border border-stone-700 text-xs">
            <div className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-bold flex items-center justify-center text-[10px]">
              {adminUser?.name?.charAt(0) || 'A'}
            </div>
            <span className="font-semibold text-stone-200">{adminUser?.name || 'Admin'}</span>
          </div>

          {/* View Live App Button */}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-2.5 sm:px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-stone-700 shrink-0"
            >
              <span>App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={() => setConfirmLogout(true)}
            className="p-1.5 sm:p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-xl transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden w-full max-w-full min-w-0">
        {/* Left Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:flex flex-col w-64 bg-stone-900 border-r border-stone-800 p-4 space-y-1 shrink-0 overflow-y-auto">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-3 pb-2 pt-1">
            System Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6 mt-auto border-t border-stone-800/60 px-3 text-[10px] text-stone-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Production Live (v2.6)</span>
            </div>
            <div>Secure Session Active</div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex">
            <div className="w-72 bg-stone-900 h-full p-4 flex flex-col space-y-1 shadow-2xl animate-in slide-in-from-left">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Admin Navigation
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pt-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'bg-amber-400 text-stone-950 font-black'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-stone-800">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-rose-950/40 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Body Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 min-w-0 w-full">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {activeTab === 'dashboard' && <DashboardTab onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'pricing' && <PricingTab />}
            {activeTab === 'aicenter' && <AICenterTab onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'prompts' && <AIPromptsTab />}
            {activeTab === 'knowledge' && <KnowledgeBaseTab />}
            {activeTab === 'content' && <ContentManagerTab />}
            {activeTab === 'orders' && <SubscriptionsCouponsTab />}
            {activeTab === 'ads' && <AdsManagementTab />}
            {activeTab === 'settings' && <AppSettingsTab />}
            {activeTab === 'feedback' && <FeedbackQualityTab onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'security' && <SecurityAuditTab />}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-stone-900">Sign out of Admin Panel?</h4>
              <p className="text-xs text-stone-500">
                Your administrative session token will be revoked immediately.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
