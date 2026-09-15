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
 * Format and validate mobile numbers for Indian (+91) and international use
 */
export function formatMobileNumber(rawMobile: string): {
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

// Backwards compatibility alias
export const formatMobileForMsg91 = formatMobileNumber;

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
// MOBILE OTP VIA APITXT (apitxt.com - REAL SMS GATEWAY)
// ============================================================================

export interface ApitxtConfigStatus {
  configured: boolean;
  hasApiKey: boolean;
  provider: 'apitxt';
  channel: string;
  senderId?: string | null;
}

export function getApitxtConfig(): {
  apiKey: string | null;
  channel: string;
  senderId: string | null;
  otpExpiryMinutes: number;
} {
  const apiKey =
    process.env.APITXT_API_KEY ||
    process.env.APITXT_AUTHKEY ||
    process.env.APITXT_KEY ||
    process.env.MSG91_AUTHKEY ||
    null;

  const channel = process.env.APITXT_CHANNEL || 'sms';
  const senderId = process.env.APITXT_SENDER_ID || null;

  let otpExpiryMinutes = 5;
  if (process.env.OTP_EXPIRY_SECONDS) {
    const rawVal = Number(process.env.OTP_EXPIRY_SECONDS);
    if (!isNaN(rawVal) && rawVal > 0) {
      otpExpiryMinutes = Math.max(1, Math.round(rawVal / 60));
    }
  }

  return { apiKey, channel, senderId, otpExpiryMinutes };
}

export function getApitxtStatus(): ApitxtConfigStatus {
  const config = getApitxtConfig();
  return {
    configured: Boolean(config.apiKey),
    hasApiKey: Boolean(config.apiKey),
    provider: 'apitxt',
    channel: config.channel,
    senderId: config.senderId,
  };
}

// Backwards compatibility for previous MSG91 status callers
export function getMsg91Status() {
  const status = getApitxtStatus();
  return {
    configured: status.configured,
    hasAuthKey: status.hasApiKey,
    hasTemplateId: false,
    hasWidgetId: false,
    hasSenderId: Boolean(status.senderId),
    testMode: false,
    provider: 'apitxt',
  };
}

/**
 * Send real Mobile OTP using APITxT (https://apitxt.com/api/sendOTP)
 */
export async function sendMobileOtp(
  rawMobile: string,
  clientIp: string
): Promise<{
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
  displayMobile?: string;
  message?: string;
}> {
  const { formatted, isValid, display } = formatMobileNumber(rawMobile);
  if (!isValid) {
    return {
      success: false,
      error: 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (+91)।',
    };
  }

  // Check IP rate limit (15 requests per hour per IP)
  const ipCheck = checkIpRateLimit(clientIp);
  if (!ipCheck.allowed) {
    return {
      success: false,
      error: `आपके नेटवर्क से बहुत अधिक OTP अनुरोध भेजे गए हैं। कृपया ${Math.ceil((ipCheck.waitSeconds || 60) / 60)} मिनट बाद पुनः प्रयास करें।`,
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

  const { apiKey, channel, otpExpiryMinutes } = getApitxtConfig();

  if (!apiKey) {
    return {
      success: false,
      error: 'APITxT सेवा अभी कॉन्फ़िगर नहीं है। कृपया सर्वर में APITXT_API_KEY जोड़ें।',
    };
  }

  // Generate real cryptographically secure 6-digit OTP code (never hardcoded or exposed)
  const otpCode = crypto.randomInt(100000, 1000000).toString();

  try {
    const response = await fetch('https://apitxt.com/api/sendOTP', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authkey: apiKey,
        mobile: formatted,
        otp: otpCode,
        channel: channel || 'sms',
      }),
    });

    const data = await response.json().catch(() => ({}));

    // Check for APITxT rate limiting (e.g. 15s restriction per number)
    if (response.status === 429 || data.code === 429) {
      return {
        success: false,
        cooldownSeconds: 15,
        error: 'कृपया इस मोबाइल नंबर पर पुनः OTP अनुरोध करने से पहले 15 सेकंड प्रतीक्षा करें।',
      };
    }

    const isSuccess = response.ok && (data.status === 'success' || data.type === 'success');

    if (!isSuccess) {
      console.error('[APITxT Send Rejection]', { status: response.status, data });
      const errMsg =
        data.message ||
        data.error ||
        'APITxT SMS गेटवे से SMS भेजने में विफलता हुई। कृपया APITxT बैलेंस व सेटिंग्स जाँचें।';
      return {
        success: false,
        error: errMsg,
      };
    }

    const reqId = data.data?.request_id || data.request_id;
    console.log('[APITxT SMS Dispatched]', {
      requestId: reqId,
      mobileMasked: formatted.slice(0, 4) + '****' + formatted.slice(-2),
      status: data.status,
    });

    // Store HMAC-SHA256 hash in memory registry (NEVER plain text OTP!)
    const now = Date.now();
    const existing = otpStore.get(formatted);
    const hashed = hashOtp(otpCode);

    otpStore.set(formatted, {
      identifier: formatted,
      type: 'mobile',
      hash: hashed,
      reqId,
      expiresAt: now + otpExpiryMinutes * 60 * 1000,
      attempts: 0,
      maxAttempts: 3,
      lastSentAt: now,
      sendCount: (existing?.sendCount || 0) + 1,
      firstSentInWindow: existing?.firstSentInWindow || now,
    });

    return {
      success: true,
      displayMobile: display,
      cooldownSeconds: 60,
      message: `OTP सफलतापूर्वक आपके मोबाइल नंबर ${display} पर SMS द्वारा भेज दिया गया है।`,
    };
  } catch (err: any) {
    console.error('[APITxT Network Error]:', err);
    return {
      success: false,
      error: 'APITxT SMS गेटवे के साथ नेटवर्क समस्या हुई। कृपया पुनः प्रयास करें।',
    };
  }
}

