import { UserCreditAccount, PlanConfig, CreditLedgerRecord } from '../types';
import { authService } from './authService';

const USER_ID_KEY = 'vv_user_id';

async function safeJson<T = any>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  if (!text || text.trim().length === 0) {
    if (!res.ok) throw new Error(fallbackError || `Server error (${res.status})`);
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    if (!res.ok) throw new Error(fallbackError || `Server error (${res.status})`);
    throw new Error(`Unexpected server response format (${res.status}).`);
  }
}

export function getStoredUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export interface CreditStateResponse {
  account: UserCreditAccount;
  planDetails: PlanConfig;
  pricingPlans: PlanConfig[];
  adConfig: {
    enabled: boolean;
    rewardCredits: number;
    maxAdsPerDay: number;
    cooldownSeconds: number;
    todayAdsWatched: number;
    lastAdWatchedAt?: number;
  };
}

type CreditChangeListener = (account: UserCreditAccount) => void;

class CreditService {
  private listeners: Set<CreditChangeListener> = new Set();
  private cachedAccount: UserCreditAccount | null = null;
  private cachedAdConfig: CreditStateResponse['adConfig'] | null = null;

  public subscribe(listener: CreditChangeListener): () => void {
    this.listeners.add(listener);
    if (this.cachedAccount) {
      listener(this.cachedAccount);
    }
    return () => this.listeners.delete(listener);
  }

  private notify(account: UserCreditAccount) {
    this.cachedAccount = account;
    this.listeners.forEach((fn) => fn(account));
  }

  public getCachedAccount(): UserCreditAccount | null {
    return this.cachedAccount;
  }

  public getCachedAdConfig(): CreditStateResponse['adConfig'] | null {
    return this.cachedAdConfig;
  }

  public async fetchCredits(): Promise<CreditStateResponse> {
    const userId = getStoredUserId();
    const res = await fetch('/api/user/credits', {
      credentials: 'include',
      headers: {
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch user credits: ${res.statusText}`);
    }
    const data: CreditStateResponse = await safeJson<CreditStateResponse>(res, 'Failed to parse credit details');
    this.cachedAccount = data.account;
    this.cachedAdConfig = data.adConfig;
    this.notify(data.account);
    return data;
  }

  public async watchAndClaimRewardedAd(): Promise<{
    success: boolean;
    rewardGranted: number;
    newBalance: number;
    account: UserCreditAccount;
  }> {
    const userId = getStoredUserId();
    const transactionId = 'ad_view_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const res = await fetch('/api/user/ads/reward', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
      body: JSON.stringify({ transactionId }),
    });

    const data = await safeJson<any>(res, 'Failed to process ad reward');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to claim ad reward');
    }

    this.cachedAccount = data.account;
    this.notify(data.account);
    return data;
  }

  public async fetchPaymentConfig(): Promise<{
    configured: boolean;
    keyId: string | null;
    currency: string;
    testMode: boolean;
  }> {
    const res = await fetch('/api/payments/config', {
      credentials: 'include',
      headers: authService.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch payment gateway config');
    return safeJson(res, 'Failed to parse payment config');
  }

  public async createPaymentOrder(
    planId: 'pro' | 'expert',
    couponCode?: string
  ): Promise<{
    success: boolean;
    configured: boolean;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    planId?: string;
    planName?: string;
    error?: string;
    message?: string;
  }> {
    const userId = getStoredUserId();
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
      body: JSON.stringify({ planId, couponCode }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned unexpected response (status ${res.status}). Please try again.`);
    }
    return data;
  }

  public async verifyPayment(details: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    account?: UserCreditAccount;
  }> {
    const userId = getStoredUserId();
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
      body: JSON.stringify(details),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned unexpected response (status ${res.status}). Please try again.`);
    }
    if (data.success && data.account) {
      this.cachedAccount = data.account;
      this.notify(data.account);
    }
    return data;
  }

  public async subscribePlan(
    planId: 'pro' | 'expert',
    durationMonths: number = 1,
    paymentMethod: string = 'card',
    couponCode?: string
  ) {
    const userId = getStoredUserId();
    const res = await fetch('/api/user/subscribe', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
      body: JSON.stringify({ planId, durationMonths, paymentMethod, couponCode }),
    });

    const data = await safeJson<any>(res, 'Subscription failed');
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Subscription failed');
    }

    this.cachedAccount = data.account;
    this.notify(data.account);
    return data;
  }

  public async fetchLedger(): Promise<CreditLedgerRecord[]> {
    const userId = getStoredUserId();
    const res = await fetch('/api/user/ledger', {
      credentials: 'include',
      headers: {
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch ledger');
    const data = await safeJson<any>(res, 'Failed to parse ledger records');
    return data.ledger || [];
  }
}

export const creditService = new CreditService();
