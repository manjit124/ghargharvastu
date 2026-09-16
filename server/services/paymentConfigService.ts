import Razorpay from 'razorpay';
import { adminStore } from '../adminStore';

export type PaymentMode = 'TEST' | 'LIVE';
export type PaymentConnectionStatus = 'Connected' | 'Not Connected' | 'Error';

export interface PublicPaymentConfig {
  configured: boolean;
  keyId: string | null;
  currency: string;
  mode: PaymentMode;
  testMode: boolean;
}

export interface AdminPaymentConfig {
  gateway: string;
  mode: PaymentMode;
  connectionStatus: PaymentConnectionStatus;
  connectionMessage?: string;
  activeKeyIdMasked: string;
  hasActiveSecret: boolean;
  hasActiveWebhook: boolean;
  testConfig: {
    keyIdMasked: string;
    hasKeyId: boolean;
    hasSecret: boolean;
    hasWebhook: boolean;
  };
  liveConfig: {
    keyIdMasked: string;
    hasKeyId: boolean;
    hasSecret: boolean;
    hasWebhook: boolean;
  };
  productionReadiness: {
    isReady: boolean;
    reasons: string[];
    blockers: string[];
  };
  webhookUrl: string;
  activePlans: {
    id: string;
    name: string;
    price: number;
    promotionalPrice?: number;
    currency: string;
    credits?: number;
    billingPeriod: string;
  }[];
}

interface SecretVault {
  testKeyId?: string;
  testKeySecret?: string;
  testWebhookSecret?: string;
  liveKeyId?: string;
  liveKeySecret?: string;
  liveWebhookSecret?: string;
}

/**
 * Mask key ID safely for display in UI or logs
 * E.g., rzp_test_••••••••1234 or rzp_live_••••••••5678
 */
