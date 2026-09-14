import React, { useState, useEffect } from 'react';
import { AdminHeader } from './admin/AdminHeader';
import { AdminSidebar, AdminTabId } from './admin/AdminSidebar';
import { AdminLogin } from './admin/AdminLogin';
import { OverviewTab } from './admin/tabs/OverviewTab';
import { UsersTab } from './admin/tabs/UsersTab';
import { PricingTab } from './admin/views/PricingTab';
import { AiControlTab } from './admin/tabs/AiControlTab';
import { KnowledgeBaseTab } from './admin/tabs/KnowledgeBaseTab';
import { ContentManagerTab } from './admin/tabs/ContentManagerTab';
import { SubscriptionsTab } from './admin/tabs/SubscriptionsTab';
import { AiAuditLogsTab } from './admin/tabs/AiAuditLogsTab';
import { PlatformSettingsTab } from './admin/tabs/PlatformSettingsTab';
import { AdsManagementTab } from './admin/tabs/AdsManagementTab';
import { PaymentSettingsTab } from './admin/tabs/PaymentSettingsTab';
import {
  getStoredAdminToken,
  getStoredAdminUser,
  clearStoredAdminSession,
  adminFetch,
} from './admin/adminApi';
import { AdminUserSanitized } from './admin/types';
import { RefreshCw } from 'lucide-react';

interface AdminDashboardViewProps {
  onCloseAdmin: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onCloseAdmin }) => {
  const [adminUser, setAdminUser] = useState<AdminUserSanitized | null>(() => getStoredAdminUser());
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);

  // Unread badge counters
  const [openFeedbackCount, setOpenFeedbackCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.1-flash-lite');

  // Verify authentication on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = getStoredAdminToken();
      if (!token) {
        setIsVerifyingAuth(false);
        return;
      }

      try {
        const data = await adminFetch<{ success: boolean; user: AdminUserSanitized }>(
          '/api/admin/auth/me'
        );
        if (data.user) {
          setAdminUser(data.user);
        }
      } catch (e) {
        clearStoredAdminSession();
        setAdminUser(null);
      } finally {
        setIsVerifyingAuth(false);
      }
    };

    verifySession();

    // Listen for 401 session expiration
    const handleAuthExpired = () => {
      setAdminUser(null);
    };
    window.addEventListener('admin_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('admin_auth_expired', handleAuthExpired);
  }, []);

  // Fetch quick badge telemetry
  useEffect(() => {
    if (!adminUser) return;

    const fetchBadges = async () => {
      try {
        const [feedbackRes, errorRes, aiHealthRes] = await Promise.all([
          adminFetch<any>('/api/admin/feedback'),
          adminFetch<any>('/api/admin/ai/error-logs'),
          adminFetch<any>('/api/admin/ai/health'),
        ]);

        if (feedbackRes?.feedback) {
          const openCount = feedbackRes.feedback.filter(
            (f: any) => f.status === 'open'
          ).length;
          setOpenFeedbackCount(openCount);
        }
        if (errorRes?.errorLogs) {
          setErrorCount(errorRes.errorLogs.length);
        }
        if (aiHealthRes?.activeModel) {
          setGeminiModel(aiHealthRes.activeModel);
        }
      } catch {
        // silent telemetry fallback
      }
    };

    fetchBadges();
  }, [adminUser, activeTab]);

  const handleLoginSuccess = (user: AdminUserSanitized) => {
    setAdminUser(user);
    setIsVerifyingAuth(false);
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearStoredAdminSession();
      setAdminUser(null);
    }
  };

  // Loading state
  if (isVerifyingAuth) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-medium">Verifying Administrator Authorization...</p>
      </div>
    );
  }

  // Not signed in: Render dedicated Login view
  if (!adminUser) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} onExit={onCloseAdmin} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF8F5] flex flex-col overflow-hidden text-stone-900 font-sans">
      {/* Top Admin Header */}
      <AdminHeader
        adminUser={adminUser}
        activeTab={activeTab}
        onLogout={handleLogout}
        onExitAdmin={onCloseAdmin}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        geminiModel={geminiModel}
      />

      {/* Body: Sidebar + Active Tab Stage */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          userRole={adminUser.role}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          openFeedbackCount={openFeedbackCount}
          unresolvedErrorsCount={errorCount}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FAF8F5]">
          <div className="max-w-6xl mx-auto pb-16">
            {activeTab === 'overview' && (
              <OverviewTab onNavigateToTab={(tab) => setActiveTab(tab)} />
            )}

            {activeTab === 'users' && <UsersTab currentUserRole={adminUser.role} />}

            {activeTab === 'pricing' && <PricingTab />}

            {activeTab === 'payments' && <PaymentSettingsTab />}

            {activeTab === 'ai_control' && <AiControlTab />}

            {activeTab === 'knowledge' && <KnowledgeBaseTab />}

            {activeTab === 'content' && <ContentManagerTab />}

            {activeTab === 'subscriptions' && <SubscriptionsTab />}

            {activeTab === 'ads' && <AdsManagementTab />}

            {activeTab === 'ai_audit' && <AiAuditLogsTab />}

            {activeTab === 'settings' && <PlatformSettingsTab />}

            {activeTab === 'export' && <PlatformSettingsTab />}
          </div>
        </main>
      </div>
    </div>
  );
};
