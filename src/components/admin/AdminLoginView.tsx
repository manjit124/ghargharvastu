import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { adminService, AdminUserClient } from '../../services/adminService';

interface AdminLoginViewProps {
  onSuccess?: (admin: AdminUserClient) => void;
  onLoginSuccess?: (admin: AdminUserClient) => void;
  onCancel?: () => void;
  onBackToApp?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccess,
  onLoginSuccess,
  onCancel,
  onBackToApp,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalize common typos (e.g. gamil.com -> gmail.com)
  const normalizeEmail = (raw: string) => {
    return raw
      .trim()
      .replace(/@(gamil|gmial|gmai|gmaill)\.com$/i, '@gmail.com');
  };

  const handleSuccessCallback = (user: AdminUserClient) => {
    if (onSuccess) onSuccess(user);
    if (onLoginSuccess) onLoginSuccess(user);
  };

  const handleCancelCallback = () => {
    if (onCancel) onCancel();
    if (onBackToApp) onBackToApp();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) {
      setError('Invalid admin credentials.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminService.login(cleanEmail, password, rememberMe);
      handleSuccessCallback(res.user);
    } catch (err: any) {
      setError(err?.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string) => {
    setEmail(targetEmail);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 select-none">
      <div className="w-full max-w-md bg-white border border-stone-200/90 rounded-3xl shadow-xl shadow-stone-200/40 p-8 sm:p-10 space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-white flex items-center justify-center font-heading font-extrabold text-2xl shadow-md shadow-amber-600/20">
            V
          </div>
          <div>
            <div className="font-heading font-extrabold text-xl text-stone-900 tracking-tight flex items-center justify-center gap-1.5 leading-none">
              <span>VastuVision</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold tracking-wide">
                AI
              </span>
            </div>
            <h1 className="text-sm font-bold text-stone-900 mt-2 tracking-wide uppercase">Admin Portal</h1>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Secure Administration
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-[11px] font-semibold border border-stone-200">
            <Lock className="w-3 h-3 text-stone-500" />
            <span>Authorized Personnel Only</span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 block">Email</label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('makesoney@gmail.com')}
                  className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                  title="Autofill makesoney@gmail.com"
                >
                  makesoney@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('shivshahidoors@gmail.com')}
                  className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                  title="Autofill shivshahidoors@gmail.com"
                >
                  shivshahidoors@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@vastuvision.ai')}
                  className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                  title="Autofill admin@vastuvision.ai"
                >
                  admin@vastuvision.ai
                </button>
              </div>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  const normalized = normalizeEmail(email);
                  if (normalized !== email) {
                    setEmail(normalized);
                  }
                }}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
            {/@(gamil|gmial|gmai)\.com$/i.test(email) && (
              <p className="text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center justify-between">
                <span>Spelling typo detected. Will sign in as <strong>{normalizeEmail(email)}</strong></span>
                <button
                  type="button"
                  onClick={() => setEmail(normalizeEmail(email))}
                  className="underline font-bold ml-2 cursor-pointer"
                >
                  Fix
                </button>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Remember session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {(onCancel || onBackToApp) && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleCancelCallback}
              className="text-xs text-stone-500 hover:text-stone-800 font-semibold transition-colors cursor-pointer"
            >
              ← Return to Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