export function maskKeyId(keyId: string | null | undefined): string {
  if (!keyId || typeof keyId !== 'string') return 'Not Configured';
  const trimmed = keyId.trim();
  if (trimmed.length < 8) return '••••••••';

  let prefix = '';
  if (trimmed.startsWith('rzp_test_')) {
    prefix = 'rzp_test_';
  } else if (trimmed.startsWith('rzp_live_')) {
    prefix = 'rzp_live_';
  } else {
    prefix = trimmed.substring(0, 4) + '_';
  }

  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export class PaymentConfigService {
  private mode: PaymentMode = 'TEST';
  private vault: SecretVault = {};
  private activeClient: any = null;
  private lastClientKeyId: string | null = null;
  private lastConnectionStatus: PaymentConnectionStatus = 'Not Connected';
  private lastConnectionMessage: string = 'Checking gateway status...';
  private lastCheckedTimestamp: number = 0;

  constructor() {
    this.initFromEnv();
  }

  /**
   * Initializes or refreshes mode and credentials from environment variables / Secret Manager / adminStore
   */
  public initFromEnv(): void {
    const rawMode = (process.env.RAZORPAY_MODE || '').trim().toUpperCase();
    if (rawMode === 'LIVE') {
      this.mode = 'LIVE';
    } else if (rawMode === 'TEST') {
      this.mode = 'TEST';
    } else if (
      (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.trim().startsWith('rzp_live_')) ||
      (process.env.RAZORPAY_LIVE_KEY_ID && process.env.RAZORPAY_LIVE_KEY_ID.trim().startsWith('rzp_live_'))
    ) {
      // Auto-detect LIVE mode when live key is provided and mode not explicitly set to TEST
      this.mode = 'LIVE';
    } else {
      this.mode = 'TEST';
    }

    // Load persisted vault credentials from adminStore if available
    if (adminStore.paymentVault) {
      this.vault = {
        testKeyId: adminStore.paymentVault.testKeyId || this.vault.testKeyId,
        testKeySecret: adminStore.paymentVault.testKeySecret || this.vault.testKeySecret,
        testWebhookSecret: adminStore.paymentVault.testWebhookSecret || this.vault.testWebhookSecret,
        liveKeyId: adminStore.paymentVault.liveKeyId || this.vault.liveKeyId,
        liveKeySecret: adminStore.paymentVault.liveKeySecret || this.vault.liveKeySecret,
        liveWebhookSecret: adminStore.paymentVault.liveWebhookSecret || this.vault.liveWebhookSecret,
      };
    }
  }

  public getMode(): PaymentMode {
    return this.mode;
  }

  /**
   * Safe mode toggle with strict production readiness verification.
   * Requirement 8: Do not allow an Admin to activate LIVE mode if
   * - Live Key ID is missing
   * - Live Key Secret is missing
   * - credentials cannot authenticate with Razorpay
   */
  public async setMode(
    newMode: PaymentMode,
    adminUser?: { id: string; name: string }
  ): Promise<{ success: boolean; message: string; config: AdminPaymentConfig }> {
    if (newMode === 'LIVE') {
      const eligibility = await this.validateLiveEligibility();
      if (!eligibility.allowed) {
        throw new Error(eligibility.reason);
      }
    }

    const oldMode = this.mode;
    this.mode = newMode;
    this.activeClient = null; // Invalidate cached client

    // Test connection with the new mode
    const testResult = await this.testConnection(newMode);
    this.lastConnectionStatus = testResult.success ? 'Connected' : 'Error';
    this.lastConnectionMessage = testResult.message;

    if (adminUser) {
      adminStore.logAudit(
        adminUser,
        'PAYMENT_MODE_CHANGED',
        'razorpay_gateway',
        `Switched payment gateway mode from ${oldMode} to ${newMode} (Status: ${this.lastConnectionStatus})`
      );
    }

    return {
      success: true,
      message: `Switched Razorpay mode to ${newMode}. Connection: ${this.lastConnectionStatus}.`,
      config: await this.getAdminConfig(),
    };
  }

  /**
   * Returns current active Key ID based on current mode
   */
  public getActiveKeyId(): string | null {
    if (this.mode === 'LIVE') {
      const candidate =
        this.vault.liveKeyId ||
        process.env.RAZORPAY_LIVE_KEY_ID ||
        (process.env.RAZORPAY_KEY_ID?.trim().startsWith('rzp_live') ? process.env.RAZORPAY_KEY_ID : null) ||
        process.env.RAZORPAY_KEY_ID;
      return candidate?.trim() || null;
    }

    // TEST mode
    const candidate =
      this.vault.testKeyId ||
      process.env.RAZORPAY_TEST_KEY_ID ||
      process.env.RAZORPAY_KEY_ID;

    return candidate?.trim() || null;
  }

  /**
   * Returns current active Key Secret.
   * NEVER exposed via public APIs or written to disk.
   */
  public getActiveSecret(): string | null {
    if (this.mode === 'LIVE') {
      const secret =
        this.vault.liveKeySecret ||
        process.env.RAZORPAY_LIVE_KEY_SECRET ||
        process.env.RAZORPAY_KEY_SECRET;
      return secret?.trim() || null;
    }

    const secret =
      this.vault.testKeySecret ||
      process.env.RAZORPAY_TEST_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET;
    return secret?.trim() || null;
  }

  /**
   * Returns current active Webhook Secret.
   */
  public getActiveWebhookSecret(): string | null {
    if (this.mode === 'LIVE') {
      const secret =
        this.vault.liveWebhookSecret ||
        process.env.RAZORPAY_LIVE_WEBHOOK_SECRET ||
        process.env.RAZORPAY_WEBHOOK_SECRET;
      return secret?.trim() || null;
    }

    const secret =
      this.vault.testWebhookSecret ||
      process.env.RAZORPAY_TEST_WEBHOOK_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET;
    return secret?.trim() || null;
  }

  public isConfigured(mode?: PaymentMode): boolean {
    const targetMode = mode || this.mode;
    if (targetMode === 'LIVE') {
      const keyId =
        this.vault.liveKeyId ||
        process.env.RAZORPAY_LIVE_KEY_ID ||
        process.env.RAZORPAY_KEY_ID;
      const secret =
        this.vault.liveKeySecret ||
        process.env.RAZORPAY_LIVE_KEY_SECRET ||
        process.env.RAZORPAY_KEY_SECRET;
      return Boolean(keyId && secret && keyId.trim().length > 6 && secret.trim().length > 6);
    }

    const keyId = this.getActiveKeyId();
    const secret = this.getActiveSecret();
    return Boolean(keyId && secret && keyId.trim().length > 6 && secret.trim().length > 6);
  }

  /**
   * Checks whether the active credentials are authentic Razorpay cloud credentials
   */
  public hasLiveApiCredentials(): boolean {
    const keyId = this.getActiveKeyId();
    const secret = this.getActiveSecret();
    if (!keyId || !secret) return false;
    return /^rzp_(test|live)_[a-zA-Z0-9]{8,}$/.test(keyId.trim()) && secret.trim().length >= 8;
  }

  /**
   * Returns an authenticated Razorpay client instance using active credentials
   */
  public getClient(): any {
    const activeKeyId = this.getActiveKeyId();
    const activeSecret = this.getActiveSecret();

    if (!activeKeyId || !activeSecret) {
      throw new Error(
        `Razorpay ${this.mode} credentials are not configured. Please supply RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.`
      );
    }

    if (!this.activeClient || this.lastClientKeyId !== activeKeyId) {
      this.activeClient = new Razorpay({
        key_id: activeKeyId.trim(),
        key_secret: activeSecret.trim(),
      });
      this.lastClientKeyId = activeKeyId;
    }

    return this.activeClient;
  }

  /**
   * Tests live authentication with Razorpay API
   */
  public async testConnection(mode?: PaymentMode): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const targetMode = mode || this.mode;
    let keyId: string | null = null;
    let keySecret: string | null = null;

    if (targetMode === 'LIVE') {
      keyId =
        this.vault.liveKeyId ||
        process.env.RAZORPAY_LIVE_KEY_ID ||
        (process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live') ? process.env.RAZORPAY_KEY_ID : null);
      keySecret =
        this.vault.liveKeySecret ||
        process.env.RAZORPAY_LIVE_KEY_SECRET ||
        (this.mode === 'LIVE' ? process.env.RAZORPAY_KEY_SECRET : null);
    } else {
      keyId = this.getActiveKeyId();
      keySecret = this.getActiveSecret();
    }

    if (!keyId || !keySecret) {
      return {
        success: false,
        message: `${targetMode} credentials are not configured on the server.`,
      };
    }

    try {
      const client = new Razorpay({
        key_id: keyId.trim(),
        key_secret: keySecret.trim(),
      });

      // Low-overhead call to test authentication
      const result: any = await client.orders.all({ count: 1 });
      return {
        success: true,
        message: `Successfully connected and authenticated with Razorpay in ${targetMode} mode.`,
        details: { count: result?.items?.length ?? 0 },
      };
    } catch (err: any) {
      console.error(`[PaymentConfigService] Connection test failed in ${targetMode} mode:`, err);
      return {
        success: false,
        message: err.error?.description || err.message || `Failed to authenticate with Razorpay in ${targetMode} mode.`,
      };
    }
  }

  /**
   * Validate if LIVE mode can be activated
   */
  public async validateLiveEligibility(): Promise<{ allowed: boolean; reason: string }> {
    const liveKeyId =
      this.vault.liveKeyId ||
      process.env.RAZORPAY_LIVE_KEY_ID ||
      (process.env.RAZORPAY_KEY_ID?.trim().startsWith('rzp_live') ? process.env.RAZORPAY_KEY_ID : null) ||
      process.env.RAZORPAY_KEY_ID;
    const liveSecret =
      this.vault.liveKeySecret ||
      process.env.RAZORPAY_LIVE_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET;

    if (!liveKeyId || !liveKeyId.trim()) {
      return {
        allowed: false,
        reason: 'Live payment configuration is incomplete: Live Key ID (rzp_live_...) is missing.',
      };
    }

    if (!liveKeyId.trim().startsWith('rzp_live_')) {
      return {
        allowed: false,
        reason: 'Live payment configuration is incomplete: Key ID must be an authentic Razorpay Live key starting with "rzp_live_".',
      };
    }

    if (!liveSecret || liveSecret.trim().length < 8) {
      return {
        allowed: false,
        reason: 'Live payment configuration is incomplete: Live Key Secret is missing or invalid.',
      };
    }

    // Authenticate with Razorpay
    const testResult = await this.testConnection('LIVE');
    if (!testResult.success) {
      return {
        allowed: false,
        reason: `Live payment configuration is incomplete: Could not authenticate with Razorpay (${testResult.message}).`,
      };
    }

    return { allowed: true, reason: 'Live credentials validated successfully.' };
  }

  /**
   * Update credentials in server memory vault (never persisted to json file)
   */
  public async updateCredentials(
    data: {
      mode?: PaymentMode;
      testKeyId?: string;
      testKeySecret?: string;
      testWebhookSecret?: string;
      liveKeyId?: string;
      liveKeySecret?: string;
      liveWebhookSecret?: string;
    },
    adminUser: { id: string; name: string }
  ): Promise<{ success: boolean; message: string; config: AdminPaymentConfig }> {
    const changes: string[] = [];

    if (data.testKeyId !== undefined) {
      this.vault.testKeyId = data.testKeyId.trim();
      changes.push(`Test Key ID: ${maskKeyId(this.vault.testKeyId)}`);
    }
    if (data.testKeySecret !== undefined && data.testKeySecret.trim()) {
      this.vault.testKeySecret = data.testKeySecret.trim();
      changes.push('Test Key Secret updated');
    }
    if (data.testWebhookSecret !== undefined && data.testWebhookSecret.trim()) {
      this.vault.testWebhookSecret = data.testWebhookSecret.trim();
      changes.push('Test Webhook Secret updated');
    }

    if (data.liveKeyId !== undefined) {
      this.vault.liveKeyId = data.liveKeyId.trim();
      changes.push(`Live Key ID: ${maskKeyId(this.vault.liveKeyId)}`);
    }
    if (data.liveKeySecret !== undefined && data.liveKeySecret.trim()) {
      this.vault.liveKeySecret = data.liveKeySecret.trim();
      changes.push('Live Key Secret updated');
    }
    if (data.liveWebhookSecret !== undefined && data.liveWebhookSecret.trim()) {
      this.vault.liveWebhookSecret = data.liveWebhookSecret.trim();
      changes.push('Live Webhook Secret updated');
    }

    // Persist credentials to adminStore for durability across restarts
    adminStore.paymentVault = {
      testKeyId: this.vault.testKeyId,
      testKeySecret: this.vault.testKeySecret,
      testWebhookSecret: this.vault.testWebhookSecret,
      liveKeyId: this.vault.liveKeyId,
      liveKeySecret: this.vault.liveKeySecret,
      liveWebhookSecret: this.vault.liveWebhookSecret,
    };
    adminStore.saveToDisk();

    // Invalidate cached client
    this.activeClient = null;

    if (data.mode && data.mode !== this.mode) {
      return this.setMode(data.mode, adminUser);
    }

    // Refresh connection status
    const testResult = await this.testConnection();
    this.lastConnectionStatus = testResult.success ? 'Connected' : 'Error';
    this.lastConnectionMessage = testResult.message;

    adminStore.logAudit(
      adminUser,
      'PAYMENT_CONFIG_UPDATED',
      'razorpay_gateway',
      `Updated credentials in server memory vault: ${changes.join(', ')} (Status: ${this.lastConnectionStatus})`
    );

    return {
      success: true,
      message: 'Razorpay configuration updated successfully.',
      config: await this.getAdminConfig(),
    };
  }

  /**
   * Client-facing sanitized configuration.
   * Publicly safe: only returns public Key ID, NEVER the secret!
   */
  public getPublicClientConfig(): PublicPaymentConfig {
    const isConfig = this.isConfigured();
    const keyId = isConfig ? this.getActiveKeyId() : null;

    return {
      configured: isConfig,
      keyId,
      currency: 'INR',
      mode: this.mode,
      testMode: this.mode === 'TEST',
    };
  }

  /**
   * Admin-facing configuration status panel data
   */
  public async getAdminConfig(): Promise<AdminPaymentConfig> {
    const activeKeyId = this.getActiveKeyId();
    const activeSecret = this.getActiveSecret();
    const activeWebhook = this.getActiveWebhookSecret();

    // Check cached connection status or refresh if older than 60s
    const now = Date.now();
    if (now - this.lastCheckedTimestamp > 60000 || this.lastConnectionStatus === 'Not Connected') {
      if (this.isConfigured()) {
        const testRes = await this.testConnection();
        this.lastConnectionStatus = testRes.success ? 'Connected' : 'Error';
        this.lastConnectionMessage = testRes.message;
      } else {
        this.lastConnectionStatus = 'Not Connected';
        this.lastConnectionMessage = `Razorpay ${this.mode} credentials not configured.`;
      }
      this.lastCheckedTimestamp = now;
    }

    const testKeyId =
      this.vault.testKeyId ||
      process.env.RAZORPAY_TEST_KEY_ID ||
      (this.mode === 'TEST' ? process.env.RAZORPAY_KEY_ID : null);
    const testSecret =
      this.vault.testKeySecret ||
      process.env.RAZORPAY_TEST_KEY_SECRET ||
      (this.mode === 'TEST' ? process.env.RAZORPAY_KEY_SECRET : null);
    const testWebhook =
      this.vault.testWebhookSecret ||
      process.env.RAZORPAY_TEST_WEBHOOK_SECRET ||
      (this.mode === 'TEST' ? process.env.RAZORPAY_WEBHOOK_SECRET : null);

    const liveKeyId =
      this.vault.liveKeyId ||
      process.env.RAZORPAY_LIVE_KEY_ID ||
      (process.env.RAZORPAY_KEY_ID?.trim().startsWith('rzp_live') ? process.env.RAZORPAY_KEY_ID : null) ||
      (this.mode === 'LIVE' ? process.env.RAZORPAY_KEY_ID : null);
    const liveSecret =
      this.vault.liveKeySecret ||
      process.env.RAZORPAY_LIVE_KEY_SECRET ||
      (this.mode === 'LIVE' ? process.env.RAZORPAY_KEY_SECRET : null) ||
      (process.env.RAZORPAY_KEY_ID?.trim().startsWith('rzp_live') ? process.env.RAZORPAY_KEY_SECRET : null);
    const liveWebhook =
      this.vault.liveWebhookSecret ||
      process.env.RAZORPAY_LIVE_WEBHOOK_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET;

    // Production readiness analysis
    const reasons: string[] = [];
    const blockers: string[] = [];

    if (liveKeyId && liveKeyId.startsWith('rzp_live_')) {
      reasons.push('Live Key ID is configured with valid production prefix');
    } else {
      blockers.push('Live Key ID (rzp_live_...) is not configured');
    }

    if (liveSecret && liveSecret.length >= 8) {
      reasons.push('Live Key Secret is configured in secure server environment');
    } else {
      blockers.push('Live Key Secret is not configured');
    }

    if (liveWebhook) {
      reasons.push('Live Webhook Secret configured for automated payment verification');
    } else {
      blockers.push('Live Webhook Secret is missing');
    }

    const isReady = blockers.length === 0;

    const appUrl = process.env.APP_URL || '';
    const webhookUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/api/payments/webhook` : '/api/payments/webhook';

    return {
      gateway: 'Razorpay',
      mode: this.mode,
      connectionStatus: this.lastConnectionStatus,
      connectionMessage: this.lastConnectionMessage,
      activeKeyIdMasked: maskKeyId(activeKeyId),
      hasActiveSecret: Boolean(activeSecret && activeSecret.length > 5),
      hasActiveWebhook: Boolean(activeWebhook && activeWebhook.length > 5),
      testConfig: {
        keyIdMasked: maskKeyId(testKeyId),
        hasKeyId: Boolean(testKeyId && testKeyId.length > 5),
        hasSecret: Boolean(testSecret && testSecret.length > 5),
        hasWebhook: Boolean(testWebhook && testWebhook.length > 5),
      },
      liveConfig: {
        keyIdMasked: maskKeyId(liveKeyId),
        hasKeyId: Boolean(liveKeyId && liveKeyId.length > 5),
        hasSecret: Boolean(liveSecret && liveSecret.length > 5),
        hasWebhook: Boolean(liveWebhook && liveWebhook.length > 5),
      },
      productionReadiness: {
        isReady,
        reasons,
        blockers,
      },
      webhookUrl,
      activePlans: adminStore.plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        promotionalPrice: p.promotionalPrice,
        currency: p.currency,
        credits: p.credits,
        billingPeriod: p.billingPeriod,
      })),
    };
  }
}

export const paymentConfigService = new PaymentConfigService();
