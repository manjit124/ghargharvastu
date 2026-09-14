import { UserProfile, UserCreditAccount } from '../types';

export interface AuthSessionResponse {
  authenticated: boolean;
  isGuest?: boolean;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    avatar?: string;
    isMobileVerified?: boolean;
    isEmailVerified?: boolean;
    authProvider?: 'google' | 'mobile_otp' | 'email_otp' | 'password';
    plan: 'free' | 'pro' | 'expert';
    preferredLanguage?: 'hi' | 'hinglish' | 'en';
    homeName?: string;
    city?: string;
    propertyType?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  account?: UserCreditAccount;
  token?: string;
}

export interface AuthSuccessResponse {
  success: boolean;
  isNew?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    avatar?: string;
    isMobileVerified?: boolean;
    isEmailVerified?: boolean;
    authProvider?: 'google' | 'mobile_otp' | 'email_otp' | 'password';
    plan: 'free' | 'pro' | 'expert';
    preferredLanguage?: 'hi' | 'hinglish' | 'en';
    homeName?: string;
    city?: string;
    propertyType?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  account: UserCreditAccount;
  token: string;
}

const SESSION_STORAGE_KEY = 'vv_auth_token';

async function parseResponseJson<T = any>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  let data: any = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(fallbackError || `Server error (${res.status})`);
      }
      throw new Error(`Unexpected response from server (${res.status}). Please try again.`);
    }
  }
  return (data || {}) as T;
}

