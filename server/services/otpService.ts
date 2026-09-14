import crypto from 'crypto';
import nodemailer from 'nodemailer';

const SESSION_SECRET = process.env.SESSION_SECRET || 'vastuvision_secure_hmac_key_2026_production';

export interface OtpRecord {
  identifier: string; // phone number or email address
  type: 'mobile' | 'email';
  hash?: string; // HMAC-SHA256 hash of OTP (for email or self-verified OTPs)
  reqId?: string; // MSG91 widget request ID if widget used
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  lastSentAt: number;
  sendCount: number;
  firstSentInWindow: number;
}

// In-memory active OTP registry (hashed, with auto-purge)
const otpStore = new Map<string, OtpRecord>();

// IP-based rate limiting for OTP requests (max 10 requests per hour per IP)
interface IpRateLimit {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, IpRateLimit>();

// Clean up expired OTPs every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt + 60000) {
      otpStore.delete(key);
    }
  }
  for (const [ip, limit] of ipRateLimits.entries()) {
    if (now > limit.resetAt) {
      ipRateLimits.delete(ip);
    }
  }
}, 2 * 60 * 1000);

/**
 * Format and validate mobile numbers for Indian (+91) and international use with MSG91
 */
export function formatMobileForMsg91(rawMobile: string): {
  formatted: string;
  isValid: boolean;
  display: string;
} {
  let cleaned = rawMobile.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);

  // If 10 digits (typical Indian mobile), prepend country code 91
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  // Valid international format (11 to 15 digits)
  const isValid = /^\d{11,15}$/.test(cleaned);
  const display =
    cleaned.startsWith('91') && cleaned.length === 12
      ? `+91 ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`
      : `+${cleaned}`;

  return {
    formatted: cleaned,
    isValid,
    display,
  };
}

/**
 * Hash an OTP using HMAC-SHA256 for secure verification
 */
function hashOtp(otp: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(otp.trim()).digest('hex');
}

/**
 * Check IP rate limiting
 */
function checkIpRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  if (!limit || now > limit.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true };
  }

  if (limit.count >= 15) {
    const waitSeconds = Math.ceil((limit.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  limit.count++;
  return { allowed: true };
}

/**
 * Check identifier rate limiting & cooldown
 */
function checkIdentifierRateLimit(identifier: string): {
  allowed: boolean;
  error?: string;
  cooldownSeconds?: number;
} {
  const now = Date.now();
  const existing = otpStore.get(identifier);

  if (existing) {
    // 60-second cooldown between resends
    const elapsedSinceLastSend = (now - existing.lastSentAt) / 1000;
    if (elapsedSinceLastSend < 60) {
      const cooldownSeconds = Math.ceil(60 - elapsedSinceLastSend);
      return {
        allowed: false,
        cooldownSeconds,
        error: `Please wait ${cooldownSeconds} seconds before requesting a new OTP.`,
      };
    }

    // 10-minute sliding window: max 4 OTP sends
    if (now - existing.firstSentInWindow < 10 * 60 * 1000) {
      if (existing.sendCount >= 4) {
        const resetInMinutes = Math.ceil((existing.firstSentInWindow + 10 * 60 * 1000 - now) / 60000);
        return {
          allowed: false,
          error: `Too many OTP requests. Please try again in ${resetInMinutes} minutes.`,
        };
      }
    } else {
      // Reset sliding window
      existing.firstSentInWindow = now;
      existing.sendCount = 0;
    }
  }

  return { allowed: true };
}

// ============================================================================
// MOBILE OTP VIA MSG91
// ============================================================================

export interface Msg91ConfigStatus {
  configured: boolean;
  hasAuthKey: boolean;
  hasTemplateId: boolean;
  hasWidgetId: boolean;
  hasSenderId: boolean;
  authKeyName?: string;
}

export function getMsg91Config(): {
  authKey: string | null;
  templateId: string | null;
  widgetId: string | null;
  senderId: string | null;
} {
  const authKey =
    process.env.MSG91_AUTH_KEY ||
    process.env.MSG91_KEY ||
    process.env.AUTH_KEY ||
    null;

  const templateId =
    process.env.MSG91_TEMPLATE_ID ||
    process.env.MSG91_OTP_TEMPLATE_ID ||
    process.env.MSG91_FLOW_ID ||
    null;

  const widgetId = process.env.MSG91_WIDGET_ID || null;
  const senderId = process.env.MSG91_SENDER_ID || null;

  return { authKey, templateId, widgetId, senderId };
}

export function getMsg91Status(): Msg91ConfigStatus {
  const config = getMsg91Config();
  const configured = Boolean(config.authKey && (config.templateId || config.widgetId));
  return {
    configured,
    hasAuthKey: !!config.authKey,
    hasTemplateId: !!config.templateId,
    hasWidgetId: !!config.widgetId,
    hasSenderId: !!config.senderId,
    authKeyName: process.env.MSG91_AUTH_KEY
      ? 'MSG91_AUTH_KEY'
      : process.env.MSG91_KEY
      ? 'MSG91_KEY'
      : process.env.AUTH_KEY
      ? 'AUTH_KEY'
      : undefined,
  };
}

/**
 * Send real Mobile OTP using MSG91
 */
export async function sendMobileOtp(
  rawMobile: string,
  clientIp: string
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number; displayMobile?: string }> {
  const { formatted, isValid, display } = formatMobileForMsg91(rawMobile);
  if (!isValid) {
    return {
      success: false,
      error: 'Please enter a valid 10-digit Indian mobile number or international phone number.',
    };
  }

  // Check IP rate limit
  const ipCheck = checkIpRateLimit(clientIp);
  if (!ipCheck.allowed) {
    return {
      success: false,
      error: `Too many OTP requests from your network. Please try again in ${Math.ceil((ipCheck.waitSeconds || 60) / 60)} minutes.`,
    };
  }

  // Check Identifier rate limit / cooldown
  const idCheck = checkIdentifierRateLimit(formatted);
  if (!idCheck.allowed) {
    return {
      success: false,
      error: idCheck.error,
      cooldownSeconds: idCheck.cooldownSeconds,
    };
  }

  const { authKey, templateId, widgetId, senderId } = getMsg91Config();

  if (!authKey) {
    return {
      success: false,
      error:
        'Mobile verification service is not configured yet. MSG91_AUTH_KEY is required in server environment secrets.',
    };
  }

  // Under TRAI DLT regulations in India, telecom operators reject SMS dispatched without an approved DLT Template ID
  if (!templateId && !widgetId) {
    return {
      success: false,
      error:
        'MSG91_TEMPLATE_ID is missing. TRAI DLT regulations in India require an approved DLT Template ID mapped to MSG91 to deliver SMS OTP to mobile numbers. Please add MSG91_TEMPLATE_ID (or MSG91_WIDGET_ID) in AI Studio Secrets.',
    };
  }

  try {
    let reqId: string | undefined;

    if (widgetId) {
      // MSG91 OTP Widget API
      const widgetUrl = 'https://api.msg91.com/api/v5/widget/sendOtp';
      const response = await fetch(widgetUrl, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetId,
          identifier: formatted,
          otp_length: 6,
          otp_expiry: 5,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.type === 'error' || data.status === 'fail' || data.hasError) {
        const errMsg = data.message || data.error || 'Failed to send SMS OTP via MSG91 widget.';
        console.error('[MSG91 Widget Error]', { status: response.status, data });
        return { success: false, error: errMsg };
      }
      reqId = data.reqId || data.request_id;
      console.log('[MSG91 Widget Accepted]', {
        reqId,
        mobileMasked: formatted.slice(0, 4) + '****' + formatted.slice(-2),
      });
    } else {
      // MSG91 Standard v5 OTP API
      const params = new URLSearchParams({
        template_id: templateId!,
        mobile: formatted,
        authkey: authKey,
        otp_length: '6',
        otp_expiry: '5', // 5 minutes
      });
      if (senderId) {
        params.append('sender', senderId);
      }

      const url = `https://control.msg91.com/api/v5/otp?${params.toString()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.type === 'error' || data.status === 'fail' || data.hasError) {
        const errMsg = data.message || data.error || 'Failed to send SMS OTP via MSG91.';
        console.error('[MSG91 Send Rejection]', { status: response.status, data });
        return { success: false, error: errMsg };
      }
      reqId = data.request_id || data.reqId;
      console.log('[MSG91 OTP Dispatched]', {
        requestId: reqId,
        type: data.type,
        mobileMasked: formatted.slice(0, 4) + '****' + formatted.slice(-2),
      });
    }

    // Update or create active OTP record
    const now = Date.now();
    const existing = otpStore.get(formatted);
    otpStore.set(formatted, {
      identifier: formatted,
      type: 'mobile',
      reqId,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      maxAttempts: 5,
      lastSentAt: now,
      sendCount: (existing?.sendCount || 0) + 1,
      firstSentInWindow: existing?.firstSentInWindow || now,
    });

    return {
      success: true,
      displayMobile: display,
      cooldownSeconds: 60,
    };
  } catch (err: any) {
    console.error('[MSG91] Error sending SMS OTP:', err);
    return {
      success: false,
      error: 'Network error communicating with MSG91 SMS gateway. Please try again.',
    };
  }
}

/**
 * Verify Mobile OTP with MSG91
 */
export async function verifyMobileOtp(
  rawMobile: string,
  otpCode: string
): Promise<{ success: boolean; error?: string; formattedMobile?: string }> {
  const { formatted, isValid } = formatMobileForMsg91(rawMobile);
  if (!isValid) {
    return { success: false, error: 'Invalid mobile number format.' };
  }

  const cleanOtp = otpCode.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { success: false, error: 'Please enter a valid 6-digit OTP.' };
  }

  const record = otpStore.get(formatted);
  if (!record) {
    return {
      success: false,
      error: 'OTP expired or not found. Please request a new OTP.',
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(formatted);
    return {
      success: false,
      error: 'OTP expired. Please request a new OTP.',
    };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(formatted);
    return {
      success: false,
      error: 'Too many incorrect attempts. Please request a new OTP.',
    };
  }

  record.attempts++;

  const { authKey, widgetId } = getMsg91Config();
  if (!authKey) {
    return {
      success: false,
      error: 'MSG91 service configuration missing. Please set MSG91_AUTH_KEY.',
    };
  }

  try {
    if (widgetId && record.reqId) {
      // MSG91 Widget verification
      const verifyUrl = 'https://api.msg91.com/api/v5/widget/verifyOtp';
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetId,
          reqId: record.reqId,
          otp: cleanOtp,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.type === 'error' || data.message?.toLowerCase().includes('fail')) {
        return {
          success: false,
          error: data.message || 'Incorrect OTP. Please try again.',
        };
      }
    } else {
      // MSG91 Standard v5 OTP verification
      const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(cleanOtp)}&mobile=${formatted}&authkey=${encodeURIComponent(authKey)}`;
      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          authkey: authKey,
        },
      });

      const data = await response.json().catch(() => ({}));
      console.log('[MSG91 Verify Response]', {
        type: data.type,
        message: data.message,
        code: data.code,
      });
      const isSuccess =
        response.ok &&
        (data.type === 'success' ||
          data.message?.toLowerCase().includes('success') ||
          data.message?.toLowerCase().includes('verified') ||
          data.message?.toLowerCase().includes('already verified'));

      if (!isSuccess) {
        return {
          success: false,
          error: data.message || 'Incorrect OTP code. Please try again.',
        };
      }
    }

    // Verification succeeded: remove from store
    otpStore.delete(formatted);
    return {
      success: true,
      formattedMobile: formatted,
    };
  } catch (err: any) {
    console.error('[MSG91] Error verifying SMS OTP:', err);
    return {
      success: false,
      error: 'Failed to verify OTP with MSG91. Please try again.',
    };
  }
}

