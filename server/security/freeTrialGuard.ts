import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DeviceTrialRecord {
  deviceId: string;
  firstSeenAt: number;
  lastSeenAt: number;
  registeredUserIds: string[];
  registeredEmails: string[];
  freeTrialsClaimed: number;
  isFlaggedAbusive: boolean;
  abuseReasons: string[];
}

export interface CanonicalEmailRecord {
  canonicalEmail: string;
  firstSeenAt: number;
  associatedUserIds: string[];
  freeTrialClaimed: boolean;
}

// Popular disposable email domains blocklist
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.net',
  'dispostable.com',
  'fakeinbox.com',
  'sharklasers.com',
  'generator.email',
  'throwawaymail.com',
  'getnada.com',
  'mohmal.com',
  'inboxbear.com',
  'burnermail.io',
  'mytemp.email',
  'crazymailing.com',
  'dropmail.me',
  'harakirimail.com',
  'maildrop.cc',
  'emailondeck.com',
  'tempail.com',
  'fakemailgenerator.com',
]);

const IP_REGISTRATION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REGISTRATIONS_PER_IP_WINDOW = 4; // allows genuine family/roommates on same Wi-Fi, prevents bots

class FreeTrialAbuseGuard {
  private deviceRegistry = new Map<string, DeviceTrialRecord>();
  private canonicalEmailRegistry = new Map<string, CanonicalEmailRecord>();
  private googleSubRegistry = new Map<string, string>(); // sub -> userId
  private ipRegistrations = new Map<string, number[]>(); // ip -> timestamps
  private storageFile = path.join(process.cwd(), 'data', 'abuse_prevention_store.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.deviceRegistry) {
          this.deviceRegistry = new Map(Object.entries(parsed.deviceRegistry));
        }
        if (parsed.canonicalEmailRegistry) {
          this.canonicalEmailRegistry = new Map(Object.entries(parsed.canonicalEmailRegistry));
        }
        if (parsed.googleSubRegistry) {
          this.googleSubRegistry = new Map(Object.entries(parsed.googleSubRegistry));
        }
      }
    } catch (err) {
      console.warn('[FreeTrialAbuseGuard] Initializing fresh abuse registry:', err);
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        deviceRegistry: Object.fromEntries(this.deviceRegistry.entries()),
        canonicalEmailRegistry: Object.fromEntries(this.canonicalEmailRegistry.entries()),
        googleSubRegistry: Object.fromEntries(this.googleSubRegistry.entries()),
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[FreeTrialAbuseGuard] Error saving to disk:', err);
    }
  }

  /**
   * Normalizes email to canonical representation
   * Removes '+' tags and dots for Gmail/Googlemail
   */
  public getCanonicalEmail(email: string): { canonical: string; isDisposable: boolean; domain: string } {
    const clean = email.trim().toLowerCase();
    const parts = clean.split('@');
    if (parts.length !== 2) {
      return { canonical: clean, isDisposable: false, domain: '' };
    }

    let [local, domain] = parts;
    const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);

    // Normalize Gmail / Googlemail
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      domain = 'gmail.com';
      local = local.replace(/\./g, ''); // strip dots
      local = local.split('+')[0]; // strip + alias
    } else {
      // Standard plus addressing strip
      local = local.split('+')[0];
    }

    return {
      canonical: `${local}@${domain}`,
      isDisposable,
      domain,
    };
  }

  /**
   * Extracts or computes a stable client device fingerprint
   */
  public resolveDeviceId(headers: Record<string, any>, cookies: Record<string, any>, clientIp: string): string {
    // 1. Explicit persistent device ID passed by frontend client
    const headerDeviceId = headers['x-device-id'];
    if (typeof headerDeviceId === 'string' && headerDeviceId.trim().length >= 8) {
      return headerDeviceId.trim();
    }

    // 2. Cookie persistent device ID
    const cookieDeviceId = cookies['vv_device_id'];
    if (typeof cookieDeviceId === 'string' && cookieDeviceId.trim().length >= 8) {
      return cookieDeviceId.trim();
    }

    // 3. Fallback: Synthetic device cluster hash from User-Agent + Accept-Language
    const userAgent = headers['user-agent'] || 'unknown_ua';
    const acceptLang = headers['accept-language'] || 'unknown_lang';
    const ipSubnet = clientIp.includes('.') ? clientIp.split('.').slice(0, 3).join('.') : clientIp;

    return 'dev_' + crypto.createHash('sha256').update(`${userAgent}_${acceptLang}_${ipSubnet}`).digest('hex').slice(0, 24);
  }

  /**
   * Evaluates a new account registration against rate limits and abuse signals
   */
  public evaluateRegistration(params: {
    email: string;
    deviceId: string;
    clientIp: string;
    isGoogleVerified?: boolean;
    googleSub?: string;
  }): {
    allowed: boolean;
    grantFreeTrial: boolean;
    freeChatMinutes: number;
    freePhotos: number;
    abuseDetected: boolean;
    abuseReason?: string;
    userMessage?: string;
    errorCode?: string;
  } {
    const { email, deviceId, clientIp, isGoogleVerified, googleSub } = params;

    // 1. Check IP Burst Throttle (Multiple accounts in quick succession from 1 IP)
    const now = Date.now();
    const timestamps = this.ipRegistrations.get(clientIp) || [];
    const recentTimestamps = timestamps.filter((t) => now - t < IP_REGISTRATION_WINDOW_MS);

    if (recentTimestamps.length >= MAX_REGISTRATIONS_PER_IP_WINDOW) {
      return {
        allowed: false,
        grantFreeTrial: false,
        freeChatMinutes: 0,
        freePhotos: 0,
        abuseDetected: true,
        abuseReason: 'IP_REGISTRATION_FREQUENCY_EXCEEDED',
        errorCode: 'REGISTRATION_THROTTLED',
        userMessage: 'Too many account registrations from this network in a short time. Please wait a while before trying again, or log in to your existing account.',
      };
    }

    // 2. Check Disposable Email
    const { canonical, isDisposable } = this.getCanonicalEmail(email);
    if (isDisposable) {
      return {
        allowed: false,
        grantFreeTrial: false,
        freeChatMinutes: 0,
        freePhotos: 0,
        abuseDetected: true,
        abuseReason: 'DISPOSABLE_EMAIL_DOMAIN',
        errorCode: 'DISPOSABLE_EMAIL_NOT_ALLOWED',
        userMessage: 'Please provide a permanent personal or business email address to create your account.',
      };
    }

    // 3. Check Canonical Email Reuse
    const existingCanonical = this.canonicalEmailRegistry.get(canonical);
    if (existingCanonical && existingCanonical.freeTrialClaimed) {
      // User registered with alias e.g. user+test1@gmail.com after user@gmail.com
      return {
        allowed: true,
        grantFreeTrial: false,
        freeChatMinutes: 0,
        freePhotos: 0,
        abuseDetected: true,
        abuseReason: 'CANONICAL_EMAIL_ALREADY_USED',
        userMessage: 'A free trial has already been allocated to this email address. Please upgrade to PRO (₹99) to unlock more Vastu credits.',
      };
    }

    // 4. Check Google Account Identity (if Google Login)
    if (isGoogleVerified && googleSub) {
      const existingGoogleUser = this.googleSubRegistry.get(googleSub);
      if (existingGoogleUser) {
        return {
          allowed: true,
          grantFreeTrial: false,
          freeChatMinutes: 0,
          freePhotos: 0,
          abuseDetected: true,
          abuseReason: 'GOOGLE_SUB_ALREADY_USED',
          userMessage: 'This Google account has already claimed its initial free trial credits.',
        };
      }
    }

    // 5. Check Device / Session Abuse Signals
    const deviceRecord = this.deviceRegistry.get(deviceId);
    if (deviceRecord && deviceRecord.freeTrialsClaimed >= 1) {
      // Device has already claimed 1 free trial.
      // Allow account creation so user isn't locked out of creating credentials,
      // but STRICTLY DO NOT give another 5+5 free trial!
      return {
        allowed: true,
        grantFreeTrial: false,
        freeChatMinutes: 0,
        freePhotos: 0,
        abuseDetected: true,
        abuseReason: 'DEVICE_ALREADY_CLAIMED_FREE_TRIAL',
        userMessage: 'इस डिवाइस पर पहले से ही 5 निःशुल्क वास्तु परामर्श उपयोग किए जा चुके हैं। असीमित परामर्श और 3D वास्तु उपचारों के लिए कृपया प्रो प्लान (₹99) पर अपग्रेड करें।',
      };
    }

    // Legitimate New Account: Grant full free trial
    return {
      allowed: true,
      grantFreeTrial: true,
      freeChatMinutes: 5,
      freePhotos: 5,
      abuseDetected: false,
    };
  }

  /**
   * Records a successfully registered user and binds device and canonical email records
   */
  public recordAccountCreation(params: {
    userId: string;
    email: string;
    deviceId: string;
    clientIp: string;
    grantFreeTrial: boolean;
    isGoogleVerified?: boolean;
    googleSub?: string;
    abuseReason?: string;
  }) {
    const { userId, email, deviceId, clientIp, grantFreeTrial, isGoogleVerified, googleSub, abuseReason } = params;
    const now = Date.now();

    // 1. Record IP timestamp
    const timestamps = this.ipRegistrations.get(clientIp) || [];
    timestamps.push(now);
    this.ipRegistrations.set(clientIp, timestamps);

    // 2. Record Canonical Email
    const { canonical } = this.getCanonicalEmail(email);
    const existingCanonical = this.canonicalEmailRegistry.get(canonical);
    if (existingCanonical) {
      existingCanonical.associatedUserIds.push(userId);
      if (grantFreeTrial) existingCanonical.freeTrialClaimed = true;
    } else {
      this.canonicalEmailRegistry.set(canonical, {
        canonicalEmail: canonical,
        firstSeenAt: now,
        associatedUserIds: [userId],
        freeTrialClaimed: grantFreeTrial,
      });
    }

    // 3. Record Google Sub
    if (isGoogleVerified && googleSub) {
      this.googleSubRegistry.set(googleSub, userId);
    }

    // 4. Record Device
    let dev = this.deviceRegistry.get(deviceId);
    if (!dev) {
      dev = {
        deviceId,
        firstSeenAt: now,
        lastSeenAt: now,
        registeredUserIds: [userId],
        registeredEmails: [email],
        freeTrialsClaimed: grantFreeTrial ? 1 : 0,
        isFlaggedAbusive: !grantFreeTrial,
        abuseReasons: abuseReason ? [abuseReason] : [],
      };
      this.deviceRegistry.set(deviceId, dev);
    } else {
      dev.lastSeenAt = now;
      if (!dev.registeredUserIds.includes(userId)) dev.registeredUserIds.push(userId);
      if (!dev.registeredEmails.includes(email)) dev.registeredEmails.push(email);
      if (grantFreeTrial) {
        dev.freeTrialsClaimed += 1;
      } else if (abuseReason && !dev.abuseReasons.includes(abuseReason)) {
        dev.isFlaggedAbusive = true;
        dev.abuseReasons.push(abuseReason);
      }
    }

    this.saveToDisk();
  }
}

export const freeTrialGuard = new FreeTrialAbuseGuard();
