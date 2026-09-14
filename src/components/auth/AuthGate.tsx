import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Compass,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { authService, AuthSuccessResponse } from '../../services/authService';
import { setPreferredLanguage, AppLanguage } from '../../services/languageService';

declare global {
  interface Window {
    google?: any;
  }
}

interface AuthGateProps {
  onAuthenticated: (authData: AuthSuccessResponse) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  // Navigation & Mode States
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>('hi');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<'form' | 'forgot_confirm' | 'success'>('form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devResetCode, setDevResetCode] = useState<string | null>(null);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<{
    google: { configured: boolean; clientId: string };
  } | null>(null);

  // Success Screen Data
  const [successAuthData, setSuccessAuthData] = useState<AuthSuccessResponse | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Fetch server configuration on mount
  useEffect(() => {
    authService.getConfig().then((cfg) => {
      setAuthConfig(cfg);
      // Attempt to initialize Google Identity Services button if configured
      if (cfg?.google?.configured && cfg.google.clientId && typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: cfg.google.clientId,
            callback: async (response: any) => {
              if (response.credential) {
                try {
                  setIsLoading(true);
                  const res = await authService.loginWithGoogle({ credential: response.credential });
                  setSuccessAuthData(res);
                  setStep('success');
                  setTimeout(() => onAuthenticated(res), 1500);
                } catch (err: any) {
                  setError(err.message || 'Google authentication failed');
                } finally {
                  setIsLoading(false);
                }
              }
            },
          });
          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'pill',
            });
          }
        } catch (err) {
          console.warn('Google Identity initialization deferred:', err);
        }
      }
    });
  }, []);

  const handleLanguageChange = (lang: AppLanguage) => {
    setSelectedLanguage(lang);
    setPreferredLanguage(lang);
  };

  // ==========================================
  // GOOGLE OAUTH FLOW
  // ==========================================
  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);

    const clientId = authConfig?.google?.clientId;

    if (!clientId) {
      setNotice(
        selectedLanguage === 'hi'
          ? 'गूगल साइन-इन को सक्रिय करने के लिए सर्वर सेटिंग्स में GOOGLE_CLIENT_ID जोड़ें। या नीचे दिए गए ईमेल और पासवर्ड से सीधे लॉगिन / रजिस्टर करें — आपको तुरंत 5 फ्री क्रेडिट मिलेंगे!'
          : selectedLanguage === 'hinglish'
          ? 'Google Sign-In enable karne ke liye GOOGLE_CLIENT_ID configure karein. Ya neeche Email + Password se turant login karein — aapko turant 5 free credits milenge!'
          : 'To enable Google Sign-In, please configure GOOGLE_CLIENT_ID in your environment variables, or sign in below with Email & Password (no setup required) to receive 5 free credits!'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setError(tokenResponse.error_description || 'Google authorization cancelled');
              setIsLoading(false);
              return;
            }
            if (tokenResponse.access_token) {
              try {
                const res = await authService.loginWithGoogle({
                  accessToken: tokenResponse.access_token,
                });
                setSuccessAuthData(res);
                setStep('success');
                setTimeout(() => onAuthenticated(res), 1500);
              } catch (err: any) {
                setError(err.message || 'Google authentication failed');
              } finally {
                setIsLoading(false);
              }
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setIsLoading(false);
          }
        });
      } else {
        const res = await authService.loginWithGoogle();
        setSuccessAuthData(res);
        setStep('success');
        setTimeout(() => onAuthenticated(res), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed. Please try again.');
      setIsLoading(false);
    }
  };

  // ==========================================
  // EMAIL + PASSWORD LOGIN / REGISTER FLOW
  // ==========================================
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(
        selectedLanguage === 'hi'
          ? 'कृपया एक मान्य ईमेल पता दर्ज करें।'
          : selectedLanguage === 'hinglish'
          ? 'Kripya ek valid email address enter karein.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (password.length < 6) {
      setError(
        selectedLanguage === 'hi'
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : selectedLanguage === 'hinglish'
          ? 'Password kam se kam 6 characters ka hona chahiye.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (authMode === 'register' && !fullName.trim()) {
      setError(
        selectedLanguage === 'hi'
          ? 'कृपया अपना पूरा नाम दर्ज करें।'
          : selectedLanguage === 'hinglish'
          ? 'Kripya apna poora naam enter karein.'
          : 'Please enter your full name.'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'register') {
        const res = await authService.register(fullName, cleanEmail, password, selectedLanguage);
        setSuccessAuthData(res);
        setStep('success');
        setTimeout(() => onAuthenticated(res), 1500);
      } else {
        const res = await authService.login(cleanEmail, password);
        setSuccessAuthData(res);
        setStep('success');
        setTimeout(() => onAuthenticated(res), 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // FORGOT PASSWORD FLOW
  // ==========================================
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address to receive reset instructions.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.requestPasswordReset(cleanEmail);
      if (res.devCode) {
        setDevResetCode(res.devCode);
        setResetCode(res.devCode); // Auto-fill for seamless testing
      }
      setNotice(res.message || 'Verification code sent to your email.');
      setStep('forgot_confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!resetCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.confirmPasswordReset(email.trim().toLowerCase(), resetCode.trim(), newPassword);
      setNotice(res.message || 'Password reset successfully! You can now log in.');
      setPassword(newPassword);
      setAuthMode('login');
      setStep('form');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // RENDER: SUCCESS SCREEN
  // ==========================================
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-9 h-9 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-extrabold text-stone-900">
              {selectedLanguage === 'hi'
                ? successAuthData?.isNew
                  ? 'खाता सफलतापूर्वक बन गया!'
                  : 'सफलतापूर्वक लॉग इन हुआ!'
                : selectedLanguage === 'hinglish'
                ? successAuthData?.isNew
                  ? 'Account Successfully Ban Gaya!'
                  : 'Welcome Back! Logged In'
                : successAuthData?.isNew
                ? 'Account Created Successfully!'
                : 'Welcome Back! Logged In'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              {selectedLanguage === 'hi'
                ? '5 निःशुल्क एआई वास्तु परामर्श और 5 फोटो विश्लेषण सक्रिय हो गए हैं।'
                : selectedLanguage === 'hinglish'
                ? '5 Free AI Consultations aur 5 Photo Analyses activate ho gaye hain.'
                : '5 Free AI Consultations & 5 Photo Analyses are now ready to use.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-left text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>
                {selectedLanguage === 'hi'
                  ? 'मुफ्त वास्तु लाभ सक्रिय हैं:'
                  : selectedLanguage === 'hinglish'
                  ? 'Free Vastu Benefits Activated:'
                  : 'Free Plan Features Included:'}
              </span>
            </div>
            <ul className="text-stone-600 space-y-1 pl-6 list-disc text-[11px]">
              <li>5 Free AI Vastu Chat Consultations</li>
              <li>5 Free Room Photo Scans & Instant Remedies</li>
              <li>Complete 16-Zone Compass & Spatial Energy Map</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => successAuthData && onAuthenticated(successAuthData)}
            className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>
              {selectedLanguage === 'hi'
                ? 'वास्तु परामर्श शुरू करें'
                : selectedLanguage === 'hinglish'
                ? 'Vastu Shuru Karein'
                : 'Start Exploring'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: FORGOT PASSWORD CONFIRM SCREEN
  // ==========================================
  if (step === 'forgot_confirm') {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-stone-900">
              {selectedLanguage === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Your Password'}
            </h2>
            <p className="text-xs text-stone-500">
              Enter the 6-digit code sent to <strong className="text-stone-700">{email}</strong> and set a new password.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {notice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium">{notice}</div>
            </div>
          )}

          {devResetCode && (
            <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
              <span>Verification Code: <strong className="font-mono text-amber-700">{devResetCode}</strong></span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Dev Auto-fill</span>
            </div>
          )}

          <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">6-Digit Reset Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Update Password & Sign In</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setAuthMode('login');
                setError(null);
                setNotice(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN AUTH SCREEN (GOOGLE + EMAIL/PASSWORD)
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
        {/* Language Bar & Branding Header */}
        <div className="bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-7 text-center border-b border-stone-100 relative">
          {/* Language Selector Pills */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => handleLanguageChange('hi')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedLanguage === 'hi'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/80 text-stone-600 hover:bg-white border border-stone-200'
              }`}
            >
              🇮🇳 हिन्दी
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('hinglish')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedLanguage === 'hinglish'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/80 text-stone-600 hover:bg-white border border-stone-200'
              }`}
            >
              🗣️ Hinglish
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedLanguage === 'en'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/80 text-stone-600 hover:bg-white border border-stone-200'
              }`}
            >
              🌐 English
            </button>
          </div>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/20 mb-3">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900 tracking-tight">
            VastuVision <span className="text-amber-600">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
            Vedic Architecture & Spatial Energy Advisor
          </p>
          <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
            {selectedLanguage === 'hi'
              ? 'वास्तु एवं सकारात्मक ऊर्जा सलाहकार'
              : selectedLanguage === 'hinglish'
              ? 'Vastu aur positive energy advisor'
              : 'Vedic harmony for modern living'}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Notice Banner */}
          {notice && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1 font-medium">{notice}</div>
            </div>
          )}

          {/* Real Google Sign-In Button */}
          <div className="space-y-2">
            <div ref={googleBtnRef} className="w-full min-h-[42px]">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-1 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <span className="relative px-3 bg-white text-[11px] text-stone-400 font-medium uppercase tracking-wider">
              {selectedLanguage === 'hi' ? 'या ईमेल से' : selectedLanguage === 'hinglish' ? 'ya email se' : 'or with email'}
            </span>
          </div>

          {/* Mode Switch Tabs (Login / Register) */}
          {authMode !== 'forgot' && (
            <div className="flex border-b border-stone-200 p-1 bg-stone-50 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'login'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {selectedLanguage === 'hi' ? 'लॉगिन' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'register'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {selectedLanguage === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}
              </button>
            </div>
          )}

          {/* ==========================================
              SUB-VIEW 1 & 2: LOGIN OR REGISTER FORM
             ========================================== */}
          {authMode !== 'forgot' ? (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {selectedLanguage === 'hi' ? 'पूरा नाम' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {selectedLanguage === 'hi' ? 'ईमेल आईडी' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {selectedLanguage === 'hi' ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Free Plan Welcome Callout */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>FREE Welcome Pack:</strong> 5 AI Consultations & 5 Photo Scans included with every new account.
                </span>
              </div>

              {authMode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                  >
                    {selectedLanguage === 'hi'
                      ? 'पासवर्ड भूल गए?'
                      : selectedLanguage === 'hinglish'
                      ? 'Password bhool gaye?'
                      : 'Forgot password?'}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>
                    {authMode === 'register'
                      ? selectedLanguage === 'hi'
                        ? 'निःशुल्क खाता बनाएं'
                        : 'Create Free Account'
                      : selectedLanguage === 'hi'
                      ? 'साइन इन करें'
                      : 'Sign In to VastuVision'}
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* ==========================================
               SUB-VIEW 3: FORGOT PASSWORD REQUEST FORM
               ========================================== */
            <form onSubmit={handleRequestPasswordReset} className="space-y-4">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-stone-800">
                  {selectedLanguage === 'hi' ? 'पासवर्ड रिकवरी' : 'Password Recovery'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  {selectedLanguage === 'hi'
                    ? 'अपना पंजीकृत ईमेल दर्ज करें। हम आपको एक 6-अंकों का रीसेट कोड प्रदान करेंगे।'
                    : 'Enter your registered email address to receive a 6-digit password reset code.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {selectedLanguage === 'hi' ? 'ईमेल आईडी' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Send Reset Code</span>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                    setNotice(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Trust Badges Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-around text-center text-[10px] text-stone-500 font-medium">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>100% Vedic Principles</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Instant AI Analysis</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Private & Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
};
