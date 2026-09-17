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
  Smartphone,
  RefreshCw,
  Edit3,
  LogOut,
  Check,
  Loader2,
} from 'lucide-react';
import { authService, AuthSuccessResponse, AuthSessionResponse } from '../../services/authService';
import { setPreferredLanguage, AppLanguage } from '../../services/languageService';
import { analyticsService } from '../../services/analyticsService';
import {
  signInWithGoogleViaFirebase,
  signInWithGoogleViaFirebaseRedirect,
  checkFirebaseRedirectResult,
  parseFirebaseAuthError,
} from '../../lib/firebase';

declare global {
  interface Window {
    google?: any;
  }
}

interface AuthGateProps {
  onAuthenticated: (authData: AuthSuccessResponse) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  contextMessage?: string;
  asModal?: boolean;
}

type AuthChannel = 'mobile' | 'email';
type EmailAuthMode = 'login' | 'register' | 'forgot';
type MobileStep = 'input' | 'verify';

export const AuthGate: React.FC<AuthGateProps> = ({
  onAuthenticated,
  onClose,
  title,
  subtitle,
  contextMessage,
  asModal = false,
}) => {
  // Navigation & Mode States
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>('hi');
  const [authChannel, setAuthChannel] = useState<AuthChannel>('mobile'); // Default to Mobile OTP!
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>('login');
  const [screenStep, setScreenStep] = useState<'form' | 'forgot_confirm' | 'success' | 'existing_session'>('form');

  // Mobile OTP States
  const [mobileStep, setMobileStep] = useState<MobileStep>('input');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileName, setMobileName] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isOtpBlocked, setIsOtpBlocked] = useState(false);
  const [displayMaskedMobile, setDisplayMaskedMobile] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email & Password Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devResetCode, setDevResetCode] = useState<string | null>(null);

  // Existing Session State (if already logged in)
  const [existingSession, setExistingSession] = useState<AuthSessionResponse | null>(null);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<{
    google: { configured: boolean; clientId?: string; authProvider?: string };
    mobile?: { configured: boolean };
  } | null>(null);

  // Google Redirect & Fallback States
  const [isResolvingRedirect, setIsResolvingRedirect] = useState(false);
  const [showRedirectFallbackButton, setShowRedirectFallbackButton] = useState(false);

  // Success Screen Data
  const [successAuthData, setSuccessAuthData] = useState<AuthSuccessResponse | null>(null);

  // Cooldown countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpCooldown]);

  // Fetch server configuration, resolve redirect result, and check existing session on mount
  useEffect(() => {
    let isMounted = true;
    analyticsService.trackLoginStarted('auth_screen');

    // 1. Check if user just returned from Google OAuth Redirect flow
    checkFirebaseRedirectResult()
      .then(async (fbUser) => {
        if (!isMounted || !fbUser) return;
        setIsResolvingRedirect(true);
        setIsLoading(true);
        try {
          const res = await authService.loginWithGoogle({
            credential: fbUser.idToken,
            email: fbUser.email,
            name: fbUser.name,
            picture: fbUser.picture,
            googleId: fbUser.uid,
          });
          setSuccessAuthData(res);
          analyticsService.trackGoogleLogin();
          setScreenStep('success');
          setTimeout(() => onAuthenticated(res), 1200);
        } catch (err: any) {
          console.error('[Google Redirect Login Error]:', err);
          setError(err.message || 'Google redirect login verification failed.');
        } finally {
          setIsResolvingRedirect(false);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[Firebase Auth] Redirect resolution issue:', err);
        const parsed = parseFirebaseAuthError(err, selectedLanguage);
        setError(parsed.message);
      });

    // 2. Check if user already has an active session
    authService.getSession().then((session) => {
      if (!isMounted) return;
      if (session.authenticated && session.user) {
        setExistingSession(session);
        setScreenStep('existing_session');
      }
    }).catch(() => {
      // no existing session, normal flow
    });

    authService.getConfig().then((cfg) => {
      if (!isMounted) return;
      setAuthConfig(cfg);
    }).catch((err) => {
      console.warn('[AuthConfig] Could not load config:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [onAuthenticated, selectedLanguage]);

  const handleLanguageChange = (lang: AppLanguage) => {
    setSelectedLanguage(lang);
    setPreferredLanguage(lang);
  };

  // ==========================================
  // MOBILE OTP FLOW
  // ==========================================
  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, max 10
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(val);
    if (error) setError(null);
  };

  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanNum = mobileNumber.trim();
    if (cleanNum.length !== 10) {
      setError(
        selectedLanguage === 'hi'
          ? 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें।'
          : selectedLanguage === 'hinglish'
          ? 'Kripya 10 digits ka valid Indian mobile number enter karein.'
          : 'Please enter a valid 10-digit Indian mobile number.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.sendMobileOtp(cleanNum, mobileName.trim() || undefined);
      setDisplayMaskedMobile(res.displayMobile || `+91 ${cleanNum}`);
      setOtpCooldown(res.cooldownSeconds || 60);
      setFailedAttempts(0);
      setIsOtpBlocked(false);
      setOtpDigits(['', '', '', '', '', '']);

      setNotice(
        res.message ||
          (selectedLanguage === 'hi'
            ? `OTP आपके मोबाइल नंबर ${res.displayMobile || cleanNum} पर भेजा गया है।`
            : `OTP has been dispatched to ${res.displayMobile || cleanNum}.`)
      );
      setMobileStep('verify');

      // Auto-focus first digit box on next tick
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'OTP भेजने में विफलता हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual OTP digit change
  const handleOtpDigitChange = (index: number, val: string) => {
    if (isOtpBlocked) return;
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance to next box
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation in OTP boxes
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste in OTP box
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    const targetIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[targetIdx]?.focus();
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOtpBlocked) return;
    setError(null);
    setNotice(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError(
        selectedLanguage === 'hi'
          ? 'कृपया पूरा 6-अंकों का OTP कोड दर्ज करें।'
          : selectedLanguage === 'hinglish'
          ? 'Kripya poora 6-digits ka OTP enter karein.'
          : 'Please enter the complete 6-digit OTP code.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyMobileOtp(
        mobileNumber.trim(),
        code,
        mobileName.trim() || undefined,
        selectedLanguage
      );

      setSuccessAuthData(res);
      analyticsService.trackMobileOtpLogin();
      setScreenStep('success');
      setTimeout(() => onAuthenticated(res), 1500);
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 3 || err.attemptsRemaining === 0 || err.message?.includes('अधिकतम 3')) {
        setIsOtpBlocked(true);
        setError(
          selectedLanguage === 'hi'
            ? 'अधिकतम 3 गलत कोशिशें! सुरक्षा कारणों से यह OTP रद्द कर दिया गया है। कृपया नीचे "पुनः OTP भेजें" पर क्लिक करें।'
            : selectedLanguage === 'hinglish'
            ? 'Maximum 3 galat koshishein! Security reasons se yeh OTP cancel ho gaya hai. Naya OTP request karein.'
            : 'Maximum 3 failed attempts reached. For security, this OTP is invalidated. Please request a new OTP.'
        );
      } else {
        const remaining = 3 - newAttempts;
        setError(
          err.message ||
            (selectedLanguage === 'hi'
              ? `गलत OTP कोड दर्ज किया गया। आपके पास 3 में से ${remaining} कोशिश शेष है।`
              : `Incorrect OTP. You have ${remaining} attempt(s) remaining.`)
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendMobileOtp = async () => {
    if (otpCooldown > 0 || isLoading) return;
    setError(null);
    setNotice(null);

    setIsLoading(true);
    try {
      const res = await authService.resendMobileOtp(mobileNumber.trim());
      setOtpCooldown(res.cooldownSeconds || 60);
      setFailedAttempts(0);
      setIsOtpBlocked(false);
      setOtpDigits(['', '', '', '', '', '']);

      setNotice(
        res.message ||
          (selectedLanguage === 'hi'
            ? 'नया OTP सफलतापूर्वक भेजा गया।'
            : selectedLanguage === 'hinglish'
            ? 'Naya OTP successfully bhej diya gaya.'
            : 'New OTP dispatched successfully.')
      );

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'OTP दोबारा भेजने में विफलता हुई।');
    } finally {
      setIsLoading(false);
    }
  };

  // Change mobile number -> go back to step 1
  const handleChangeMobileNumber = () => {
    setMobileStep('input');
    setOtpDigits(['', '', '', '', '', '']);
    setError(null);
    setNotice(null);
    setFailedAttempts(0);
    setIsOtpBlocked(false);
  };

  // ==========================================
  // GOOGLE OAUTH FLOW (FIREBASE POPUP + REDIRECT FALLBACK)
  // ==========================================
  const handleGoogleSignIn = async (forceRedirect: boolean = false) => {
    setError(null);
    setNotice(null);
    setShowRedirectFallbackButton(false);
    setIsLoading(true);

    try {
      const fbResult = await signInWithGoogleViaFirebase({
        mode: forceRedirect ? 'redirect' : 'popup',
        allowRedirectFallback: true,
      });

      // If redirected to Google login
      if ('redirected' in fbResult && fbResult.redirected) {
        setNotice(
          selectedLanguage === 'hi'
            ? 'सुरक्षित Google लॉगिन पेज पर ले जाया जा रहा है...'
            : 'Redirecting to secure Google Sign-In...'
        );
        return;
      }

      // If returned credential from popup
      if ('idToken' in fbResult && fbResult.email) {
        const res = await authService.loginWithGoogle({
          credential: fbResult.idToken,
          email: fbResult.email,
          name: fbResult.name,
          picture: fbResult.picture,
          googleId: fbResult.uid,
        });
        setSuccessAuthData(res);
        analyticsService.trackGoogleLogin();
        setScreenStep('success');
        setTimeout(() => onAuthenticated(res), 1200);
        return;
      }
    } catch (fbErr: any) {
      console.warn('[Google Auth Provider Result]:', fbErr);
      const parsed = parseFirebaseAuthError(fbErr, selectedLanguage);

      // User closed popup or browser blocked opener
      if (fbErr?.code === 'auth/popup-closed-by-user') {
        setError(parsed.message);
        setShowRedirectFallbackButton(true);
        setIsLoading(false);
        return;
      }

      // Popup blocked by browser policy -> automatic redirect
      if (fbErr?.code === 'auth/popup-blocked') {
        try {
          setNotice(
            selectedLanguage === 'hi'
              ? 'ब्राउज़र में पॉपअप ब्लॉक हुआ। सीधे Google लॉगिन पर रीडायरेक्ट किया जा रहा है...'
              : 'Popup was blocked. Redirecting directly to Google login...'
          );
          await signInWithGoogleViaFirebaseRedirect();
          return;
        } catch (redirectErr: any) {
          const redirectParsed = parseFirebaseAuthError(redirectErr, selectedLanguage);
          setError(redirectParsed.message);
          setIsLoading(false);
          return;
        }
      }

      // Domain or provider configuration error
      if (fbErr?.code === 'auth/unauthorized-domain' || fbErr?.code === 'auth/operation-not-allowed') {
        setError(parsed.message);
        setIsLoading(false);
        return;
      }

      // Any other Firebase error
      setError(parsed.message);
      if (parsed.canTryRedirect) {
        setShowRedirectFallbackButton(true);
      }
      setIsLoading(false);
    }
  };

  // ==========================================
  // EMAIL + PASSWORD LOGIN / REGISTER FLOW
  // ==========================================
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
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

    if (emailAuthMode === 'register' && !fullName.trim()) {
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
      if (emailAuthMode === 'register') {
        const res = await authService.register(fullName, cleanEmail, password, selectedLanguage);
        setSuccessAuthData(res);
        analyticsService.trackEmailLogin('register');
        setScreenStep('success');
        setTimeout(() => onAuthenticated(res), 1500);
      } else {
        const res = await authService.login(cleanEmail, password);
        setSuccessAuthData(res);
        analyticsService.trackEmailLogin('login');
        setScreenStep('success');
        setTimeout(() => onAuthenticated(res), 1200);
      }
    } catch (err: any) {
      setError(err.message || 'प्रमाणीकरण विफल रहा। कृपया अपने क्रेडेंशियल जांचें।');
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
        setResetCode(res.devCode);
      }
      setNotice(res.message || 'Verification code sent to your email.');
      setScreenStep('forgot_confirm');
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
      setEmailAuthMode('login');
      setScreenStep('form');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGOUT HANDLER (FOR ACTIVE SESSION)
  // ==========================================
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setExistingSession(null);
      setScreenStep('form');
      setNotice(
        selectedLanguage === 'hi'
          ? 'आप सफलतापूर्वक लॉग आउट हो गए हैं।'
          : selectedLanguage === 'hinglish'
          ? 'Aap successfully logout ho gaye hain.'
          : 'You have been successfully logged out.'
      );
    } catch (err: any) {
      setError('Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // RENDER: EXISTING SESSION SCREEN
  // ==========================================
  if (screenStep === 'existing_session' && existingSession?.user) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 shadow-xs mb-1">
            <User className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-heading font-extrabold text-stone-900">
              {selectedLanguage === 'hi'
                ? 'सक्रिय सत्र पाया गया'
                : selectedLanguage === 'hinglish'
                ? 'Active Session Found'
                : 'Welcome Back!'}
            </h2>
            <p className="text-xs text-stone-600">
              {selectedLanguage === 'hi'
                ? `आप ${existingSession.user.name || existingSession.user.mobile || existingSession.user.email} के रूप में लॉग इन हैं`
                : `Logged in as ${existingSession.user.name || existingSession.user.mobile || existingSession.user.email}`}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1">
            <div className="flex justify-between text-stone-600">
              <span>Account Type:</span>
              <span className="font-semibold text-stone-800 capitalize">{existingSession.account?.tier || 'Free'} Plan</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Available Credits:</span>
              <span className="font-bold text-amber-700">{existingSession.account?.creditsBalance ?? 5} Credits</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onAuthenticated({
                  success: true,
                  user: existingSession.user!,
                  account: existingSession.account!,
                  credits: {
                    balance: existingSession.account?.creditsBalance ?? 5,
                    freeChatMinutesRemaining: 5,
                    freePhotosRemaining: 5,
                  },
                });
              }}
              className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>{selectedLanguage === 'hi' ? 'वास्तु ऐप में आगे बढ़ें' : 'Continue to Vastu App'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-2xl border border-stone-200 bg-white hover:bg-red-50 text-stone-600 hover:text-red-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{selectedLanguage === 'hi' ? 'लॉग आउट करें (Logout)' : 'Sign Out / Switch Account'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SUCCESS SCREEN
  // ==========================================
  if (screenStep === 'success') {
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
  if (screenStep === 'forgot_confirm') {
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
                setScreenStep('form');
                setEmailAuthMode('login');
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
  // RENDER: REDIRECT VERIFICATION LOADER
  // ==========================================
  if (isResolvingRedirect) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-stone-200 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="font-heading font-extrabold text-stone-900 text-lg">
            {selectedLanguage === 'hi' ? 'Google खाता सत्यापित हो रहा है...' : 'Verifying Google Account...'}
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            {selectedLanguage === 'hi'
              ? 'कृपया प्रतीक्षा करें, आपका वास्तु प्रोफ़ाइल सुरक्षित रूप से लोड किया जा रहा है।'
              : 'Please wait, securely signing in and loading your Vastu profile.'}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN AUTH SCREEN
  // ==========================================
  const authCard = (
    <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-500 hover:text-stone-900 flex items-center justify-center border border-stone-200 shadow-2xs transition-colors cursor-pointer text-xs font-bold"
          title="Close"
        >
          ✕
        </button>
      )}
      {/* Language Bar & Header Branding */}
      <div className="bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 text-center border-b border-stone-100 relative">
        {/* Language Selector Pills */}
        <div className="flex items-center justify-center gap-1.5 mb-3.5">
          <button
            type="button"
            onClick={() => handleLanguageChange('hi')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              selectedLanguage === 'en'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white/80 text-stone-600 hover:bg-white border border-stone-200'
            }`}
          >
            🌐 English
          </button>
        </div>

        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/20 mb-2.5">
          <Compass className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900 tracking-tight">
          {title || (
            <>
              Ghar Ghar Vastu <span className="text-amber-600">Go</span>
            </>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-0.5 font-medium">
          {subtitle ||
            (selectedLanguage === 'hi'
              ? 'वैदिक वास्तु एवं सकारात्मक ऊर्जा विश्लेषण'
              : selectedLanguage === 'hinglish'
              ? 'Vedic Vastu & Positive Energy Analysis'
              : 'Vedic Architecture & Spatial Energy Advisor')}
        </p>
      </div>

      {/* Context Message (e.g. Subscription Continue) */}
      {contextMessage && (
        <div className="mx-5 sm:mx-7 mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 leading-snug">{contextMessage}</div>
        </div>
      )}

      {/* Card Body */}
        <div className="p-5 sm:p-7 space-y-4 sm:space-y-5">
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

          {/* Google Sign-In Button */}
          <div className="space-y-2">
            <div className="w-full min-h-[42px] space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleSignIn(false)}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                ) : (
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
                )}
                <span>
                  {isLoading
                    ? selectedLanguage === 'hi'
                      ? 'Google से जुड़ रहे हैं...'
                      : 'Connecting to Google...'
                    : 'Continue with Google'}
                </span>
              </button>

              {/* Optional Redirect Fallback Button (visible if popup was closed, blocked, or requested) */}
              {showRedirectFallbackButton && (
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(true)}
                  disabled={isLoading}
                  className="w-full text-center text-[11px] text-amber-700 hover:text-amber-800 font-bold underline py-1 transition-colors cursor-pointer"
                >
                  {selectedLanguage === 'hi'
                    ? '🔄 सीधे Google Redirect से लॉगिन करें (यदि पॉपअप न खुले)'
                    : '🔄 Sign in using Google Redirect instead (if popup fails)'}
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-0.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <span className="relative px-3 bg-white text-[11px] text-stone-400 font-medium uppercase tracking-wider">
              {selectedLanguage === 'hi' ? 'या' : 'or'}
            </span>
          </div>

          {/* Primary Channel Switcher Tabs: Mobile OTP vs Email */}
          <div className="flex p-1 bg-stone-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthChannel('mobile');
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authChannel === 'mobile'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>{selectedLanguage === 'hi' ? 'मोबाइल OTP' : 'Mobile OTP'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthChannel('email');
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authChannel === 'email'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <span>{selectedLanguage === 'hi' ? 'ईमेल आईडी' : 'Email ID'}</span>
            </button>
          </div>

          {/* ==========================================
              CHANNEL 1: MOBILE OTP FLOW (DEFAULT)
             ========================================== */}
          {authChannel === 'mobile' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* STEP 1: MOBILE NUMBER ENTRY */}
              {mobileStep === 'input' && (
                <form onSubmit={handleSendMobileOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      {selectedLanguage === 'hi'
                        ? 'आपका नाम (वैकल्पिक / नए यूज़र के लिए)'
                        : 'Your Name (Optional / for registration)'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar"
                        value={mobileName}
                        onChange={(e) => setMobileName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-stone-700">
                        {selectedLanguage === 'hi' ? 'मोबाइल नंबर (10 अंक)' : 'Mobile Number (10 Digits)'}
                      </label>
                      <span className={`text-[11px] font-mono ${mobileNumber.length === 10 ? 'text-emerald-600 font-bold' : 'text-stone-400'}`}>
                        {mobileNumber.length}/10 {mobileNumber.length === 10 && '✓'}
                      </span>
                    </div>
                    <div className="flex rounded-xl border border-stone-200 bg-stone-50 focus-within:border-amber-500 focus-within:bg-white overflow-hidden transition-colors shadow-2xs">
                      <div className="px-3 py-2.5 bg-stone-100/90 border-r border-stone-200 text-xs font-bold text-stone-700 flex items-center gap-1.5 select-none shrink-0">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        required
                        autoFocus
                        placeholder="98765 43210"
                        value={mobileNumber}
                        onChange={handleMobileNumberChange}
                        className="w-full px-3.5 py-2.5 text-sm sm:text-base font-medium tracking-wider text-stone-900 bg-transparent focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Free Plan Callout */}
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {selectedLanguage === 'hi'
                        ? 'नया यूज़र रजिस्ट्रेशन और लॉगिन दोनों इसी से होगा। 5 फ्री वास्तु क्रेडिट तुरंत मिलेंगे!'
                        : 'Seamless login & instant registration. 5 Free Vastu Credits included!'}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || mobileNumber.length !== 10}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>
                          {selectedLanguage === 'hi'
                            ? 'OTP भेजें'
                            : selectedLanguage === 'hinglish'
                            ? 'OTP Bhejein'
                            : 'Send OTP'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-stone-400 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>सुरक्षित प्रमाणीकरण • पासवर्ड याद रखने की जरूरत नहीं</span>
                  </p>
                </form>
              )}

              {/* STEP 2: OTP VERIFICATION SCREEN */}
              {mobileStep === 'verify' && (
                <form onSubmit={handleVerifyMobileOtp} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-800">
                      <span>{displayMaskedMobile}</span>
                      <button
                        type="button"
                        onClick={handleChangeMobileNumber}
                        className="inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-700 ml-1.5 text-[11px] font-semibold cursor-pointer underline"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{selectedLanguage === 'hi' ? 'नंबर बदलें' : 'Change'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {selectedLanguage === 'hi'
                        ? 'पर 6-अंकों का सत्यापन कोड भेजा गया है।'
                        : 'A 6-digit verification code was sent to your phone.'}
                    </p>
                  </div>

                  {/* 6 Individual Digit Boxes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-stone-700">
                        {selectedLanguage === 'hi' ? '6-अंकों का OTP दर्ज करें' : 'Enter 6-Digit OTP'}
                      </label>
                      {failedAttempts > 0 && !isOtpBlocked && (
                        <span className="text-[11px] text-amber-600 font-semibold">
                          ⚠️ {3 - failedAttempts} कोशिशें शेष (Attempts left)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          disabled={isOtpBlocked || isLoading}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={idx === 0 ? handleOtpPaste : undefined}
                          className={`w-11 sm:w-12 h-12 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border transition-all ${
                            digit
                              ? 'border-amber-500 bg-amber-50/40 text-stone-900'
                              : 'border-stone-200 bg-stone-50 text-stone-900 focus:bg-white'
                          } ${
                            isOtpBlocked ? 'opacity-50 cursor-not-allowed bg-stone-100' : 'focus:outline-hidden focus:border-amber-500'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action Button: Verify OTP */}
                  <button
                    type="submit"
                    disabled={isLoading || isOtpBlocked || otpDigits.join('').length !== 6}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {selectedLanguage === 'hi'
                            ? 'OTP सत्यापित करें और आगे बढ़ें'
                            : selectedLanguage === 'hinglish'
                            ? 'Verify Karein aur Login'
                            : 'Verify & Continue'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Resend OTP Section with 60-Second Countdown Timer */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={handleChangeMobileNumber}
                      className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{selectedLanguage === 'hi' ? 'नंबर बदलें' : 'Back'}</span>
                    </button>

                    {otpCooldown > 0 ? (
                      <span className="text-stone-400 font-medium text-[11px]">
                        {selectedLanguage === 'hi'
                          ? `पुनः OTP भेजें (${otpCooldown}s)`
                          : `Resend OTP in ${otpCooldown}s`}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendMobileOtp}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold text-xs cursor-pointer hover:underline"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          {selectedLanguage === 'hi'
                            ? 'पुनः OTP भेजें (Resend)'
                            : 'Resend OTP'}
                        </span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ==========================================
              CHANNEL 2: EMAIL & PASSWORD FLOW
             ========================================== */}
          {authChannel === 'email' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Login / Register Toggle Tabs */}
              {emailAuthMode !== 'forgot' && (
                <div className="flex border-b border-stone-200 p-1 bg-stone-50 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailAuthMode('login');
                      setError(null);
                      setNotice(null);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      emailAuthMode === 'login'
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {selectedLanguage === 'hi' ? 'लॉगिन' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailAuthMode('register');
                      setError(null);
                      setNotice(null);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      emailAuthMode === 'register'
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {selectedLanguage === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}
                  </button>
                </div>
              )}

              {emailAuthMode !== 'forgot' ? (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
                  {emailAuthMode === 'register' && (
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

                  {emailAuthMode === 'login' && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode('forgot');
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
                        {emailAuthMode === 'register'
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
                /* Forgot Password Request Form */
                <form onSubmit={handleRequestPasswordReset} className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <h3 className="text-sm font-bold text-stone-800">
                      {selectedLanguage === 'hi' ? 'पासवर्ड रिकवरी' : 'Password Recovery'}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      {selectedLanguage === 'hi'
                        ? 'अपना पंजीकृत ईमेल दर्ज करें। हम आपको एक 6-अंकों का रीसेट कोड भेजेंगे।'
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
                        setEmailAuthMode('login');
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
  );

  if (asModal) {
    return authCard;
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-3.5 sm:p-6">
      {authCard}
    </div>
  );
};
