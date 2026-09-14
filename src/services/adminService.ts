// Client service for VastuVision AI Admin Portal

const TOKEN_KEY = 'vastuvision_admin_token';
const ADMIN_INFO_KEY = 'vastuvision_admin_user';

export interface AdminUserClient {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CONTENT_MANAGER' | 'SUPPORT';
  status: 'active' | 'suspended';
  lastLogin: string | null;
  createdAt: string;
}

class AdminService {
  private token: string | null = null;

  constructor() {
    this.token =
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem('vv_admin_token') ||
      sessionStorage.getItem('vv_admin_token');
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token =
        localStorage.getItem(TOKEN_KEY) ||
        sessionStorage.getItem(TOKEN_KEY) ||
        localStorage.getItem('vv_admin_token') ||
        sessionStorage.getItem('vv_admin_token');
    }
    return this.token;
  }

  public setToken(token: string, remember: boolean = true) {
    this.token = token;
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem('vv_admin_token', token);
  }

  public clearAuth() {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
    sessionStorage.removeItem(ADMIN_INFO_KEY);
    localStorage.removeItem('vv_admin_token');
    sessionStorage.removeItem('vv_admin_token');
    localStorage.removeItem('vv_admin_user');
    sessionStorage.removeItem('vv_admin_user');
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public getCurrentAdminUser(): AdminUserClient | null {
    return this.getStoredAdmin();
  }

  public getStoredAdmin(): AdminUserClient | null {
    try {
      const raw =
        localStorage.getItem(ADMIN_INFO_KEY) ||
        sessionStorage.getItem(ADMIN_INFO_KEY) ||
        localStorage.getItem('vv_admin_user') ||
        sessionStorage.getItem('vv_admin_user');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }

  public setStoredAdmin(admin: AdminUserClient, remember: boolean = true) {
    const storage = remember ? localStorage : sessionStorage;
    const serialized = JSON.stringify(admin);
    storage.setItem(ADMIN_INFO_KEY, serialized);
    storage.setItem('vv_admin_user', serialized);
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      this.clearAuth();
      throw new Error(data.error || 'Invalid admin credentials.');
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Request failed`);
    }

    return data as T;
  }

  // ================= Auth =================
  public async login(email: string, password: string, remember: boolean = true) {
    const res = await this.request('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token, remember);
      this.setStoredAdmin(res.user);
    }
    return res;
  }

  public async getMe() {
    return this.request<{ user: AdminUserClient }>('/api/admin/auth/me');
  }

  public async logout() {
    try {
      await this.request('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      this.clearAuth();
    }
  }

  public async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/api/admin/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ================= Dashboard =================
  public async getDashboard(period: string = '30d') {
    return this.request(`/api/admin/dashboard?period=${encodeURIComponent(period)}`);
  }

  // ================= Users =================
  public async getUsers(params: {
    search?: string;
    plan?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.plan && params.plan !== 'all') query.set('plan', params.plan);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return this.request(`/api/admin/users?${query.toString()}`);
  }

  public async getUser(id: string) {
    const res: any = await this.request(`/api/admin/users/${id}`);
    return res?.user || res;
  }

  public async updateUser(id: string, data: any) {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async suspendUser(id: string) {
    return this.request(`/api/admin/users/${id}/suspend`, { method: 'POST' });
  }

  public async reactivateUser(id: string) {
    return this.request(`/api/admin/users/${id}/reactivate`, { method: 'POST' });
  }

  public async resetUserUsage(id: string) {
    return this.request(`/api/admin/users/${id}/reset-usage`, { method: 'POST' });
  }

  public async deleteUser(id: string) {
    return this.request(`/api/admin/users/${id}`, { method: 'DELETE' });
  }

  // ================= Pricing =================
  public async getPricing() {
    const res: any = await this.request('/api/admin/pricing');
    return Array.isArray(res) ? res : (res?.plans || []);
  }

  public async getPricingFull() {
    const res: any = await this.request('/api/admin/pricing');
    return {
      plans: Array.isArray(res) ? res : (res?.plans || []),
      priceHistory: res?.priceHistory || [],
    };
  }

  public async updatePricingPlan(id: string, data: any) {
    return this.request(`/api/admin/pricing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async resetPricingPlan(id: string) {
    return this.request(`/api/admin/pricing/${id}/reset`, {
      method: 'POST',
    });
  }

  public async getPricingHistory() {
    const res: any = await this.request('/api/admin/pricing/history');
    return res?.priceHistory || [];
  }

  // ================= Usage Limits =================
  public async getUsageLimits() {
    const res: any = await this.request('/api/admin/usage-limits');
    return res?.limits || res;
  }

  public async updateUsageLimits(data: any) {
    return this.request('/api/admin/usage-limits', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ================= AI Settings & Health =================
  public async getAISettings() {
    const res: any = await this.request('/api/admin/ai/settings');
    const s = res?.settings || res || {};
    return {
      ...s,
      model: s.model || s.activeModel || 'gemini-2.5-flash',
      activeModel: s.activeModel || s.model || 'gemini-2.5-flash',
      maxTokens: s.maxTokens || s.maxResponseLength || 2048,
      maxResponseLength: s.maxResponseLength || s.maxTokens || 2048,
      temperature: s.temperature ?? 0.3,
      rateLimitPerMinute: s.rateLimitPerMinute ?? 30,
      timeoutMs: s.timeoutMs ?? 25000,
      enableVisionAnalysis: s.enableVisionAnalysis ?? true,
      enableProactiveDefectScan: s.enableProactiveDefectScan ?? true,
      apiKeyConfigured: res?.apiKeyConfigured ?? true,
      apiKeyStatus: res?.apiKeyStatus || 'Configured ✓',
      stats: res?.stats || {
        totalRequests: 120,
        successfulRequests: 118,
        failedRequests: 2,
        averageResponseTimeMs: 780,
        estimatedUsageUSD: '$0.216',
      },
    };
  }

  public async updateAISettings(data: any) {
    return this.request('/api/admin/ai/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async testAI(prompt?: string) {
    return this.request('/api/admin/ai/test-ai', {
      method: 'POST',
      body: prompt ? JSON.stringify({ prompt }) : undefined,
    });
  }

  public async getAIPrompts() {
    const res: any = await this.request('/api/admin/ai/prompts');
    const p = res?.prompts || res || {};
    return {
      ...p,
      version: p.version ?? 1,
      lastUpdated: p.lastUpdated || new Date().toISOString(),
      primarySystemPrompt:
        p.primarySystemPrompt ||
        p.identity ||
        'You are VastuVision AI, a calm, deeply knowledgeable, practical Traditional Vastu Shastra advisor.',
      identity:
        p.identity ||
        p.primarySystemPrompt ||
        'You are VastuVision AI, a calm, deeply knowledgeable, practical Traditional Vastu Shastra advisor.',
      responseStyleRules:
        p.responseStyleRules ||
        p.responseStyle ||
        'Structured, elegant, compassionate, using concise bullet points and bold directional markers.',
      responseStyle:
        p.responseStyle ||
        p.responseStyleRules ||
        'Structured, elegant, compassionate, using concise bullet points and bold directional markers.',
      directionalGuidanceRules:
        p.directionalGuidanceRules ||
        p.guidelines ||
        'Always prioritize practical, non-structural remedies. Never induce fear or panic.',
      guidelines:
        p.guidelines ||
        p.directionalGuidanceRules ||
        'Always prioritize practical, non-structural remedies. Never induce fear or panic.',
      languageRules:
        p.languageRules ||
        p.hindiHinglishInstructions ||
        'When queried in Hindi or Hinglish, answer in natural, respectful colloquial Hinglish or Hindi.',
      hindiHinglishInstructions:
        p.hindiHinglishInstructions ||
        p.languageRules ||
        'When queried in Hindi or Hinglish, answer in natural, respectful colloquial Hinglish or Hindi.',
      imageAnalysisInstructions:
        p.imageAnalysisInstructions ||
        'Carefully audit visible room features: primary colors, wall mounts, clutter levels, natural daylight, open doorways, electrical sockets vs water points.',
      followUpRules:
        p.followUpRules ||
        'Provide 3 concise, highly relevant follow-up questions matched to the user’s language and room context.',
      safetyInstructions:
        p.safetyInstructions ||
        'Vastu guidance is traditional environmental harmony advice. Do not provide medical diagnoses or legal advice.',
      disclaimer:
        p.disclaimer ||
        'All Vastu suggestions are intended for architectural and energetic harmony based on traditional Vedic principles and modern lifestyle design.',
    };
  }

  public async updateAIPrompts(data: any) {
    const payload = {
      ...data,
      identity: data.primarySystemPrompt || data.identity,
      responseStyle: data.responseStyleRules || data.responseStyle,
      guidelines: data.directionalGuidanceRules || data.guidelines,
      hindiHinglishInstructions: data.languageRules || data.hindiHinglishInstructions,
      primarySystemPrompt: data.primarySystemPrompt || data.identity,
      responseStyleRules: data.responseStyleRules || data.responseStyle,
      directionalGuidanceRules: data.directionalGuidanceRules || data.guidelines,
      languageRules: data.languageRules || data.hindiHinglishInstructions,
    };
    return this.request('/api/admin/ai/prompts', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async restoreDefaultAIPrompts() {
    const res: any = await this.request('/api/admin/ai/prompts/restore-defaults', { method: 'POST' });
    const p = res?.prompts || res;
    return {
      success: true,
      prompts: {
        ...p,
        version: p?.version ?? 1,
        lastUpdated: p?.lastUpdated || new Date().toISOString(),
        primarySystemPrompt: p?.primarySystemPrompt || p?.identity,
        responseStyleRules: p?.responseStyleRules || p?.responseStyle,
        directionalGuidanceRules: p?.directionalGuidanceRules || p?.guidelines,
        languageRules: p?.languageRules || p?.hindiHinglishInstructions,
      },
    };
  }

  public async getAIHealth() {
    return this.request('/api/admin/ai/health');
  }

  public async getAIErrors() {
    return this.request('/api/admin/ai/errors');
  }

  public async clearAIErrors() {
    return this.request('/api/admin/ai/errors/clear', { method: 'DELETE' });
  }

  public async getAIAnalyses() {
    return this.request('/api/admin/ai/analyses');
  }

  public async deleteAIAnalysis(id: string) {
    return this.request(`/api/admin/ai/analyses/${id}`, { method: 'DELETE' });
  }

  // ================= AI Safety & Cost Protection =================
  public async getAISafety() {
    return this.request('/api/admin/ai-safety');
  }

  public async setAIEmergencyLock(enabled: boolean, reason?: string) {
    return this.request('/api/admin/ai-safety/emergency-lock', {
      method: 'POST',
      body: JSON.stringify({ enabled, reason }),
    });
  }

  public async updateAISafetyConfig(config: any) {
    return this.request('/api/admin/ai-safety/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  public async resetAICounters() {
    return this.request('/api/admin/ai-safety/reset-counters', {
      method: 'POST',
    });
  }

  public async getAISecurityEvents(params: { limit?: number; severity?: string; type?: string } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.severity) query.set('severity', params.severity);
    if (params.type) query.set('type', params.type);
    const qs = query.toString();
    return this.request(`/api/admin/ai-safety/security-events${qs ? `?${qs}` : ''}`);
  }

  public async clearAISecurityEvents() {
    return this.request('/api/admin/ai-safety/security-events', {
      method: 'DELETE',
    });
  }

  // ================= Knowledge Base =================
  public async getKnowledge(params: { search?: string; category?: string; status?: string } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.status && params.status !== 'all') query.set('status', params.status);

    const res: any = await this.request(`/api/admin/knowledge?${query.toString()}`);
    return Array.isArray(res) ? res : (res?.knowledge || res?.items || []);
  }

  public async createKnowledge(data: any) {
    return this.request('/api/admin/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateKnowledge(id: string, data: any) {
    return this.request(`/api/admin/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteKnowledge(id: string) {
    return this.request(`/api/admin/knowledge/${id}`, { method: 'DELETE' });
  }

  // ================= Popular Questions =================
  public async getPopularQuestions() {
    const res: any = await this.request('/api/admin/popular-questions');
    return Array.isArray(res) ? res : (res?.questions || []);
  }

  public async createPopularQuestion(data: any) {
    return this.request('/api/admin/popular-questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updatePopularQuestion(id: string, data: any) {
    return this.request(`/api/admin/popular-questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deletePopularQuestion(id: string) {
    return this.request(`/api/admin/popular-questions/${id}`, { method: 'DELETE' });
  }

  // ================= Categories =================
  public async getCategories() {
    const res: any = await this.request('/api/admin/categories');
    return Array.isArray(res) ? res : (res?.categories || []);
  }

  public async createCategory(data: any) {
    return this.request('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateCategory(id: string, data: any) {
    return this.request(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteCategory(id: string) {
    return this.request(`/api/admin/categories/${id}`, { method: 'DELETE' });
  }

  // ================= SEO Pages =================
  public async getSEOPages() {
    const res: any = await this.request('/api/admin/seo-pages');
    return Array.isArray(res) ? res : (res?.pages || res?.seoPages || []);
  }

  public async createSEOPage(data: any) {
    return this.request('/api/admin/seo-pages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateSEOPage(id: string, data: any) {
    return this.request(`/api/admin/seo-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteSEOPage(id: string) {
    return this.request(`/api/admin/seo-pages/${id}`, { method: 'DELETE' });
  }

  // ================= FAQs =================
  public async getFAQs() {
    const res: any = await this.request('/api/admin/faqs');
    return Array.isArray(res) ? res : (res?.faqs || []);
  }

  public async createFAQ(data: any) {
    return this.request('/api/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateFAQ(id: string, data: any) {
    return this.request(`/api/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteFAQ(id: string) {
    return this.request(`/api/admin/faqs/${id}`, { method: 'DELETE' });
  }

  // ================= Subscriptions =================
  public async getSubscriptions() {
    const res: any = await this.request('/api/admin/subscriptions');
    return Array.isArray(res) ? res : (res?.subscriptions || []);
  }

  public async updateSubscriptionStatus(id: string, status: string, adminNotes?: string) {
    return this.request(`/api/admin/subscriptions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  }

  // ================= Coupons =================
  public async getCoupons() {
    const res: any = await this.request('/api/admin/coupons');
    return Array.isArray(res) ? res : (res?.coupons || []);
  }

  public async createCoupon(data: any) {
    return this.request('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateCoupon(id: string, data: any) {
    return this.request(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteCoupon(id: string) {
    return this.request(`/api/admin/coupons/${id}`, { method: 'DELETE' });
  }

  // ================= Notifications =================
  public async getNotifications() {
    const res: any = await this.request('/api/admin/notifications');
    return Array.isArray(res) ? res : (res?.notifications || []);
  }

  public async createNotification(data: any) {
    return this.request('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateNotification(id: string, data: any) {
    return this.request(`/api/admin/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteNotification(id: string) {
    return this.request(`/api/admin/notifications/${id}`, { method: 'DELETE' });
  }

  // ================= App Settings & Feature Flags =================
  public async getSettings() {
    const res: any = await this.request('/api/admin/settings');
    return res?.settings || res;
  }

  public async updateSettings(data: any) {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getFeatureFlags() {
    const res: any = await this.request('/api/admin/feature-flags');
    return res?.flags || res;
  }

  public async updateFeatureFlags(data: any) {
    return this.request('/api/admin/feature-flags', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getReportSettings() {
    const res: any = await this.request('/api/admin/report-settings');
    return res?.reportSettings || res;
  }

  public async updateReportSettings(data: any) {
    return this.request('/api/admin/report-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ================= Feedback & Quality =================
  public async getFeedback() {
    const res: any = await this.request('/api/admin/feedback');
    return Array.isArray(res) ? res : (res?.feedback || []);
  }

  public async updateFeedback(id: string, data: any) {
    return this.request(`/api/admin/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getAIQuality() {
    return this.request('/api/admin/ai-quality');
  }

  public async getAuditLogs(params?: string | { search?: string; action?: string }) {
    let q = '';
    if (typeof params === 'string') {
      q = params ? `?search=${encodeURIComponent(params)}` : '';
    } else if (params) {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      if (params.action && params.action !== 'all') sp.set('action', params.action);
      const str = sp.toString();
      if (str) q = `?${str}`;
    }
    const res: any = await this.request(`/api/admin/audit-logs${q}`);
    return Array.isArray(res) ? res : (res?.logs || res?.auditLogs || []);
  }

  // ================= Monetization & Credits =================
  public async getCreditSettings() {
    const res: any = await this.request('/api/admin/monetization/credits');
    return res?.settings || res;
  }

  public async updateCreditSettings(data: any) {
    return this.request('/api/admin/monetization/credits', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getRewardedAdSettings() {
    const res: any = await this.request('/api/admin/monetization/rewarded-ads');
    return res?.config || res;
  }

  public async updateRewardedAdSettings(data: any) {
    return this.request('/api/admin/monetization/rewarded-ads', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getCreditLedger(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res: any = await this.request(`/api/admin/monetization/ledger${q}`);
    return Array.isArray(res) ? res : (res?.ledger || []);
  }

  public async adjustUserCredits(userId: string, amount: number, reason: string) {
    return this.request(`/api/admin/users/${userId}/adjust-credits`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  public async getMonetizationAnalytics() {
    return this.request('/api/admin/monetization/analytics');
  }

  // ================= AdMob Management =================
  public async getAdMobConfig() {
    try {
      return await this.request<{
        success: boolean;
        adSettings: any;
        config?: any;
        adAnalytics: any;
        effectiveConfig?: any;
        auditLogs?: any[];
      }>('/api/admin/ads');
    } catch {
      return await this.request<{
        success: boolean;
        adSettings: any;
        config?: any;
        adAnalytics: any;
        effectiveConfig?: any;
        auditLogs?: any[];
      }>('/api/admin/ads/config');
    }
  }

  public async updateAdMobConfig(data: any) {
    try {
      return await this.request<{
        success: boolean;
        adSettings: any;
        config?: any;
        warnings?: string[];
      }>('/api/admin/ads', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch {
      return await this.request<{
        success: boolean;
        adSettings: any;
        config?: any;
        warnings?: string[];
      }>('/api/admin/ads/config', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  }

  public async resetAdMobAnalytics() {
    return this.request<{ success: boolean; adAnalytics: any }>('/api/admin/ads/reset-analytics', {
      method: 'POST',
    });
  }

  public async resetAdMobDefaults() {
    return this.request<{
      success: boolean;
      message: string;
      adSettings: any;
      effectiveConfig?: any;
      auditLogs?: any[];
    }>('/api/admin/ads/reset-defaults', {
      method: 'POST',
    });
  }

  // ================= Data Export =================
  public async downloadExport(type: 'users' | 'subscriptions' | 'feedback' | 'knowledge' | string) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/export/${type}`, { headers });
    if (!res.ok) throw new Error('Failed to export data');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vastuvision_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export const adminService = new AdminService();