/**
 * Verify Mobile OTP and enforce 3-attempts limit
 */
export async function verifyMobileOtp(
  rawMobile: string,
  otpCode: string
): Promise<{
  success: boolean;
  error?: string;
  formattedMobile?: string;
  attemptsRemaining?: number;
}> {
  const { formatted, isValid } = formatMobileNumber(rawMobile);
  if (!isValid) {
    return { success: false, error: 'अमान्य मोबाइल नंबर प्रारूप।' };
  }

  const cleanOtp = otpCode.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { success: false, error: 'कृपया 6 अंकों का मान्य OTP कोड दर्ज करें।' };
  }

  const record = otpStore.get(formatted);
  if (!record || record.type !== 'mobile' || !record.hash) {
    return {
      success: false,
      error: 'OTP की समय सीमा समाप्त हो गई है या अमान्य है। कृपया नया OTP मांगें।',
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(formatted);
    return {
      success: false,
      error: 'OTP की समय सीमा समाप्त हो गई है (Expired)। कृपया नया OTP मांगें।',
    };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(formatted);
    return {
      success: false,
      error: 'अधिकतम 3 गलत कोशिशें! सुरक्षा कारणों से यह OTP रद्द कर दिया गया है। कृपया नया OTP मांगें।',
      attemptsRemaining: 0,
    };
  }

  record.attempts++;

  // Timing-safe HMAC-SHA256 comparison to prevent side-channel timing attacks
  const inputHash = hashOtp(cleanOtp);
  let isMatch = false;
  try {
    const bufInput = Buffer.from(inputHash, 'hex');
    const bufStored = Buffer.from(record.hash, 'hex');
    if (bufInput.length === bufStored.length) {
      isMatch = crypto.timingSafeEqual(bufInput, bufStored);
    }
  } catch {
    isMatch = false;
  }

  if (isMatch) {
    // Delete OTP record immediately upon successful verification
    otpStore.delete(formatted);
    return {
      success: true,
      formattedMobile: formatted,
    };
  } else {
    const remaining = Math.max(0, record.maxAttempts - record.attempts);
    if (remaining === 0) {
      otpStore.delete(formatted);
      return {
        success: false,
        error: 'अधिकतम 3 गलत कोशिशें! सुरक्षा कारणों से यह OTP रद्द कर दिया गया है। कृपया नया OTP मांगें।',
        attemptsRemaining: 0,
      };
    }
    return {
      success: false,
      error: `गलत OTP कोड दर्ज किया गया। आपके पास ${remaining} कोशिश शेष है।`,
      attemptsRemaining: remaining,
    };
  }
}

/**
 * Resend Mobile OTP with cooldown and rate limit enforcement
 */
export async function resendMobileOtp(
  rawMobile: string,
  clientIp: string
): Promise<{
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
  message?: string;
}> {
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
