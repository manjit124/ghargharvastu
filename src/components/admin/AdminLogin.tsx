import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, AlertCircle, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';
import { adminFetch, setStoredAdminSession } from './adminApi';
import { AdminUserSanitized } from './types';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUserSanitized, token: string) => void;
  onExit: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onExit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await adminFetch<{ success: boolean; token: string; user: AdminUserSanitized }>(
        '/api/admin/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );

      if (data.token && data.user) {
        setStoredAdminSession(data.token, data.user, rememberMe);
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200/90 rounded-3xl shadow-xl shadow-stone-200/50 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-stone-900 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-stone-900">VastuVision Admin</h2>
          <p className="text-xs text-stone-500">
            Secure Administration
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Remember this session</span>
            </label>
            <span className="text-[11px] text-stone-400">12h session token</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-400 font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Verifying Admin Authorization...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Admin Portal</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <button
            onClick={onExit}
            type="button"
            className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public App</span>
          </button>
          <span className="text-[10px] text-stone-400 font-mono">RBAC v2.4</span>
        </div>
      </div>
    </div>
  );
};
