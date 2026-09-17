import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeDashboardView } from './components/HomeDashboardView';
import { PhotoAnalysisView } from './components/PhotoAnalysisView';
import { ScanRoomWorkflow } from './components/ScanRoomWorkflow';
import { AiChatView } from './components/AiChatView';
import { ExploreSearchView } from './components/ExploreSearchView';
import { CompleteHomeScanView } from './components/CompleteHomeScanView';
import { ColourAdvisorView } from './components/ColourAdvisorView';
import { ObjectPlacementView } from './components/ObjectPlacementView';
import { UserProfileModal } from './components/UserProfileModal';
import { MonetizationModal } from './components/MonetizationModal';
import { StandaloneCheckoutPage } from './components/StandaloneCheckoutPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { CompassModal } from './components/CompassModal';
import { LegalModals } from './components/LegalModals';
import { UserProfile, PhotoAnalysisResult, HomeProjectReport } from './types';
import { ShieldCheck, AlertTriangle, Compass, Mail, Lock, Megaphone } from 'lucide-react';
import { useAppConfig } from './context/AppConfigContext';
import { adminService } from './services/adminService';
import { AuthGate } from './components/auth/AuthGate';
import { authService } from './services/authService';
import { setPreferredLanguage } from './services/languageService';
import { SEO_TOPIC_PAGES } from './data/seoPagesData';
import { SeoTopicPageView } from './components/SeoTopicPageView';
import { BlogHubView } from './components/BlogHubView';
import { analyticsService } from './services/analyticsService';

const INITIAL_PROFILE: UserProfile = {
  id: '',
  name: '',
  email: '',
  isLoggedIn: false,
  tier: 'free',
  homeName: 'My Sweet Home',
  city: '',
  propertyType: 'Apartment',
  savedAnalyses: [],
  savedReports: [],
  queriesRemaining: 3,
  photosRemaining: 3,
  preferredLanguage: 'hi',
};

