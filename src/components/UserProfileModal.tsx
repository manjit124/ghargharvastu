import React, { useState, useEffect } from 'react';
import {
  User,
  X,
  Crown,
  Check,
  Shield,
  Home,
  Clock,
  Sparkles,
  LogOut,
  LogIn,
  Trash2,
  ExternalLink,
  Zap,
  Play,
  Gift,
} from 'lucide-react';
import { UserProfile, PhotoAnalysisResult, HomeProjectReport, UserCreditAccount } from '../types';
import { creditService } from '../services/creditService';
import { authService } from '../services/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSelectSavedAnalysis: (analysis: PhotoAnalysisResult) => void;
  onOpenMonetization?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
  onSelectSavedAnalysis,
  onOpenMonetization,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'plans' | 'saved'>('profile');
  const [editingHomeName, setEditingHomeName] = useState<string>(userProfile.homeName);
  const [editingCity, setEditingCity] = useState<string>(userProfile.city);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [creditAccount, setCreditAccount] = useState<UserCreditAccount | null>(null);

  useEffect(() => {
    if (isOpen) {
      creditService.fetchCredits().catch(() => {});
      const unsub = creditService.subscribe((acc) => setCreditAccount(acc));
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveHome = () => {
    onUpdateProfile({
      homeName: editingHomeName,
      city: editingCity,
    });
  };

  const handleUpgradeTier = (tier: 'free' | 'pro' | 'expert') => {
    onUpdateProfile({
      tier,
      queriesRemaining: tier === 'pro' ? 9999 : tier === 'expert' ? 99999 : 5,
      photosRemaining: tier === 'pro' ? 9999 : tier === 'expert' ? 99999 : 3,
    });
    alert(`Successfully switched to the ${tier.toUpperCase()} plan!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white font-heading font-extrabold flex items-center justify-center shadow-xs">
              {userProfile?.name?.slice(0, 2).toUpperCase() || 'VV'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-stone-900 text-base">
                  {userProfile?.name || 'User'}
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {userProfile?.tier || 'free'}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {userProfile?.mobile
                  ? userProfile?.email
                    ? `${userProfile.email} • ${userProfile.mobile}`
                    : userProfile.mobile
                  : userProfile?.email || ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-stone-100 text-xs font-bold text-stone-600 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> My Home Profile
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Saved Checks ({userProfile.savedAnalyses?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" /> Upgrade Plans
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-3">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-amber-600" />
                  My Primary Home Setup
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Home / Project Name:
                    </label>
                    <input
                      type="text"
                      value={editingHomeName}
                      onChange={(e) => setEditingHomeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      City / Location:
                    </label>
                    <input
                      type="text"
                      value={editingCity}
                      onChange={(e) => setEditingCity(e.target.value)}
                      placeholder="e.g. Mumbai, Delhi, Bengaluru"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveHome}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Save Home Settings
                </button>
              </div>

              {/* Credit & Usage Quota Card */}
              <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 text-xs space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-stone-100">Live AI Credits & Allowances</span>
                  </div>
                  {onOpenMonetization && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMonetization();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] flex items-center gap-1 transition-all"
                    >
                      <span>Manage Credits</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">Credits</span>
                    <strong className="text-sm font-black text-amber-400">
                      {creditAccount?.plan === 'expert'
                        ? 'Unlimited*'
                        : `${creditAccount?.creditsBalance ?? 0} Cr`}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">Free Chat</span>
                    <strong className="text-sm font-black text-stone-200">
                      {creditAccount?.freeChatMinutesRemaining ?? 5} mins
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">Free Photos</span>
                    <strong className="text-sm font-black text-stone-200">
                      {creditAccount?.freePhotosRemaining ?? 5} left
                    </strong>
                  </div>
                </div>

                {onOpenMonetization && (
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                    <span>Need more credits without paying?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMonetization();
                      }}
                      className="text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-amber-400" /> Watch Videos (+2 Cr)
                    </button>
                  </div>
                )}
              </div>

              {/* Authentication toggle */}
              <div className="pt-2 flex justify-between items-center text-xs">
                {userProfile.isLoggedIn ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await authService.logout();
                      onUpdateProfile({
                        isLoggedIn: false,
                        name: '',
                        email: '',
                      });
                      onClose();
                    }}
                    className="text-stone-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-3">
              {(!userProfile.savedAnalyses || userProfile.savedAnalyses.length === 0) && (
                <div className="text-center py-8 text-xs text-stone-400">
                  No saved checks yet. Upload a photo in the Analysis tab and click "Save" to keep it here.
                </div>
              )}

              {userProfile.savedAnalyses?.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt="Saved check"
                        className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                      />
                    )}
                    <div>
                      <strong className="text-xs text-stone-900 block">{item.roomType} Vastu Check</strong>
                      <span className="text-[11px] text-stone-500 line-clamp-1">
                        {item.recommendation}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectSavedAnalysis(item);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 whitespace-nowrap"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-heading font-bold text-base text-stone-900">
                  Choose Your Vastu Consultation Plan
                </h4>
                <p className="text-xs text-stone-500">
                  Fair, transparent pricing for Indian homeowners and renters
                </p>
              </div>

              {/* Quick Launch Banner to Credit & Coupon Store */}
              {onOpenMonetization && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 fill-stone-950" />
                    <div>
                      <span className="font-black text-xs block">Need more credits or discount coupons?</span>
                      <span className="text-[11px] font-medium opacity-90">
                        Watch rewarded ads for free credits or apply discount codes
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMonetization();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-900 text-amber-400 font-bold text-xs shrink-0 transition-all shadow-xs"
                  >
                    Open Credit Store
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Free Plan */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    (creditAccount?.plan || userProfile.tier) === 'free'
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-500 uppercase">Free Explorer</span>
                    <div className="text-xl font-heading font-extrabold text-stone-900">₹0</div>
                    <ul className="text-[11px] text-stone-600 space-y-1">
                      <li>✓ 5 Mins Free AI Vastu Chat</li>
                      <li>✓ 5 Free Room Photo Audits</li>
                      <li>✓ Unlimited Compass usage</li>
                      <li>✓ Watch Ads for Free Credits</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenMonetization) {
                        onClose();
                        onOpenMonetization();
                      }
                    }}
                    className="mt-3 w-full py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    {(creditAccount?.plan || userProfile.tier) === 'free' ? 'Current Plan' : 'Free Trial'}
                  </button>
                </div>

                {/* Pro Home Plan */}
                <div
                  className={`p-4 rounded-2xl border-2 flex flex-col justify-between relative shadow-sm ${
                    (creditAccount?.plan || userProfile.tier) === 'pro'
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-amber-400 bg-white'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Most Popular
                  </span>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-800 uppercase">Pro Home</span>
                    <div className="text-xl font-heading font-extrabold text-stone-900">
                      ₹99 <span className="text-xs font-normal text-stone-500">/ month</span>
                    </div>
                    <ul className="text-[11px] text-stone-600 space-y-1">
                      <li>✓ 25 AI Consultation Credits</li>
                      <li>✓ Multimodal Room Photo Scans</li>
                      <li>✓ Non-Structural Remedies</li>
                      <li>✓ Priority AI Response Speed</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenMonetization) {
                        onClose();
                        onOpenMonetization();
                      } else {
                        handleUpgradeTier('pro');
                      }
                    }}
                    className="mt-3 w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                  >
                    {(creditAccount?.plan || userProfile.tier) === 'pro' ? 'Active Plan' : 'Select Pro (₹99)'}
                  </button>
                </div>

                {/* Expert Review */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    (creditAccount?.plan || userProfile.tier) === 'expert'
                      ? 'border-stone-900 bg-stone-950 text-stone-100 shadow-md'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <span className={`text-xs font-bold uppercase ${(creditAccount?.plan || userProfile.tier) === 'expert' ? 'text-amber-400' : 'text-stone-700'}`}>
                      Home Expert
                    </span>
                    <div className="text-xl font-heading font-extrabold">
                      ₹299 <span className={`text-xs font-normal ${(creditAccount?.plan || userProfile.tier) === 'expert' ? 'text-stone-400' : 'text-stone-500'}`}>/ month</span>
                    </div>
                    <ul className={`text-[11px] space-y-1 ${(creditAccount?.plan || userProfile.tier) === 'expert' ? 'text-stone-300' : 'text-stone-600'}`}>
                      <li>✓ Unlimited* Consultations</li>
                      <li>✓ Downloadable PDF Full Audit</li>
                      <li>✓ Ad-Free Premium Experience</li>
                      <li>✓ Fair-Use Quota (50 req/day)</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenMonetization) {
                        onClose();
                        onOpenMonetization();
                      } else {
                        handleUpgradeTier('expert');
                      }
                    }}
                    className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                      (creditAccount?.plan || userProfile.tier) === 'expert'
                        ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                        : 'border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white'
                    }`}
                  >
                    {(creditAccount?.plan || userProfile.tier) === 'expert' ? 'Active Plan' : 'Select Expert (₹299)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