/**
 * Resend Mobile OTP via MSG91
 */
export async function resendMobileOtp(
  rawMobile: string,
  clientIp: string
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> {
  return sendMobileOtp(rawMobile, clientIp);
}

// ============================================================================
// EMAIL OTP VIA REAL TRANSACTIONAL EMAIL PROVIDERS
// ============================================================================

export interface EmailConfigStatus {
  configured: boolean;
  provider: 'resend' | 'sendgrid' | 'postmark' | 'smtp' | null;
}

export function getEmailConfigStatus(): EmailConfigStatus {
  if (process.env.RESEND_API_KEY) return { configured: true, provider: 'resend' };
  if (process.env.SENDGRID_API_KEY) return { configured: true, provider: 'sendgrid' };
  if (process.env.POSTMARK_SERVER_TOKEN) return { configured: true, provider: 'postmark' };
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return { configured: true, provider: 'smtp' };
  return { configured: false, provider: null };
}

function getEmailOtpTemplate(otp: string, name?: string): string {
  const recipientName = name ? name.trim() : 'Vastu Visionary';
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your VastuVision AI Verification Code</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f7f5f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f5f0; padding: 30px 15px;">
      <tr>
        <td align="center">
          <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7e5e4; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 28px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">VastuVision AI</h1>
                <p style="margin: 6px 0 0 0; color: #fef3c7; font-size: 13px; font-weight: 500;">Sacred Architecture & Intelligent Space Harmony</p>
              </td>
            </tr>
            <!-- Main Content -->
            <tr>
              <td style="padding: 36px 32px 28px 32px;">
                <h2 style="margin: 0 0 12px 0; color: #1c1917; font-size: 20px; font-weight: 700;">Namaste, ${recipientName}</h2>
                <p style="margin: 0 0 24px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                  Use the following 6-digit verification code to complete your secure registration or login to VastuVision AI.
                </p>

                <!-- OTP Code Display -->
                <div style="background-color: #fef3c7; border: 1.5px dashed #d97706; border-radius: 16px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #92400e;">${otp}</span>
                </div>

                <p style="margin: 0 0 8px 0; color: #78716c; font-size: 13px; line-height: 1.5;">
                  ⏱️ This verification code expires in <strong>5 minutes</strong>.
                </p>
                <p style="margin: 0 0 24px 0; color: #78716c; font-size: 13px; line-height: 1.5;">
                  🔒 If you did not request this verification code, please ignore this email. Never share your OTP with anyone.
                </p>

                <!-- Free Plan Included Badge -->
                <div style="background-color: #fafaf9; border-radius: 12px; padding: 14px 18px; border: 1px solid #e7e5e4;">
                  <p style="margin: 0; color: #292524; font-size: 13px; font-weight: 600;">
                    🎁 Included with your account:
                  </p>
                  <p style="margin: 4px 0 0 0; color: #78716c; font-size: 12px;">
                    5 Free AI Consultations + 5 Room Photo Analyses to harmonize your home.
                  </p>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 30px; text-align: center;">
                <p style="margin: 0; color: #a8a29e; font-size: 11px;">
                  © ${new Date().getFullYear()} VastuVision AI. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Send real Email OTP using configured transactional provider (Resend, SendGrid, Postmark, SMTP)
 */
export async function sendEmailOtp(
  rawEmail: string,
  clientIp: string,
  userName?: string
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number; configured?: boolean }> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // Check IP rate limit
  const ipCheck = checkIpRateLimit(clientIp);
  if (!ipCheck.allowed) {
    return {
      success: false,
      error: `Too many OTP requests from your network. Please try again in ${Math.ceil((ipCheck.waitSeconds || 60) / 60)} minutes.`,
    };
  }

  // Check Identifier rate limit / cooldown
  const idCheck = checkIdentifierRateLimit(cleanEmail);
  if (!idCheck.allowed) {
    return {
      success: false,
      error: idCheck.error,
      cooldownSeconds: idCheck.cooldownSeconds,
    };
  }

  const { configured, provider } = getEmailConfigStatus();
  if (!configured || !provider) {
    return {
      success: false,
      configured: false,
      error: 'Email verification service is not configured yet.',
    };
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const fromEmail = process.env.EMAIL_FROM || 'VastuVision AI <verify@vastuvision.ai>';
  const subject = `Your VastuVision AI Verification Code: ${otp}`;
  const htmlContent = getEmailOtpTemplate(otp, userName);

  try {
    if (provider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'VastuVision AI <onboarding@resend.dev>',
          to: [cleanEmail],
          subject,
          html: htmlContent,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: resData.message || 'Failed to dispatch email via Resend.',
        };
      }
    } else if (provider === 'sendgrid') {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: cleanEmail }] }],
          from: { email: fromEmail.replace(/.*<([^>]+)>.*/, '$1'), name: 'VastuVision AI' },
          subject,
          content: [{ type: 'text/html', value: htmlContent }],
        }),
      });

      if (!res.ok) {
        const resText = await res.text().catch(() => '');
        return {
          success: false,
          error: `Failed to dispatch email via SendGrid: ${resText || res.statusText}`,
        };
      }
    } else if (provider === 'postmark') {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: fromEmail,
          To: cleanEmail,
          Subject: subject,
          HtmlBody: htmlContent,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: resData.Message || 'Failed to dispatch email via Postmark.',
        };
      }
    } else if (provider === 'smtp') {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: fromEmail,
        to: cleanEmail,
        subject,
        html: htmlContent,
      });
    }

    // Save hashed OTP in store
    const now = Date.now();
    const existing = otpStore.get(cleanEmail);
    otpStore.set(cleanEmail, {
      identifier: cleanEmail,
      type: 'email',
      hash: hashOtp(otp),
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      maxAttempts: 5,
      lastSentAt: now,
      sendCount: (existing?.sendCount || 0) + 1,
      firstSentInWindow: existing?.firstSentInWindow || now,
    });

    return {
      success: true,
      cooldownSeconds: 60,
    };
  } catch (err: any) {
    console.error('[EmailOTP] Failed to send email OTP:', err);
    return {
      success: false,
      error: `Failed to send email OTP: ${err.message || 'Service unreachable'}`,
    };
  }
}