export default function App() {
  const { config } = useAppConfig();
  const [activeView, setActiveView] = useState<string>('home');
  const [currentTopicSlug, setCurrentTopicSlug] = useState<string | null>(null);
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authContextMessage, setAuthContextMessage] = useState<string | null>(null);
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  const [isAdminActive, setIsAdminActive] = useState<boolean>(() => {
    const isTargetingAdmin =
      window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
    if (isTargetingAdmin) {
      // Keep admin active only if already securely authenticated
      if (adminService.isAuthenticated()) {
        return true;
      }
      // If unauthenticated user manually navigates to /admin, redirect neutrally to home
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', '/');
      }
      return false;
    }
    return false;
  });
  const [isCheckoutActive, setIsCheckoutActive] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/checkout') ||
        window.location.hash.startsWith('#checkout') ||
        window.location.search.includes('view=checkout'))
    );
  });
  const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isMonetizationOpen, setIsMonetizationOpen] = useState<boolean>(false);
  const [legalModalType, setLegalModalType] = useState<
    'disclaimer' | 'privacy' | 'terms' | 'contact' | null
  >(null);
  const [dismissedNotifId, setDismissedNotifId] = useState<string | null>(null);

  // Cross-view state pass-through
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>('');
  const [chatInitialImage, setChatInitialImage] = useState<string | undefined>(undefined);
  const [photoAnalysisRoomHint, setPhotoAnalysisRoomHint] = useState<string>('Auto Detect');

  // Sync /admin URL with isAdminActive state
  useEffect(() => {
    if (isAdminActive) {
      if (!window.location.pathname.startsWith('/admin') && window.location.hash !== '#admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [isAdminActive]);

  // Handle popstate for deep links, SEO URLs, and browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();

      const isTargetingCheckout =
        pathname.startsWith('/checkout') ||
        window.location.hash.startsWith('#checkout') ||
        window.location.search.includes('view=checkout');
      setIsCheckoutActive(isTargetingCheckout);

      const isTargetingAdmin =
        pathname.startsWith('/admin') || window.location.hash === '#admin';
      if (isTargetingAdmin) {
        if (adminService.isAuthenticated()) {
          setIsAdminActive(true);
        } else {
          window.history.replaceState(null, '', '/');
          setIsAdminActive(false);
        }
        return;
      } else {
        setIsAdminActive(false);
      }

      // Check for SEO topic pages
      const cleanSlug = pathname.replace(/^\//, '').split('?')[0].split('#')[0];
      if (cleanSlug && SEO_TOPIC_PAGES[cleanSlug]) {
        setCurrentTopicSlug(cleanSlug);
        setActiveView('topic-page');
        return;
      }

      // Check for Blog pages
      if (pathname === '/blog' || pathname.startsWith('/blog/')) {
        const blogSlug = pathname.replace('/blog/', '').replace('/blog', '').trim();
        setCurrentBlogSlug(blogSlug || null);
        setActiveView('blog');
        return;
      }

      // Public Modals & Pages via URL
      if (pathname === '/pricing') {
        setIsMonetizationOpen(true);
        return;
      }
      if (pathname === '/privacy-policy') {
        setLegalModalType('privacy');
        return;
      }
      if (pathname === '/terms') {
        setLegalModalType('terms');
        return;
      }
      if (pathname === '/disclaimer') {
        setLegalModalType('disclaimer');
        return;
      }
      if (pathname === '/refund-policy') {
        setLegalModalType('terms');
        return;
      }
      if (pathname === '/contact') {
        setLegalModalType('contact');
        return;
      }
      if (pathname === '/about') {
        setLegalModalType('disclaimer');
        return;
      }
      if (pathname === '/faq') {
        setCurrentTopicSlug('vastu-shastra');
        setActiveView('topic-page');
        return;
      }

      // Backward compatible route aliases
      if (pathname === '/ai-vastu-advisor') {
        setActiveView('home');
        return;
      }
      if (pathname === '/image-analysis') {
        setActiveView('photo-analysis');
        return;
      }
      if (pathname === '/vastu-guides') {
        setActiveView('blog');
        return;
      }
      if (pathname === '/direction-guide') {
        setCurrentTopicSlug('vastu-direction');
        setActiveView('topic-page');
        return;
      }

      if (pathname === '/' || pathname === '') {
        setActiveView('home');
        setCurrentTopicSlug(null);
        setCurrentBlogSlug(null);
      }
    };

    // Run on mount to catch direct entry / refreshed URLs
    handlePopState();

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // GA4 SPA Page View Tracking
  useEffect(() => {
    if (isCheckoutActive) {
      analyticsService.trackPageView('/checkout', 'Checkout - Ghar Ghar Vastu');
      return;
    }
    if (isAdminActive) {
      analyticsService.trackPageView('/admin', 'Admin Panel - Ghar Ghar Vastu');
      return;
    }
    if (activeView === 'topic-page' && currentTopicSlug) {
      analyticsService.trackPageView(
        `/${currentTopicSlug}`,
        `${currentTopicSlug.replace(/-/g, ' ')} - Ghar Ghar Vastu`
      );
      return;
    }
    if (activeView === 'blog') {
      const blogPath = currentBlogSlug ? `/blog/${currentBlogSlug}` : '/blog';
      analyticsService.trackPageView(
        blogPath,
        `${currentBlogSlug ? currentBlogSlug.replace(/-/g, ' ') : 'Blog'} - Ghar Ghar Vastu`
      );
      return;
    }

    const viewTitles: Record<string, string> = {
      home: 'Ghar Ghar Vastu - AI Vastu Shastra Consultant',
      chat: 'AI Vastu Advisor - Ghar Ghar Vastu',
      'photo-analysis': 'Vastu Photo Analysis - Ghar Ghar Vastu',
      scan: 'Room Compass Scan - Ghar Ghar Vastu',
      explore: 'Explore Vastu Library - Ghar Ghar Vastu',
      'all-rooms': 'Complete Home Scan - Ghar Ghar Vastu',
      'colour-advisor': 'Vastu Colour Advisor - Ghar Ghar Vastu',
      'object-placement': 'Vastu Object Placement - Ghar Ghar Vastu',
    };
    const path = activeView === 'home' ? '/' : `/${activeView}`;
    const title = viewTitles[activeView] || 'Ghar Ghar Vastu';
    analyticsService.trackPageView(path, title);
  }, [activeView, currentTopicSlug, currentBlogSlug, isCheckoutActive, isAdminActive]);

  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Synchronize session and user profile on mount
  useEffect(() => {
    let isMounted = true;
    authService
      .getSession()
      .then((session) => {
        if (!isMounted) return;
        if (session.authenticated && session.user) {
          setUserProfile((prev) => ({
            ...prev,
            id: session.user!.id,
            name: session.user!.name,
            email: session.user!.email,
            mobile: session.user!.mobile,
            avatar: session.user!.avatar,
            authProvider: session.user!.authProvider,
            isMobileVerified: session.user!.isMobileVerified,
            isEmailVerified: session.user!.isEmailVerified,
            isLoggedIn: true,
            tier: session.user!.plan || 'free',
            preferredLanguage: session.user!.preferredLanguage || 'hi',
            homeName: session.user!.homeName || prev.homeName,
            city: session.user!.city || prev.city,
            propertyType: session.user!.propertyType || prev.propertyType,
          }));
          if (session.user!.preferredLanguage) {
            setPreferredLanguage(session.user!.preferredLanguage);
          }
        } else {
          setUserProfile((prev) => ({
            ...prev,
            isLoggedIn: false,
          }));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setUserProfile((prev) => ({ ...prev, isLoggedIn: false }));
      })
      .finally(() => {
        if (isMounted) setIsCheckingAuth(false);
      });

    const unsubscribe = authService.subscribe((session) => {
      if (session.authenticated && session.user) {
        setUserProfile((prev) => ({
          ...prev,
          id: session.user!.id,
          name: session.user!.name,
          email: session.user!.email,
          mobile: session.user!.mobile,
          avatar: session.user!.avatar,
          authProvider: session.user!.authProvider,
          isMobileVerified: session.user!.isMobileVerified,
          isEmailVerified: session.user!.isEmailVerified,
          isLoggedIn: true,
          tier: session.user!.plan || 'free',
          preferredLanguage: session.user!.preferredLanguage || 'hi',
          homeName: session.user!.homeName || prev.homeName,
          city: session.user!.city || prev.city,
          propertyType: session.user!.propertyType || prev.propertyType,
        }));
      } else {
        setUserProfile((prev) => ({
          ...prev,
          isLoggedIn: false,
        }));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // User Profile with Local Storage Persistence
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('vv_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...INITIAL_PROFILE, ...parsed };
        }
      }
    } catch (e) {
      // fallback
    }
    return INITIAL_PROFILE;
  });

  useEffect(() => {
    try {
      localStorage.setItem('vv_user_profile', JSON.stringify(userProfile));
    } catch (e) {
      // ignore
    }
  }, [userProfile]);

  // Sync GA4 User ID (internal non-PII ID only)
  useEffect(() => {
    if (userProfile.isLoggedIn && userProfile.id) {
      analyticsService.setUserId(userProfile.id);
    }
  }, [userProfile.isLoggedIn, userProfile.id]);

  // Track legal modal views
  useEffect(() => {
    if (legalModalType) {
      analyticsService.trackPageView(`/${legalModalType}`, `${legalModalType.toUpperCase()} - Ghar Ghar Vastu`);
    }
  }, [legalModalType]);

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  const handleSaveAnalysis = (analysis: PhotoAnalysisResult) => {
    setUserProfile((prev) => ({
      ...prev,
      savedAnalyses: [analysis, ...(prev.savedAnalyses || []).filter((a) => a.id !== analysis.id)],
    }));
  };

  const handleSaveHomeReport = (report: HomeProjectReport) => {
    setUserProfile((prev) => ({
      ...prev,
      savedReports: [report, ...(prev.savedReports || [])],
    }));
  };

  const handleAskQuestion = (query: string, img?: string) => {
    setChatInitialPrompt(query);
    setChatInitialImage(img);
    setActiveView('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadPhotoForCategory = (categoryName: string) => {
    setPhotoAnalysisRoomHint(categoryName);
    setActiveView('photo-analysis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: string) => {
    if (view === 'guides') {
      setActiveView('blog');
      setCurrentBlogSlug(null);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '/blog');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'home') {
      setActiveView('home');
      setCurrentTopicSlug(null);
      setCurrentBlogSlug(null);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProfile = () => {
    if (!userProfile.isLoggedIn) {
      setAuthContextMessage(null);
      setIsAuthModalOpen(true);
    } else {
      setIsProfileOpen(true);
    }
  };

  // If Standalone Checkout is active (e.g. /checkout or fallback from iframe sandbox)
  if (isCheckoutActive) {
    return (
      <StandaloneCheckoutPage
        onBackToApp={() => {
          setIsCheckoutActive(false);
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

  // If Admin mode is requested, render the dedicated AdminPanel standalone
  if (isAdminActive) {
    return <AdminPanel onBackToApp={() => setIsAdminActive(false)} />;
  }

  // If Maintenance Mode is enabled by Admin and user is not in Admin Panel:
  if (config?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-stone-900 font-sans">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/30">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-stone-900">
              {config.appName || 'Ghar Ghar Vastu'}
            </h1>
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full">
              Scheduled Maintenance
            </div>
            <p className="text-stone-600 text-sm leading-relaxed pt-2">
              {config.maintenanceMessage ||
                'Ghar Ghar Vastu is undergoing scheduled improvements. We will be back shortly.'}
            </p>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-center text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-stone-400" />
              <span>{config.supportEmail || 'support@ghargharvastu.com'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Checking session on initial load
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Compass className="w-6 h-6 animate-spin" />
          </div>
          <div className="text-sm font-bold text-stone-800">Ghar Ghar Vastu</div>
          <div className="text-xs text-stone-400">Loading your sacred space...</div>
        </div>
      </div>
    );
  }

  const activeAnnouncement = (config?.notifications || []).find(
    (n) => n.id !== dismissedNotifId
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-amber-200 selection:text-amber-950 font-sans">
      {/* Top Banner: Disclaimer and Peace-of-Mind Notice */}
      <div className="bg-amber-700 text-amber-50 px-3 sm:px-4 py-1.5 text-center text-[10px] sm:text-[11px] font-medium tracking-wide flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-full max-w-full leading-tight">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="inline">
          Ghar Ghar Vastu • Traditional Vastu Home Advisor • Practical non-structural suggestions • No fear-mongering
        </span>
        <button
          onClick={() => setLegalModalType('disclaimer')}
          className="underline font-bold hover:text-white ml-1 shrink-0"
        >
          Disclaimer
        </button>
      </div>

      {/* Broadcast Announcement Banner if active */}
      {activeAnnouncement && (
        <div className="bg-stone-900 text-stone-100 px-3 sm:px-4 py-2 text-xs flex items-center justify-between gap-2 sm:gap-3 border-b border-stone-800 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 min-w-0 justify-center text-center">
            <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-400 shrink-0">{activeAnnouncement.title}:</span>
            <span className="text-stone-300 truncate">{activeAnnouncement.message}</span>
          </div>
          {activeAnnouncement.dismissible && (
            <button
              onClick={() => setDismissedNotifId(activeAnnouncement.id)}
              className="text-stone-400 hover:text-white text-xs font-bold px-2 py-0.5 shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Main App Navigation Bar */}
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenCompass={() => setIsCompassOpen(true)}
        onOpenProfile={handleOpenProfile}
        onOpenMonetization={() => setIsMonetizationOpen(true)}
        userProfile={userProfile}
        onTriggerAdminLogin={() => setIsAdminActive(true)}
      />

      {/* Main Body Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-12 min-w-0">
        {activeView === 'home' && (
          <HomeDashboardView
            onNavigate={handleNavigate}
            onOpenCompass={() => setIsCompassOpen(true)}
            onAskQuestion={(q) => handleAskQuestion(q)}
            onUploadPhotoForCategory={handleUploadPhotoForCategory}
          />
        )}

        {/* Dynamic SEO Topic Pages */}
        {activeView === 'topic-page' && currentTopicSlug && (
          <SeoTopicPageView
            slug={currentTopicSlug}
            topic={SEO_TOPIC_PAGES[currentTopicSlug]}
            onNavigate={handleNavigate}
            onAskQuestion={handleAskQuestion}
            onStartAnalysis={handleUploadPhotoForCategory}
            onUploadPhotoForCategory={handleUploadPhotoForCategory}
          />
        )}

        {/* Blog & Knowledge Articles */}
        {activeView === 'blog' && (
          <BlogHubView
            initialArticleSlug={currentBlogSlug || undefined}
            onAskAi={(q) => handleAskQuestion(q)}
            onOpenPhotoAnalysis={() => handleNavigate('photo-analysis')}
          />
        )}

        {activeView === 'photo-analysis' && (
          <PhotoAnalysisView
            initialRoomHint={photoAnalysisRoomHint}
            onOpenChatWithQuery={(q, img) => handleAskQuestion(q, img)}
            onSaveResult={handleSaveAnalysis}
            onOpenMonetization={() => setIsMonetizationOpen(true)}
          />
        )}

        {activeView === 'scan-room' && (
          <ScanRoomWorkflow
            onGoToChat={(q) => handleAskQuestion(q)}
            onCompleteAnalysis={handleSaveAnalysis}
          />
        )}

        {activeView === 'chat' && (
          <AiChatView
            initialPrompt={chatInitialPrompt}
            initialImage={chatInitialImage}
            onOpenPhotoAnalysis={() => {
              setActiveView('photo-analysis');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenMonetization={() => setIsMonetizationOpen(true)}
          />
        )}

        {activeView === 'explore' && (
          <ExploreSearchView
            onSelectQuestion={(q) => handleAskQuestion(q)}
            onSelectCategoryForPhoto={handleUploadPhotoForCategory}
          />
        )}

        {activeView === 'complete-home' && (
          <CompleteHomeScanView onSaveReport={handleSaveHomeReport} />
        )}

        {activeView === 'colour-advisor' && (
          <ColourAdvisorView onAskAi={(q) => handleAskQuestion(q)} />
        )}

        {activeView === 'object-advisor' && (
          <ObjectPlacementView
            onAskAi={(q) => handleAskQuestion(q)}
            onUploadPhotoForObject={(obj) => handleUploadPhotoForCategory(obj)}
          />
        )}
      </main>

      {/* Footer with Crawlable Links */}
      <footer className="bg-white border-t border-stone-200/80 py-10 px-4 sm:px-6 text-stone-600 text-xs">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Main Footer Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-white font-heading font-extrabold flex items-center justify-center text-base shadow-xs">
                G
              </div>
              <div>
                <div className="font-heading font-extrabold text-stone-900 text-base">
                  Ghar Ghar Vastu
                </div>
                <p className="text-[11px] text-stone-500">
                  AI Vastu Advisor for Your Home • Harmony, Natural Light & Practical Living
                </p>
              </div>
            </div>

            {/* Topic Guides Internal Links */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-stone-600">
              <a
                href="/vastu-shastra"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/vastu-shastra');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="hover:text-amber-800 transition-colors"
              >
                Vastu Shastra
              </a>
              <a
                href="/bedroom-vastu"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/bedroom-vastu');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="hover:text-amber-800 transition-colors"
              >
                Bedroom Vastu
              </a>
              <a
                href="/kitchen-vastu"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/kitchen-vastu');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="hover:text-amber-800 transition-colors"
              >
                Kitchen Vastu
              </a>
              <a
                href="/main-door-vastu"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/main-door-vastu');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="hover:text-amber-800 transition-colors"
              >
                Main Door Vastu
              </a>
              <a
                href="/bathroom-vastu"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/bathroom-vastu');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="hover:text-amber-800 transition-colors"
              >
                Bathroom Vastu
              </a>
              <a
                href="/blog"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/blog');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="hover:text-amber-800 transition-colors"
              >
                Vastu Blog & Hub
              </a>
            </div>
          </div>

          {/* Legal / Trust links & Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-stone-500 font-medium">
              <button
                onClick={() => setLegalModalType('disclaimer')}
                className="hover:text-amber-800 transition-colors"
              >
                Vastu Disclaimer
              </button>
              <button
                onClick={() => setLegalModalType('privacy')}
                className="hover:text-amber-800 transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setLegalModalType('terms')}
                className="hover:text-amber-800 transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => setLegalModalType('contact')}
                className="hover:text-amber-800 transition-colors"
              >
                Contact Support
              </button>
            </div>

            <div className="text-[11px] text-stone-400 text-center sm:text-right">
              © {new Date().getFullYear()} Ghar Ghar Vastu (ghargharvastu.com). All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (5 tabs) */}
      <BottomNav
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenProfile={handleOpenProfile}
      />

      {/* Global Compass Modal */}
      <CompassModal
        isOpen={isCompassOpen}
        onClose={() => setIsCompassOpen(false)}
        purposeLabel="current space"
        onSelectDirection={() => {}}
      />

      {/* User Profile & My Home Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onSelectSavedAnalysis={(analysis) => {
          setPhotoAnalysisRoomHint(analysis.roomType);
          setActiveView('photo-analysis');
        }}
        onOpenMonetization={() => setIsMonetizationOpen(true)}
      />

      {/* Credit & Subscription Monetization Modal */}
      <MonetizationModal
        isOpen={isMonetizationOpen}
        onClose={() => setIsMonetizationOpen(false)}
        userProfile={userProfile}
        onRequestAuth={(onSuccessAction) => {
          setPendingAuthAction(() => onSuccessAction);
          setAuthContextMessage('Subscription continue karne ke liye account me login karein');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Legal & Trust Modals */}
      <LegalModals type={legalModalType} onClose={() => setLegalModalType(null)} />

      {/* Auth Modal Overlay for Unauthenticated Users */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md my-auto">
            <AuthGate
              asModal={true}
              contextMessage={authContextMessage || undefined}
              onClose={() => {
                setIsAuthModalOpen(false);
                setPendingAuthAction(null);
                setAuthContextMessage(null);
              }}
              onAuthenticated={(authData) => {
                setUserProfile((prev) => ({
                  ...prev,
                  id: authData.user.id,
                  name: authData.user.name,
                  email: authData.user.email,
                  mobile: authData.user.mobile,
                  avatar: authData.user.avatar,
                  authProvider: authData.user.authProvider,
                  isMobileVerified: authData.user.isMobileVerified,
                  isEmailVerified: authData.user.isEmailVerified,
                  isLoggedIn: true,
                  tier: authData.user.plan || 'free',
                  preferredLanguage: authData.user.preferredLanguage || 'hi',
                  homeName: authData.user.homeName || prev.homeName,
                  city: authData.user.city || prev.city,
                  propertyType: authData.user.propertyType || prev.propertyType,
                }));
                if (authData.user.preferredLanguage) {
                  setPreferredLanguage(authData.user.preferredLanguage);
                }
                setIsAuthModalOpen(false);
                setAuthContextMessage(null);
                if (pendingAuthAction) {
                  const action = pendingAuthAction;
                  setPendingAuthAction(null);
                  setTimeout(() => {
                    action();
                  }, 150);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

