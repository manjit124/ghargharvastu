import { AdminUserSanitized } from './types';
import { adminService } from '../../services/adminService';

const ADMIN_TOKEN_KEY = 'vv_admin_token';
const ADMIN_USER_KEY = 'vv_admin_user';

export function getStoredAdminToken(): string | null {
  const serviceToken = adminService.getToken();
  if (serviceToken) return serviceToken;

  return (
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    sessionStorage.getItem(ADMIN_TOKEN_KEY) ||
    localStorage.getItem('vastuvision_admin_token') ||
    sessionStorage.getItem('vastuvision_admin_token')
  );
}

export function getStoredAdminUser(): AdminUserSanitized | null {
  const serviceAdmin = adminService.getCurrentAdminUser();
  if (serviceAdmin) return serviceAdmin as any;

  try {
    const raw =
      localStorage.getItem(ADMIN_USER_KEY) ||
      sessionStorage.getItem(ADMIN_USER_KEY) ||
      localStorage.getItem('vastuvision_admin_user') ||
      sessionStorage.getItem('vastuvision_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdminSession(token: string, user: AdminUserSanitized, rememberMe: boolean = true) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ADMIN_TOKEN_KEY, token);
  storage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  storage.setItem('vastuvision_admin_token', token);
  storage.setItem('vastuvision_admin_user', JSON.stringify(user));
}

export function clearStoredAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem('vastuvision_admin_token');
  localStorage.removeItem('vastuvision_admin_user');
  sessionStorage.removeItem('vastuvision_admin_token');
  sessionStorage.removeItem('vastuvision_admin_user');
}

/**
 * Universal authenticated API fetch wrapper
 */
export async function adminFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/') ? endpoint : `/api/admin/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredAdminSession();
    window.dispatchEvent(new CustomEvent('admin_auth_expired'));
    throw new Error('Admin session expired or unauthorized. Please sign in again.');
  }

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errText = await response.text();
      if (errText) {
        try {
          const errData = JSON.parse(errText);
          if (errData.error) errorMsg = errData.error;
          else if (errData.message) errorMsg = errData.message;
        } catch {
          errorMsg = `Server error (${response.status}): ${errText.substring(0, 100)}`;
        }
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  const rawText = await response.text();
  if (!rawText || rawText.trim().length === 0) {
    return {} as T;
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`Invalid JSON received from server (${response.status})`);
  }
}