/**
 * Verify Email OTP against stored HMAC-SHA256 hash
 */
export async function verifyEmailOtp(
  rawEmail: string,
  otpCode: string
): Promise<{ success: boolean; error?: string; cleanEmail?: string }> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanOtp = otpCode.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return { success: false, error: 'Please enter a valid 6-digit OTP.' };
  }

  const record = otpStore.get(cleanEmail);
  if (!record || record.type !== 'email' || !record.hash) {
    return {
      success: false,
      error: 'OTP expired or not found. Please request a new OTP.',
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return {
      success: false,
      error: 'OTP expired. Please request a new OTP.',
    };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(cleanEmail);
    return {
      success: false,
      error: 'Too many incorrect attempts. Please request a new OTP.',
    };
  }

  record.attempts++;

  // Constant-time hash verification
  const inputHash = hashOtp(cleanOtp);
  const isValid = crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(record.hash, 'hex'));

  if (!isValid) {
    return {
      success: false,
      error: 'Incorrect OTP. Please try again.',
    };
  }

  // Verification succeeded: delete record
  otpStore.delete(cleanEmail);
  return {
    success: true,
    cleanEmail,
  };
}

/**
 * Resend Email OTP (enforces rate limit and cooldown)
 */
export async function resendEmailOtp(
  rawEmail: string,
  clientIp: string,
  userName?: string
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number; configured?: boolean }> {
  return sendEmailOtp(rawEmail, clientIp, userName);
}