type AuthListener = (session: AuthSessionResponse) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentSession: AuthSessionResponse | null = null;
  private token: string | null = null;

  constructor() {
    try {
      this.token = localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      this.token = null;
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    if (this.currentSession) {
      listener(this.currentSession);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(session: AuthSessionResponse) {
    this.currentSession = session;
    this.listeners.forEach((listener) => {
      try {
        listener(session);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem(SESSION_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-session-token'] = this.token;
    }
    return headers;
  }

  public async getSession(): Promise<AuthSessionResponse> {
    try {
      const headers = this.getAuthHeaders();
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        const fallback: AuthSessionResponse = { authenticated: false, isGuest: true };
        this.notify(fallback);
        return fallback;
      }

      const data: AuthSessionResponse = await parseResponseJson<AuthSessionResponse>(res, 'Failed to parse session data');
      if (data.token) {
        this.setToken(data.token);
      }
      this.notify(data);
      return data;
    } catch (err) {
      console.warn('Failed to retrieve session from server:', err);
      const fallback: AuthSessionResponse = { authenticated: false, isGuest: true };
      this.notify(fallback);
      return fallback;
    }
  }

  public async register(
    name: string,
    email: string,
    passwordPlain: string,
    preferredLanguage: 'hi' | 'hinglish' | 'en' = 'hi'
  ): Promise<AuthSuccessResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: passwordPlain,
        preferredLanguage,
      }),
    });

    const data = await parseResponseJson<any>(res, 'Registration failed. Please check your information.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed. Please check your information.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    const sessionData: AuthSessionResponse = {
      authenticated: true,
      isGuest: false,
      userId: data.user.id,
      user: data.user,
      account: data.account,
      token: data.token,
    };
    this.notify(sessionData);

    return data;
  }

  public async login(email: string, passwordPlain: string): Promise<AuthSuccessResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password: passwordPlain,
      }),
    });

    const data = await parseResponseJson<any>(res, 'Invalid email or password.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Invalid email or password.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    const sessionData: AuthSessionResponse = {
      authenticated: true,
      isGuest: false,
      userId: data.user.id,
      user: data.user,
      account: data.account,
      token: data.token,
    };
    this.notify(sessionData);

    return data;
  }

  public async getConfig(): Promise<{
    google: { configured: boolean; clientId: string };
  }> {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        return await parseResponseJson(res, 'Failed to fetch auth config');
      }
    } catch {
      // ignore
    }
    return {
      google: { configured: false, clientId: '' },
    };
  }

  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; devCode?: string }> {
    const res = await fetch('/api/auth/password/reset-request', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to request password reset.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to request password reset.');
    }
    return data;
  }

  public async confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/password/reset-confirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to reset password.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to reset password.');
    }
    return data;
  }

  public async sendMobileOtp(
    mobile: string,
    name?: string
  ): Promise<{ success: boolean; displayMobile?: string; cooldownSeconds?: number; message?: string }> {
    const res = await fetch('/api/auth/otp/mobile/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, name }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to send OTP to mobile.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send OTP to mobile.');
    }
    return data;
  }

  public async verifyMobileOtp(
    mobile: string,
    otp: string,
    name?: string,
    preferredLanguage: 'hi' | 'hinglish' | 'en' = 'hi'
  ): Promise<AuthSuccessResponse> {
    const res = await fetch('/api/auth/otp/mobile/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp, name, preferredLanguage }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to verify mobile OTP.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to verify mobile OTP.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    const sessionData: AuthSessionResponse = {
      authenticated: true,
      isGuest: false,
      userId: data.user.id,
      user: data.user,
      account: data.account,
      token: data.token,
    };
    this.notify(sessionData);

    return data;
  }

  public async resendMobileOtp(
    mobile: string
  ): Promise<{ success: boolean; cooldownSeconds?: number; message?: string }> {
    const res = await fetch('/api/auth/otp/mobile/resend', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to resend mobile OTP.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to resend mobile OTP.');
    }
    return data;
  }

  public async sendEmailOtp(
    email: string,
    name?: string
  ): Promise<{ success: boolean; cooldownSeconds?: number; message?: string }> {
    const res = await fetch('/api/auth/otp/email/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to send email verification code.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send email verification code.');
    }
    return data;
  }

  public async verifyEmailOtp(
    email: string,
    otp: string,
    name?: string,
    preferredLanguage: 'hi' | 'hinglish' | 'en' = 'hi'
  ): Promise<AuthSuccessResponse> {
    const res = await fetch('/api/auth/otp/email/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, name, preferredLanguage }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to verify email OTP.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to verify email OTP.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    const sessionData: AuthSessionResponse = {
      authenticated: true,
      isGuest: false,
      userId: data.user.id,
      user: data.user,
      account: data.account,
      token: data.token,
    };
    this.notify(sessionData);

    return data;
  }

  public async resendEmailOtp(
    email: string,
    name?: string
  ): Promise<{ success: boolean; cooldownSeconds?: number; message?: string }> {
    const res = await fetch('/api/auth/otp/email/resend', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });

    const data = await parseResponseJson<any>(res, 'Failed to resend email OTP.');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to resend email OTP.');
    }
    return data;
  }

  public async loginWithGoogle(payload: {
    credential?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    picture?: string;
  } = {}): Promise<AuthSuccessResponse> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const data = await parseResponseJson<any>(res, 'Google login failed.');
    if (!res.ok || !data.success) {
      const err = new Error(data.error || 'Google login failed.');
      (err as any).code = data.code;
      throw err;
    }

    if (data.token) {
      this.setToken(data.token);
    }

    const sessionData: AuthSessionResponse = {
      authenticated: true,
      isGuest: false,
      userId: data.user.id,
      user: data.user,
      account: data.account,
      token: data.token,
    };
    this.notify(sessionData);

    return data;
  }

  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
    } catch {
      // ignore network failure on logout
    }

    this.setToken(null);
    const loggedOutSession: AuthSessionResponse = {
      authenticated: false,
      isGuest: true,
    };
    this.notify(loggedOutSession);
  }

  public async updateLanguage(language: 'hi' | 'hinglish' | 'en'): Promise<void> {
    const res = await fetch('/api/user/language', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ language }),
    });

    if (!res.ok) {
      const data = await parseResponseJson<any>(res, 'Failed to update preferred language').catch(() => ({}));
      throw new Error(data.error || 'Failed to update preferred language');
    }

    if (this.currentSession?.user) {
      this.currentSession.user.preferredLanguage = language;
      this.notify({ ...this.currentSession });
    }
  }

  public async updateProfile(data: {
    name?: string;
    homeName?: string;
    city?: string;
    propertyType?: string;
    preferredLanguage?: 'hi' | 'hinglish' | 'en';
  }): Promise<any> {
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    const resp = await parseResponseJson<any>(res, 'Failed to update profile');
    if (!res.ok || !resp.success) {
      throw new Error(resp.error || 'Failed to update profile');
    }

    if (this.currentSession?.user && resp.profile) {
      this.currentSession.user = { ...this.currentSession.user, ...resp.profile };
      this.notify({ ...this.currentSession });
    }

    return resp;
  }
}

export const authService = new AuthService();
