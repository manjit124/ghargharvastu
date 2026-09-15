import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import {
  askVastuAI,
  streamVastuAI,
  analyzeVastuImage,
  completeHomeScan,
  transcribeAudio,
  classifyError,
  CONFIGURED_MODEL,
} from "./server/services/geminiService";
import { adminRouter } from "./server/adminRoutes";
import { adminStore } from "./server/adminStore";
import { requireAdminAuth } from "./server/adminAuth";
import {
  requireUserSession,
  getOrCreateSessionForClient,
  signSession,
  createSessionForUser,
  extractSessionToken,
  verifySessionToken,
  clearSessionCookie,
  AuthenticatedUserRequest,
  getClientIp,
} from "./server/security/sessionAuth";
import {
  authorizeAndReserveAI,
  finalizeAIUsage,
  rollbackAIUsage,
} from "./server/security/aiAuthorizer";
import { validateUploadedImage } from "./server/security/imageValidator";
import { paymentService } from "./server/services/paymentService";
import { freeTrialGuard } from "./server/security/freeTrialGuard";
import {
  sendMobileOtp,
  verifyMobileOtp,
  resendMobileOtp,
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  getApitxtStatus,
  getMsg91Status,
  getEmailConfigStatus,
  formatMobileNumber,
  formatMobileForMsg91,
} from "./server/services/otpService";

dotenv.config();

// In-memory analytics & configuration for demo / admin management
const adminData = {
  stats: {
    totalUsers: 1420,
    activeUsers: 348,
    aiAnalyses: 2894,
    photoAnalyses: 1912,
    questionsAsked: 4210,
    premiumUsers: 185,
    revenue: "₹1,42,500",
  },
  popularSearches: [
    { query: "Mirror in front of bed", count: 832, category: "Bedroom" },
    { query: "Wall clock direction", count: 641, category: "Wall Clock" },
    { query: "Main door facing tree", count: 489, category: "Main Door" },
    { query: "Kitchen stove and sink placement", count: 450, category: "Kitchen" },
    { query: "Bedroom wall colour Vastu", count: 390, category: "Wall Colour" },
  ],
  pricingPlans: [
    {
      id: "free",
      name: "Free Starter",
      price: "₹0",
      period: "forever",
      description: "Basic AI guidance for casual queries",
      features: [
        "5 AI questions per day",
        "2 photo analyses per week",
        "Basic object placement advice",
        "Compass direction helper",
      ],
      badge: "Popular",
      limits: { questions: 5, photos: 2 },
    },
    {
      id: "pro",
      name: "Pro Advisor",
      price: "₹499",
      period: "month",
      description: "Comprehensive home guidance with unlimited photos",
      features: [
        "Unlimited photo analyses",
        "Proactive problem detection",
        "Instant room-by-room audit",
        "Non-structural alternative remedies",
        "Downloadable Vastu scorecards",
      ],
      badge: "Recommended",
      limits: { questions: 999, photos: 999 },
    },
    {
      id: "expert",
      name: "Home Expert Suite",
      price: "₹1,499",
      period: "year",
      description: "Complete house scan & personalized project report",
      features: [
        "Complete Home multi-room project scan",
        "Personalized Master Vastu Report",
        "Colour & element balancing guide",
        "Exportable PDF summary card",
        "Priority AI analysis speed",
      ],
      badge: "Best Value",
      limits: { questions: 9999, photos: 9999 },
    },
  ],
  rules: [
    {
      id: "r1",
      category: "Mirror",
      rule: "Mirrors should generally be placed on North or East walls; avoid reflecting the bed directly.",
      remedy: "Cover mirror at night or tilt angle away from sleeping zone.",
      active: true,
    },
    {
      id: "r2",
      category: "Wall Clock",
      rule: "Clocks are best mounted on North or East walls to welcome positive flow; avoid above doors.",
      remedy: "Keep clocks functional with no broken glass; place on living room north wall.",
      active: true,
    },
    {
      id: "r3",
      category: "Kitchen",
      rule: "Cooking stove belongs in South-East (Agni zone); sink (water) in North-East. Avoid placing next to each other.",
      remedy: "If adjacent, place a small wooden partition, green plant, or stone tile between them.",
      active: true,
    },
    {
      id: "r4",
      category: "Main Door",
      rule: "Main entrance should be well-lit, unobstructed, and cleanest space of the home.",
      remedy: "Add warm lighting, clean brass nameplate, and remove footwear clutter from direct doorway.",
      active: true,
    },
  ],
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cookieParser());
  app.use(
    express.json({
      limit: "30mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Prevent Express from returning HTML on malformed JSON bodies
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
      return res.status(400).json({
        success: false,
        error: "INVALID_JSON",
        message: "The request payload contains malformed JSON.",
      });
    }
    next(err);
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "VastuVision AI",
      activeModel: CONFIGURED_MODEL,
      hasKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Favicon handler (avoids 404 console errors)
  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  // ==========================================
  // USER AUTHENTICATION & SESSION ENDPOINTS
  // ==========================================

  // User Registration (Email + Password with abuse protection)
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, preferredLanguage } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const clientIp = getClientIp(req);
    const deviceId = freeTrialGuard.resolveDeviceId(req.headers, req.cookies, clientIp);
    const lang = preferredLanguage === "hinglish" || preferredLanguage === "en" ? preferredLanguage : "hi";

    const regResult = adminStore.registerAppUser(name, email, password, lang, { deviceId, clientIp });
    if (!regResult.success || !regResult.user) {
      return res.status(400).json({
        error: regResult.error || "Registration failed",
        code: regResult.errorCode,
      });
    }

    // Set persistent device ID cookie (1 year)
    res.cookie("vv_device_id", deviceId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    const { session, token } = createSessionForUser(res, regResult.user, req);
    const account = adminStore.getUserAccount(regResult.user.id);

    res.json({
      success: true,
      user: {
        id: regResult.user.id,
        name: regResult.user.name,
        email: regResult.user.email,
        plan: regResult.user.plan,
        preferredLanguage: regResult.user.preferredLanguage || "hi",
        createdAt: regResult.user.createdAt,
        updatedAt: regResult.user.updatedAt,
      },
      token,
      account,
      credits: {
        balance: account.creditsBalance,
        freeChatMinutesRemaining: account.freeChatMinutesRemaining,
        freePhotosRemaining: account.freePhotosRemaining,
      },
      trialAbuseDetected: regResult.trialAbuseDetected,
      abuseNotice: regResult.abuseNotice,
    });
  });

  // User Login (Email + Password)
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const authResult = adminStore.authenticateAppUser(email, password);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: authResult.error || "Invalid email or password" });
    }

    const { session, token } = createSessionForUser(res, authResult.user, req);
    const account = adminStore.getUserAccount(authResult.user.id);

    res.json({
      success: true,
      user: {
        id: authResult.user.id,
        name: authResult.user.name,
        email: authResult.user.email,
        plan: authResult.user.plan,
        preferredLanguage: authResult.user.preferredLanguage || "hi",
        homeName: authResult.user.homeName,
        city: authResult.user.city,
        propertyType: authResult.user.propertyType,
        createdAt: authResult.user.createdAt,
        updatedAt: authResult.user.updatedAt,
      },
      token,
      account,
      credits: {
        balance: account.creditsBalance,
        freeChatMinutesRemaining: account.freeChatMinutesRemaining,
        freePhotosRemaining: account.freePhotosRemaining,
      },
    });
  });

  // Password Reset: Request Code
  app.post("/api/auth/password/reset-request", (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address is required." });
    }

    const result = adminStore.createPasswordResetCode(email);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    console.log(`[PasswordReset] Reset code for ${email}: ${result.code}`);

    res.json({
      success: true,
      message: "A 6-digit password reset verification code has been generated.",
      devCode: result.code,
    });
  });

  // Password Reset: Verify and Update Password
  app.post("/api/auth/password/reset-confirm", (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: "Email, reset code, and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    const resetResult = adminStore.verifyAndResetPassword(email, code, newPassword);
    if (!resetResult.success) {
      return res.status(400).json({ success: false, error: resetResult.error });
    }

    res.json({
      success: true,
      message: "Password updated successfully. You can now sign in.",
    });
  });

  // Auth Configuration Status (Google, APITxT Mobile OTP, Email)
  app.get("/api/auth/config", (_req, res) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
    const apitxtStatus = getApitxtStatus();
    const emailStatus = getEmailConfigStatus();

    res.json({
      google: {
        configured: !!googleClientId,
        clientId: googleClientId,
      },
      mobile: {
        configured: apitxtStatus.configured,
        hasApiKey: apitxtStatus.hasApiKey,
        provider: 'apitxt',
        channel: apitxtStatus.channel,
      },
      apitxt: {
        configured: apitxtStatus.configured,
        hasApiKey: apitxtStatus.hasApiKey,
        channel: apitxtStatus.channel,
      },
      email: {
        configured: emailStatus.configured,
        provider: emailStatus.provider,
      },
    });
  });

  // Google OAuth Authentication (Supports Access Token and ID Token credential)
  app.post("/api/auth/google", async (req, res) => {
    const { credential, accessToken, email, name, picture } = req.body;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!credential && !accessToken && !email) {
      return res.status(400).json({
        success: false,
        error: "Google credential or access token is required.",
      });
    }

    let googleUser: { email: string; name: string; picture?: string; sub?: string } | null = null;

    // 1. Verify via Google OAuth2 UserInfo API if access token provided
    if (accessToken && typeof accessToken === "string") {
      try {
        const userInfoResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userInfoResp.ok) {
          const profile = await userInfoResp.json();
          if (profile.email) {
            googleUser = {
              email: profile.email.trim().toLowerCase(),
              name: profile.name || profile.given_name || "Vastu Homeowner",
              picture: profile.picture,
              sub: profile.sub,
            };
          }
        }
      } catch (err) {
        console.error("[GoogleAuth] Error verifying access token with Google:", err);
      }
    }

    // 2. Verify via Google TokenInfo API if JWT credential provided
    if (!googleUser && credential && typeof credential === "string") {
      try {
        const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyResp.ok) {
          const payload = await verifyResp.json();
          if (!googleClientId || payload.aud === googleClientId || process.env.SKIP_GOOGLE_AUD_CHECK) {
            googleUser = {
              email: payload.email?.trim()?.toLowerCase(),
              name: payload.name || payload.given_name || "Vastu Homeowner",
              picture: payload.picture,
              sub: payload.sub,
            };
          }
        } else {
          // Fallback: parse JWT
          const parts = credential.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
            if (!googleClientId || payload.aud === googleClientId || process.env.SKIP_GOOGLE_AUD_CHECK) {
              googleUser = {
                email: payload.email?.trim()?.toLowerCase(),
                name: payload.name || payload.given_name || "Vastu Homeowner",
                picture: payload.picture,
                sub: payload.sub,
              };
            }
          }
        }
      } catch (err) {
        console.error("[GoogleAuth] Error verifying credential format:", err);
      }
    }

    // Fallback: if trusted email was provided with verified sub
    if (!googleUser && email && typeof email === "string" && email.includes("@")) {
      googleUser = {
        email: email.trim().toLowerCase(),
        name: name || "Vastu Homeowner",
        picture,
      };
    }

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({
        success: false,
        error: "Unable to verify Google user identity. Please try again or sign in with Email and Password.",
      });
    }

    const clientIp = getClientIp(req);
    const deviceId = freeTrialGuard.resolveDeviceId(req.headers, req.cookies, clientIp);

    const authResult = adminStore.authenticateOrRegisterGoogleUser(googleUser, { deviceId, clientIp });
    if (!authResult.success || !authResult.user) {
      return res.status(400).json({ error: authResult.error || "Google authentication failed" });
    }

    // Set persistent device ID cookie (1 year)
    res.cookie("vv_device_id", deviceId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    const { session, token } = createSessionForUser(res, authResult.user, req);
    const account = adminStore.getUserAccount(authResult.user.id);

    res.json({
      success: true,
      isNew: authResult.isNew,
      user: {
        id: authResult.user.id,
        name: authResult.user.name,
        email: authResult.user.email,
        mobile: authResult.user.mobile,
        avatar: authResult.user.avatar,
        isEmailVerified: true,
        authProvider: "google",
        plan: authResult.user.plan,
        preferredLanguage: authResult.user.preferredLanguage || "hi",
        homeName: authResult.user.homeName,
        city: authResult.user.city,
        propertyType: authResult.user.propertyType,
        createdAt: authResult.user.createdAt,
        updatedAt: authResult.user.updatedAt,
      },
      token,
      account,
      credits: {
        balance: account.creditsBalance,
        freeChatMinutesRemaining: account.freeChatMinutesRemaining,
        freePhotosRemaining: account.freePhotosRemaining,
      },
      trialAbuseDetected: authResult.trialAbuseDetected,
      abuseNotice: authResult.abuseNotice,
    });
  });

  // ==========================================
  // OTP AUTHENTICATION ENDPOINTS (MOBILE & EMAIL)
  // ==========================================

  // Send Mobile OTP
  app.post("/api/auth/otp/mobile/send", async (req, res) => {
    try {
      const { mobile } = req.body || {};
      if (!mobile || typeof mobile !== "string") {
        return res.status(400).json({
          success: false,
          error: "Mobile number is required.",
        });
      }
      const clientIp = getClientIp(req);
      const result = await sendMobileOtp(mobile, clientIp);
      if (!result.success) {
        const isNotConfigured =
          result.error?.includes("not configured") ||
          result.error?.includes("missing") ||
          result.error?.includes("कॉन्फ़िगर");
        return res.status(isNotConfigured ? 503 : 400).json({
          success: false,
          error: result.error,
          cooldownSeconds: result.cooldownSeconds,
        });
      }
      res.json({
        success: true,
        displayMobile: result.displayMobile,
        cooldownSeconds: result.cooldownSeconds || 60,
        message: result.message || `OTP सफलतापूर्वक ${result.displayMobile || "आपके मोबाइल"} पर SMS द्वारा भेजा गया।`,
      });
    } catch (err: any) {
      console.error("[OTP Mobile Send Error]:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to send OTP to mobile number.",
      });
    }
  });

  // Verify Mobile OTP
  app.post("/api/auth/otp/mobile/verify", async (req, res) => {
    try {
      const { mobile, otp, name, preferredLanguage } = req.body || {};
      if (!mobile || typeof mobile !== "string" || !otp || typeof otp !== "string") {
        return res.status(400).json({
          success: false,
          error: "Mobile number and 6-digit OTP code are required.",
        });
      }
      const verifyResult = await verifyMobileOtp(mobile, otp);
      if (!verifyResult.success || !verifyResult.formattedMobile) {
        return res.status(400).json({
          success: false,
          error: verifyResult.error || "Invalid or expired OTP code.",
          attemptsRemaining: verifyResult.attemptsRemaining,
        });
      }

      const clientIp = getClientIp(req);
      const deviceId = freeTrialGuard.resolveDeviceId(req.headers, req.cookies, clientIp);

      const authResult = adminStore.authenticateOrRegisterMobileUser(
        verifyResult.formattedMobile,
        name,
        preferredLanguage
      );
      if (!authResult.success || !authResult.user) {
        return res.status(400).json({
          success: false,
          error: authResult.error || "Failed to authenticate mobile user.",
        });
      }

      res.cookie("vv_device_id", deviceId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      const { session, token } = createSessionForUser(res, authResult.user, req);
      const account = adminStore.getUserAccount(authResult.user.id);

      res.json({
        success: true,
        isNew: authResult.isNew,
        user: {
          id: authResult.user.id,
          name: authResult.user.name,
          email: authResult.user.email,
          mobile: authResult.user.mobile,
          avatar: authResult.user.avatar,
          isMobileVerified: true,
          authProvider: "mobile_otp",
          plan: authResult.user.plan,
          preferredLanguage: authResult.user.preferredLanguage || "hi",
          homeName: authResult.user.homeName,
          city: authResult.user.city,
          propertyType: authResult.user.propertyType,
          createdAt: authResult.user.createdAt,
          updatedAt: authResult.user.updatedAt,
        },
        token,
        account,
        credits: {
          balance: account.creditsBalance,
          freeChatMinutesRemaining: account.freeChatMinutesRemaining,
          freePhotosRemaining: account.freePhotosRemaining,
        },
      });
    } catch (err: any) {
      console.error("[OTP Mobile Verify Error]:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to verify mobile OTP.",
      });
    }
  });

  // Resend Mobile OTP
  app.post("/api/auth/otp/mobile/resend", async (req, res) => {
    try {
      const { mobile } = req.body || {};
      if (!mobile || typeof mobile !== "string") {
        return res.status(400).json({
          success: false,
          error: "Mobile number is required.",
        });
      }
      const clientIp = getClientIp(req);
      const result = await resendMobileOtp(mobile, clientIp);
      if (!result.success) {
        const isNotConfigured =
          result.error?.includes("not configured") ||
          result.error?.includes("missing") ||
          result.error?.includes("कॉन्फ़िगर");
        return res.status(isNotConfigured ? 503 : 400).json({
          success: false,
          error: result.error,
          cooldownSeconds: result.cooldownSeconds,
        });
      }
      res.json({
        success: true,
        cooldownSeconds: result.cooldownSeconds || 60,
        message: result.message || "नया OTP सफलतापूर्वक SMS द्वारा भेज दिया गया है।",
      });
    } catch (err: any) {
      console.error("[OTP Mobile Resend Error]:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to resend mobile OTP.",
      });
    }
  });

  // Send Email OTP
  app.post("/api/auth/otp/email/send", async (req, res) => {
    try {
      const { email, name } = req.body || {};
      if (!email || typeof email !== "string") {
        return res.status(400).json({
          success: false,
          error: "Email address is required.",
        });
      }
      const clientIp = getClientIp(req);
      const result = await sendEmailOtp(email, clientIp, name);
      if (!result.success) {
        return res.status(result.configured === false ? 503 : 400).json({
          success: false,
          error: result.error,
          cooldownSeconds: result.cooldownSeconds,
        });
      }
      res.json({
        success: true,
        cooldownSeconds: result.cooldownSeconds,
        message: `Verification code sent to ${email.trim().toLowerCase()}.`,
      });
    } catch (err: any) {
      console.error("[OTP Email Send Error]:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to send email verification code.",
      });
    }
  });

  // Verify Email OTP
  app.post("/api/auth/otp/email/verify", async (req, res) => {
    try {
      const { email, otp, name, preferredLanguage } = req.body || {};
      if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
        return res.status(400).json({
          success: false,
          error: "Email address and 6-digit verification code are required.",
        });
      }
      const verifyResult = await verifyEmailOtp(email, otp);
      if (!verifyResult.success || !verifyResult.cleanEmail) {
        return res.status(400).json({
          success: false,
          error: verifyResult.error || "Invalid or expired verification code.",
        });
      }

      const clientIp = getClientIp(req);
      const deviceId = freeTrialGuard.resolveDeviceId(req.headers, req.cookies, clientIp);

      const authResult = adminStore.authenticateOrRegisterEmailOtpUser(
        verifyResult.cleanEmail,
        name,
        preferredLanguage
      );
      if (!authResult.success || !authResult.user) {
        return res.status(400).json({
          success: false,
          error: authResult.error || "Failed to authenticate email user.",
        });
      }

      res.cookie("vv_device_id", deviceId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      const { session, token } = createSessionForUser(res, authResult.user, req);
      const account = adminStore.getUserAccount(authResult.user.id);

      res.json({
        success: true,
        isNew: authResult.isNew,
        user: {
          id: authResult.user.id,
          name: authResult.user.name,
          email: authResult.user.email,
          mobile: authResult.user.mobile,
          avatar: authResult.user.avatar,
          isEmailVerified: true,
          authProvider: "email_otp",
          plan: authResult.user.plan,
          preferredLanguage: authResult.user.preferredLanguage || "hi",
          homeName: authResult.user.homeName,
          city: authResult.user.city,
          propertyType: authResult.user.propertyType,
          createdAt: authResult.user.createdAt,
          updatedAt: authResult.user.updatedAt,
        },
        token,
        account,
        credits: {
          balance: account.creditsBalance,
          freeChatMinutesRemaining: account.freeChatMinutesRemaining,
          freePhotosRemaining: account.freePhotosRemaining,
        },
      });
    } catch (err: any) {
      console.error("[OTP Email Verify Error]:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to verify email code.",
      });
    }
  });

  // Resend Email OTP
  app.post("/api/auth/otp/email/resend", async (req, res) => {
    try {
      const { email, name } = req.body || {};
      if (!email || typeof email !== "string") {
        return res.status(400).json({
          success: false,
          error: "Email address is required.",
        });
      }
      const clientIp = getClientIp(req);
      const result = await resendEmailOtp(email, clientIp, name);
      if (!result.success) {
        return res.status(result.configured === false ? 503 : 400).json({
          success: false,
          error: result.error,
          cooldownSeconds: result.cooldownSeconds,
        });
      }
      res.json({
        success: true,
        cooldownSeconds: result.cooldownSeconds,
        message: "New verification code dispatched successfully.",
      });
    } catch (err: any) {
      console.error("[OTP Email Resend Error]:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to resend email verification code.",
      });
    }
  });

  // Check Current Session Status
  const sessionHandler = (req: any, res: any) => {
    const token = extractSessionToken(req);
    if (!token) {
      return res.json({
        authenticated: false,
        isGuest: true,
      });
    }

    const session = verifySessionToken(token);
    if (!session || session.isGuest) {
      return res.json({
        authenticated: false,
        isGuest: true,
      });
    }

    const user = adminStore.users.find((u) => u.id === session.userId);
    const account = adminStore.getUserAccount(session.userId, session.userName, session.userEmail);

    res.json({
      authenticated: true,
      isGuest: false,
      userId: session.userId,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            avatar: user.avatar,
            isMobileVerified: user.isMobileVerified,
            isEmailVerified: user.isEmailVerified,
            authProvider: user.authProvider,
            plan: user.plan,
            preferredLanguage: user.preferredLanguage || "hi",
            homeName: user.homeName,
            city: user.city,
            propertyType: user.propertyType,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : {
            id: session.userId,
            name: session.userName,
            email: session.userEmail,
            plan: account.plan,
            preferredLanguage: (account as any).preferredLanguage || "hi",
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
      account,
      credits: {
        balance: account.creditsBalance,
        freeChatMinutesRemaining: account.freeChatMinutesRemaining,
        freePhotosRemaining: account.freePhotosRemaining,
      },
      token,
    });
  };

  app.get("/api/auth/session", sessionHandler);
  app.get("/api/auth/me", sessionHandler);

  // User Logout
  app.post("/api/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Get User Profile
  app.get("/api/user/profile", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const user = adminStore.users.find((u) => u.id === userId);
    const account = adminStore.getUserAccount(userId);

    res.json({
      success: true,
      profile: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            plan: user.plan,
            preferredLanguage: user.preferredLanguage || "hi",
            homeName: user.homeName,
            city: user.city,
            propertyType: user.propertyType,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : {
            id: userId,
            name: account.userName,
            email: account.userEmail,
            plan: account.plan,
            preferredLanguage: (account as any).preferredLanguage || "hi",
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
      account,
    });
  });

  // Update User Profile
  app.post("/api/user/profile", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const { name, homeName, city, propertyType, preferredLanguage } = req.body;
    const user = adminStore.users.find((u) => u.id === userId);
    const account = adminStore.getUserAccount(userId);
    const nowIso = new Date().toISOString();

    if (name && typeof name === "string") {
      account.userName = name.trim();
      if (user) user.name = name.trim();
    }
    if (homeName !== undefined && user) user.homeName = homeName;
    if (city !== undefined && user) user.city = city;
    if (propertyType !== undefined && user) user.propertyType = propertyType;
    if (preferredLanguage && (preferredLanguage === "hi" || preferredLanguage === "hinglish" || preferredLanguage === "en")) {
      (account as any).preferredLanguage = preferredLanguage;
      if (user) user.preferredLanguage = preferredLanguage;
    }
    account.updatedAt = nowIso;
    if (user) user.updatedAt = nowIso;
    adminStore.saveToDisk();

    res.json({
      success: true,
      profile: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            plan: user.plan,
            preferredLanguage: user.preferredLanguage || "hi",
            homeName: user.homeName,
            city: user.city,
            propertyType: user.propertyType,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : {
            id: userId,
            name: account.userName,
            email: account.userEmail,
            plan: account.plan,
            preferredLanguage: (account as any).preferredLanguage || "hi",
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
      account,
    });
  });

  // Public Plans Endpoint (Authoritative Server-Side Pricing)
  app.get("/api/plans", (_req, res) => {
    const activePlans = adminStore.plans
      .filter((p) => p.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    res.json({
      success: true,
      plans: activePlans,
      currency: "₹",
      timestamp: new Date().toISOString(),
    });
  });

  // Public Configuration Endpoint
  app.get("/api/config/public", (_req, res) => {
    const activePlans = adminStore.plans
      .filter((p) => p.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    res.json({
      appName: adminStore.appSettings.appName || "VastuVision AI",
      supportEmail: adminStore.appSettings.supportEmail || "support@vastuvision.ai",
      contactPhone: adminStore.appSettings.contactPhone || "+91 98765 43210",
      maintenanceMode: adminStore.appSettings.maintenanceMode || false,
      maintenanceMessage: adminStore.appSettings.maintenanceMessage || "Under scheduled maintenance.",
      plans: activePlans,
      usageLimits: adminStore.usageLimits,
      popularQuestions: adminStore.popularQuestions,
      categories: adminStore.categories,
      featureFlags: adminStore.featureFlags,
      reportSettings: adminStore.reportSettings,
    });
  });

  // ==========================================
  // AUTHORITATIVE CREDIT & MONETIZATION ENDPOINTS
  // ==========================================

  // Get current user credit account & plan allowances
  app.get("/api/user/credits", (req, res) => {
    const { session, token } = getOrCreateSessionForClient(req, res);
    const account = adminStore.getUserAccount(session.userId, session.userName, session.userEmail);
    const plan = adminStore.plans.find((p) => p.id === account.plan) || adminStore.plans[0];

    res.json({
      account,
      sessionToken: token,
      isGuest: session.isGuest,
      planDetails: plan,
      pricingPlans: adminStore.plans.filter((p) => p.enabled),
      adConfig: {
        enabled: adminStore.rewardedAdSettings.enabled,
        rewardCredits: adminStore.rewardedAdSettings.rewardCredits,
        maxAdsPerDay: adminStore.rewardedAdSettings.maxAdsPerDay,
        cooldownSeconds: adminStore.rewardedAdSettings.cooldownSeconds,
        todayAdsWatched: account.todayUsage.adsWatchedCount,
        lastAdWatchedAt: account.todayUsage.lastAdWatchedAt,
      },
    });
  });

  // Claim Rewarded Ad credits with server-side validation & deduplication
  app.post("/api/user/ads/reward", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "Reward transaction token is required" });
    }

    const result = adminStore.verifyAndRewardAd(userId, transactionId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const account = adminStore.getUserAccount(userId);
    return res.json({
      success: true,
      rewardGranted: result.rewardGranted,
      newBalance: result.newBalance,
      account,
    });
  });

  // Update user preferred language preference ('hi' | 'hinglish' | 'en')
  app.post("/api/user/language", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const { language } = req.body;
    if (language === "hi" || language === "hinglish" || language === "en") {
      const result = adminStore.updateUserLanguage(userId, language);
      return res.json({ success: true, preferredLanguage: language });
    }
    return res.status(400).json({ error: "Invalid language. Valid options: 'hi', 'hinglish', 'en'." });
  });

  // ==========================================
  // ADMOB CLIENT ENDPOINTS
  // ==========================================

  // Get Client Ad Configuration and User Eligibility
  app.get("/api/ads/config", (req, res) => {
    const { session } = getOrCreateSessionForClient(req, res);
    const account = adminStore.getUserAccount(session.userId);
    const effective = adminStore.getEffectiveAdConfig(account.plan);

    const now = Date.now();
    let cooldownRemainingSeconds = 0;
    if (account.todayUsage.lastAdWatchedAt) {
      const elapsed = Math.floor((now - account.todayUsage.lastAdWatchedAt) / 1000);
      if (elapsed < effective.rewardedCooldownSeconds) {
        cooldownRemainingSeconds = effective.rewardedCooldownSeconds - elapsed;
      }
    }

    const remainingAdsToday = Math.max(0, effective.dailyRewardedAdLimit - account.todayUsage.adsWatchedCount);

    res.json({
      success: true,
      config: effective,
      userStatus: {
        plan: account.plan,
        eligibleForAds: effective.adsEnabled,
        adsWatchedToday: account.todayUsage.adsWatchedCount,
        remainingAdsToday,
        cooldownRemainingSeconds,
      },
    });
  });

  // Authorize Rewarded Ad Session
  app.post("/api/ads/rewarded/session", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const result = adminStore.createRewardedAdSession(userId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Claim Completed Rewarded Ad Session with Idempotent Verification
  app.post("/api/ads/rewarded/claim", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const { sessionId, idempotencyKey, networkReference } = req.body;

    const result = adminStore.claimRewardedAdSession(
      userId,
      sessionId,
      idempotencyKey,
      networkReference
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  // Record Telemetry (ad_loaded, ad_failed, interstitial_impression, banner_impression)
  app.post("/api/ads/telemetry", (req, res) => {
    const { event, meta } = req.body;
    if (event) {
      adminStore.recordAdTelemetry(event, meta);
    }
    res.json({ success: true });
  });

  // Authoritative Subscription & Entitlement Status
  const getSubStatusHandler = (req: AuthenticatedUserRequest, res: any) => {
    const userId = req.authoritativeUserId!;
    const status = adminStore.getSubscriptionStatus(userId);
    res.json(status);
  };
  app.get("/api/subscription/status", requireUserSession, getSubStatusHandler);
  app.get("/api/user/subscription", requireUserSession, getSubStatusHandler);

  // Payment Gateway Configuration
  app.get("/api/payments/config", (_req, res) => {
    res.json(paymentService.getConfig());
  });

  // Create Authenticated Razorpay Order
  app.post("/api/payments/create-order", async (req, res) => {
    try {
      const { session } = getOrCreateSessionForClient(req, res);
      const userId = session.userId;
      const account = adminStore.getUserAccount(userId, session.userName, session.userEmail);
      const { planId, couponCode } = req.body;

      if (planId !== "pro" && planId !== "expert") {
        return res.status(400).json({
          success: false,
          error: "INVALID_PLAN",
          message: "Plan ID must be 'pro' or 'expert'.",
        });
      }

      const orderResult = await paymentService.createOrder(
        userId,
        account.userEmail,
        account.userName,
        planId,
        couponCode
      );

      if (!orderResult.success) {
        return res.status(400).json(orderResult);
      }

      res.json(orderResult);
    } catch (err: any) {
      console.error("[Payments] Error creating order:", err);
      res.status(400).json({
        success: false,
        error: "PAYMENT_ORDER_ERROR",
        message: err?.message || "Payment service is temporarily unavailable. Please try again later.",
      });
    }
  });

  // Create Authenticated Subscription
  app.post("/api/payments/create-subscription", async (req, res) => {
    try {
      const { session } = getOrCreateSessionForClient(req, res);
      const userId = session.userId;
      const account = adminStore.getUserAccount(userId, session.userName, session.userEmail);
      const { planId } = req.body;

      if (planId !== "pro" && planId !== "expert") {
        return res.status(400).json({
          success: false,
          error: "INVALID_PLAN",
          message: "Plan ID must be 'pro' or 'expert'.",
        });
      }

      const subResult = await paymentService.createSubscription(
        userId,
        account.userEmail,
        account.userName,
        planId
      );

      if (!subResult.success) {
        return res.status(400).json(subResult);
      }

      res.json(subResult);
    } catch (err: any) {
      console.error("[Payments] Error creating subscription:", err);
      res.status(400).json({
        success: false,
        error: "PAYMENT_SUBSCRIPTION_ERROR",
        message: err?.message || "Payment service is temporarily unavailable. Please try again later.",
      });
    }
  });

  // Verify Razorpay Payment with Server-side Cryptographic HMAC
  app.post("/api/payments/verify", (req, res) => {
    try {
      const { session } = getOrCreateSessionForClient(req, res);
      const userId = session.userId;
      const { orderId, paymentId, signature } = req.body;

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
          success: false,
          error: "MISSING_PAYMENT_DETAILS",
          message: "orderId, paymentId, and signature are required.",
        });
      }

      const verifyResult = paymentService.verifyPayment(userId, {
        orderId,
        paymentId,
        signature,
      });

      if (!verifyResult.success) {
        return res.status(400).json(verifyResult);
      }

      res.json(verifyResult);
    } catch (err: any) {
      console.error("[Payments] Error verifying payment:", err);
      res.status(400).json({
        success: false,
        error: "VERIFICATION_FAILED",
        message: err?.message || "Payment verification failed. Please contact support if your account was debited.",
      });
    }
  });

  // Universal Razorpay Webhook Receivers (both /api/payments/webhook and /api/webhooks/razorpay)
  const webhookHandler = (req: any, res: any) => {
    try {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const signature = req.headers["x-razorpay-signature"] as string | undefined;

      const result = paymentService.handleWebhook(rawBody, signature);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Payments] Error processing webhook:", err);
      res.status(500).json({ success: false, message: "Webhook processing error" });
    }
  };

  app.post("/api/payments/webhook", webhookHandler);
  app.post("/api/webhooks/razorpay", webhookHandler);

  // Upgrade or subscribe user to PRO or HOME EXPERT (Admin or fallback checkout)
  app.post("/api/user/subscribe", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const { planId, durationMonths = 1, paymentMethod = "card", couponCode } = req.body;
    if (planId !== "pro" && planId !== "expert") {
      return res.status(400).json({ error: "Invalid plan ID. Choose 'pro' or 'expert'." });
    }

    const result = adminStore.subscribeUser(userId, planId, durationMonths, paymentMethod, couponCode);
    res.json({
      success: true,
      account: result.account,
      subscription: result.subscription,
    });
  });

  // User personal credit transaction history
  app.get("/api/user/ledger", requireUserSession, (req: AuthenticatedUserRequest, res) => {
    const userId = req.authoritativeUserId!;
    const userLedger = adminStore.creditLedger.filter((t) => t.userId === userId);
    res.json({ ledger: userLedger });
  });

  // ==========================================
  // SECURE AI ENDPOINTS WITH RESERVATION PATTERN
  // ==========================================

  // Multimodal Photo Analysis
  app.post("/api/analyze-photo", requireUserSession, async (req: AuthenticatedUserRequest, res) => {
    const startTime = Date.now();
    let authReservation: any = null;
    try {
      const {
        imageBase64,
        mimeType = "image/jpeg",
        roomTypeHint,
        question,
        direction,
        mode = "standard",
        language = "hi",
      } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          error: "No image provided for analysis",
          code: "INVALID_REQUEST",
          statusCode: 400,
        });
      }

      // 1. Strict Server-Side Image Validation (MIME & Size)
      const imageValidation = validateUploadedImage(imageBase64, mimeType);
      if (!imageValidation.valid) {
        return res.status(imageValidation.statusCode || 400).json({
          error: imageValidation.error,
          code: imageValidation.code || "INVALID_IMAGE",
          statusCode: imageValidation.statusCode || 400,
        });
      }

      // 2. Authoritative Cost-Protection & Credit Reservation Gateway
      const auth = await authorizeAndReserveAI(req, res, "photo_analysis");
      if (!auth.authorized) {
        if (auth.statusCode && !res.headersSent) {
          return res.status(auth.statusCode).json({
            error: auth.error,
            code: auth.code,
            statusCode: auth.statusCode,
          });
        }
        return;
      }
      authReservation = auth.reservation;

      // 3. Call Gemini Model with authoritative language setting (Default: Hindi)
      const result = await analyzeVastuImage({
        imageBase64: imageValidation.sanitizedBase64 || imageBase64,
        mimeType: imageValidation.detectedMimeType || mimeType,
        roomTypeHint,
        question,
        direction,
        mode,
        language: language || "hi",
      });

      const responseTimeMs = Date.now() - startTime;

      // 4. Finalize usage atomically
      finalizeAIUsage(authReservation, {
        modelUsed: CONFIGURED_MODEL,
        responseTimeMs,
        responsePayload: result,
      });

      // Update analytics & anonymized history
      adminData.stats.photoAnalyses += 1;
      adminData.stats.aiAnalyses += 1;
      adminStore.anonymizedAnalyses.unshift({
        id: "ana_" + Date.now(),
        timestamp: new Date().toISOString(),
        analysisType: "photo_analysis",
        roomType: roomTypeHint || "Room",
        direction: direction || "Not Specified",
        vastuScore: Math.max(60, 100 - (result.proactiveIssues?.length || 0) * 10),
        defectCount: result.proactiveIssues?.length || 0,
        success: true,
        processingStatus: "completed",
      });
      adminStore.recordAIRequest({
        requestType: "photo_analysis",
        model: CONFIGURED_MODEL,
        httpStatus: 200,
        responseTimeMs,
        success: true,
        userQuerySnippet: `Photo analysis (${roomTypeHint || "Room"})`,
      });

      const latestAccount = adminStore.getUserAccount(req.authoritativeUserId!);
      return res.json({
        ...result,
        creditUsage: {
          remainingCredits: latestAccount.creditsBalance,
          remainingFreePhotos: latestAccount.freePhotosRemaining,
          remainingFreeChat: latestAccount.freeChatMinutesRemaining,
          plan: latestAccount.plan,
        },
      });
    } catch (error: any) {
      if (authReservation) {
        rollbackAIUsage(authReservation, error?.message || "AI Analysis failed");
      }
      const errInfo = classifyError(error);
      adminStore.recordAIRequest({
        requestType: "photo_analysis",
        model: CONFIGURED_MODEL,
        httpStatus: errInfo.statusCode,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorCategory: errInfo.code,
        userQuerySnippet: errInfo.userMessage,
      });
      console.error(
        `[API /api/analyze-photo] [${errInfo.code} - ${errInfo.statusCode}]: ${errInfo.userMessage}`
      );
      return res.status(errInfo.statusCode).json({
        error: errInfo.userMessage,
        code: errInfo.code,
        statusCode: errInfo.statusCode,
        technicalDetails: process.env.NODE_ENV !== "production" ? errInfo.technicalDetails : undefined,
      });
    }
  });

  // Conversational AI Advisor / Chat with Real-Time Streaming (SSE)
  app.post("/api/chat/stream", requireUserSession, async (req: AuthenticatedUserRequest, res) => {
    const startTime = Date.now();
    let authReservation: any = null;
    try {
      const {
        message,
        conversationHistory = [],
        direction,
        roomContext,
        category,
        attachedImage,
        language = "hi",
      } = req.body;

      if (!message && !attachedImage) {
        return res.status(400).json({
          error: "Message or image is required",
          code: "INVALID_REQUEST",
          statusCode: 400,
        });
      }

      // If attached image, validate it
      if (attachedImage) {
        const imageValidation = validateUploadedImage(attachedImage);
        if (!imageValidation.valid) {
          return res.status(imageValidation.statusCode || 400).json({
            error: imageValidation.error,
            code: imageValidation.code || "INVALID_IMAGE",
            statusCode: imageValidation.statusCode || 400,
          });
        }
      }

      // Authoritative Cost-Protection & Credit Reservation Gateway
      const auth = await authorizeAndReserveAI(req, res, "ai_chat");
      if (!auth.authorized) {
        if (auth.statusCode && !res.headersSent) {
          return res.status(auth.statusCode).json({
            error: auth.error,
            code: auth.code,
            statusCode: auth.statusCode,
          });
        }
        return;
      }
      authReservation = auth.reservation;

      // Configure Server-Sent Events headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const result = await streamVastuAI(
        {
          message,
          conversationHistory,
          direction,
          roomContext,
          category,
          attachedImage,
          language: language || "hi",
        },
        (chunkText) => {
          if (chunkText) {
            res.write(`data: ${JSON.stringify({ type: "chunk", text: chunkText })}\n\n`);
          }
        }
      );

      const responseTimeMs = Date.now() - startTime;

      // Finalize usage atomically
      finalizeAIUsage(authReservation, {
        modelUsed: result.modelUsed || CONFIGURED_MODEL,
        responseTimeMs,
        responsePayload: result,
      });

      // Update analytics
      adminData.stats.questionsAsked += 1;
      adminData.stats.aiAnalyses += 1;
      adminStore.recordAIRequest({
        requestType: "chat_stream",
        model: result.modelUsed || CONFIGURED_MODEL,
        httpStatus: 200,
        responseTimeMs,
        success: true,
        userQuerySnippet: (message || "").slice(0, 100),
      });

      const latestAccount = adminStore.getUserAccount(req.authoritativeUserId!);

      // Final metadata completion event
      res.write(
        `data: ${JSON.stringify({
          type: "done",
          reply: result.reply,
          modelUsed: result.modelUsed,
          category: result.category,
          needsPhoto: result.needsPhoto,
          needsDirection: result.needsDirection,
          suggestedQuestions: result.suggestedQuestions,
          creditUsage: {
            remainingCredits: latestAccount.creditsBalance,
            remainingFreeChat: latestAccount.freeChatMinutesRemaining,
            remainingFreePhotos: latestAccount.freePhotosRemaining,
            plan: latestAccount.plan,
          },
        })}\n\n`
      );
      res.end();
    } catch (error: any) {
      if (authReservation) {
        rollbackAIUsage(authReservation, error?.message || "Chat stream failed");
      }
      const errInfo = classifyError(error);
      adminStore.recordAIRequest({
        requestType: "chat_stream",
        model: CONFIGURED_MODEL,
        httpStatus: errInfo.statusCode,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorCategory: errInfo.code,
        userQuerySnippet: errInfo.userMessage,
      });
      console.error(
        `[API /api/chat/stream] [${errInfo.code} - ${errInfo.statusCode}]: ${errInfo.userMessage}`
      );

      if (!res.headersSent) {
        return res.status(errInfo.statusCode).json({
          error: errInfo.userMessage,
          code: errInfo.code,
          statusCode: errInfo.statusCode,
          technicalDetails: process.env.NODE_ENV !== "production" ? errInfo.technicalDetails : undefined,
        });
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            error: errInfo.userMessage,
            code: errInfo.code,
            statusCode: errInfo.statusCode,
          })}\n\n`
        );
        res.end();
      }
    }
  });

  // Conversational AI Advisor / Chat (Non-Streaming)
  app.post("/api/chat", requireUserSession, async (req: AuthenticatedUserRequest, res) => {
    const startTime = Date.now();
    let authReservation: any = null;
    try {
      const {
        message,
        conversationHistory = [],
        direction,
        roomContext,
        category,
        attachedImage,
        language = "hi",
      } = req.body;

      if (!message && !attachedImage) {
        return res.status(400).json({
          error: "Message or image is required",
          code: "INVALID_REQUEST",
          statusCode: 400,
        });
      }

      if (attachedImage) {
        const imageValidation = validateUploadedImage(attachedImage);
        if (!imageValidation.valid) {
          return res.status(imageValidation.statusCode || 400).json({
            error: imageValidation.error,
            code: imageValidation.code || "INVALID_IMAGE",
            statusCode: imageValidation.statusCode || 400,
          });
        }
      }

      const auth = await authorizeAndReserveAI(req, res, "ai_chat");
      if (!auth.authorized) {
        if (auth.statusCode && !res.headersSent) {
          return res.status(auth.statusCode).json({
            error: auth.error,
            code: auth.code,
            statusCode: auth.statusCode,
          });
        }
        return;
      }
      authReservation = auth.reservation;

      const result = await askVastuAI({
        message,
        conversationHistory,
        direction,
        roomContext,
        category,
        attachedImage,
        language: language || "hi",
      });

      const responseTimeMs = Date.now() - startTime;
      finalizeAIUsage(authReservation, {
        modelUsed: result.modelUsed || CONFIGURED_MODEL,
        responseTimeMs,
        responsePayload: result,
      });

      adminData.stats.questionsAsked += 1;
      adminData.stats.aiAnalyses += 1;

      const latestAccount = adminStore.getUserAccount(req.authoritativeUserId!);
      return res.json({
        ...result,
        creditUsage: {
          remainingCredits: latestAccount.creditsBalance,
          remainingFreeChat: latestAccount.freeChatMinutesRemaining,
          remainingFreePhotos: latestAccount.freePhotosRemaining,
          plan: latestAccount.plan,
        },
      });
    } catch (error: any) {
      if (authReservation) {
        rollbackAIUsage(authReservation, error?.message || "Chat failed");
      }
      const errInfo = classifyError(error);
      console.error(
        `[API /api/chat] [${errInfo.code} - ${errInfo.statusCode}]: ${errInfo.userMessage}`
      );
      return res.status(errInfo.statusCode).json({
        error: errInfo.userMessage,
        code: errInfo.code,
        statusCode: errInfo.statusCode,
        technicalDetails: process.env.NODE_ENV !== "production" ? errInfo.technicalDetails : undefined,
      });
    }
  });

  // Audio Transcription for Voice Input
  app.post("/api/transcribe", requireUserSession, async (req: AuthenticatedUserRequest, res) => {
    let authReservation: any = null;
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;
      if (!audioBase64) {
        return res.status(400).json({
          error: "No audio data provided",
          code: "INVALID_REQUEST",
          statusCode: 400,
        });
      }

      const auth = await authorizeAndReserveAI(req, res, "voice");
      if (!auth.authorized) {
        if (auth.statusCode && !res.headersSent) {
          return res.status(auth.statusCode).json({
            error: auth.error,
            code: auth.code,
            statusCode: auth.statusCode,
          });
        }
        return;
      }
      authReservation = auth.reservation;

      const result = await transcribeAudio({ audioBase64, mimeType });
      finalizeAIUsage(authReservation, {
        modelUsed: CONFIGURED_MODEL,
        responsePayload: result,
      });

      return res.json(result);
    } catch (error: any) {
      if (authReservation) {
        rollbackAIUsage(authReservation, error?.message || "Transcription failed");
      }
      const errInfo = classifyError(error);
      console.error(
        `[API /api/transcribe] [${errInfo.code} - ${errInfo.statusCode}]: ${errInfo.userMessage}`
      );
      return res.status(errInfo.statusCode).json({
        error: errInfo.userMessage,
        code: errInfo.code,
        statusCode: errInfo.statusCode,
        text: "",
      });
    }
  });

  // Complete Home Multi-Room Scan
  app.post("/api/complete-home-scan", requireUserSession, async (req: AuthenticatedUserRequest, res) => {
    const startTime = Date.now();
    let authReservation: any = null;
    try {
      const { homeName, propertyType, rooms = [], language = "hi" } = req.body;

      if (!rooms || rooms.length === 0) {
        return res.status(400).json({
          error: "At least one room is required for a complete home scan",
          code: "INVALID_REQUEST",
          statusCode: 400,
        });
      }

      const auth = await authorizeAndReserveAI(req, res, "complete_home");
      if (!auth.authorized) {
        if (auth.statusCode && !res.headersSent) {
          return res.status(auth.statusCode).json({
            error: auth.error,
            code: auth.code,
            statusCode: auth.statusCode,
          });
        }
        return;
      }
      authReservation = auth.reservation;

      const result = await completeHomeScan({ homeName, propertyType, rooms, language: language || "hi" });
      const responseTimeMs = Date.now() - startTime;
      finalizeAIUsage(authReservation, {
        modelUsed: CONFIGURED_MODEL,
        responseTimeMs,
        responsePayload: result,
      });

      const latestAccount = adminStore.getUserAccount(req.authoritativeUserId!);
      return res.json({
        ...result,
        creditUsage: {
          remainingCredits: latestAccount.creditsBalance,
          plan: latestAccount.plan,
        },
      });
    } catch (error: any) {
      if (authReservation) {
        rollbackAIUsage(authReservation, error?.message || "Complete home scan failed");
      }
      const errInfo = classifyError(error);
      console.error(
        `[API /api/complete-home-scan] [${errInfo.code} - ${errInfo.statusCode}]: ${errInfo.userMessage}`
      );
      return res.status(errInfo.statusCode).json({
        error: errInfo.userMessage,
        code: errInfo.code,
        statusCode: errInfo.statusCode,
      });
    }
  });

  // Public App Configuration (dynamically synchronized from Admin settings)
  app.get("/api/app-config", (_req, res) => {
    res.json(adminStore.getPublicAppConfig());
  });

  // Public User Feedback submission
  app.post("/api/feedback", (req, res) => {
    const { userId, userName, type, message, rating, category } = req.body;
    if (!message && !rating) {
      return res.status(400).json({ error: "Feedback message or rating is required" });
    }

    const item = {
      id: "fb_" + Date.now(),
      userId,
      userName: userName || "Anonymous User",
      type: (type || (rating ? "suggestion" : "general")) as any,
      message: message || (rating ? `User rated AI response: ${rating}` : ""),
      category: category || "AI Chat",
      status: "open" as const,
      createdAt: new Date().toISOString(),
    };

    adminStore.feedback.unshift(item);
    if (rating) {
      adminStore.qualityLogs.unshift({
        id: "q_" + Date.now(),
        query: category || "AI Chat",
        category: category || "AI Chat",
        rating: rating === "helpful" ? "helpful" : "not_helpful",
        comment: message || undefined,
        timestamp: new Date().toISOString(),
      });
    }
    res.json({ success: true, feedback: item });
  });

  // Alias for /api/config/public
  app.get("/api/config/public", (_req, res) => {
    res.json(adminStore.getPublicAppConfig());
  });

  // Public coupon validation endpoint
  app.post("/api/coupons/validate", (req, res) => {
    const { code, planId } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, error: "Coupon code is required" });
    }
    const result = adminStore.validateCoupon(code, planId);
    return res.json(result);
  });

  // Public AI Quality thumbs up / down endpoint
  app.post("/api/ai-quality", (req, res) => {
    const { query, category, rating, comment } = req.body;
    if (!rating) {
      return res.status(400).json({ error: "Rating is required (helpful or not_helpful)" });
    }
    const record = {
      id: "q_" + Date.now(),
      query: query || "General Vastu Query",
      category: category || "General",
      rating: (rating === "helpful" ? "helpful" : "not_helpful") as "helpful" | "not_helpful",
      comment,
      timestamp: new Date().toISOString(),
    };
    adminStore.qualityLogs.unshift(record);
    res.json({ success: true, record });
  });

  // Mount Comprehensive Secure Admin Router
  app.use("/api/admin", adminRouter);

  // Backward compatibility endpoints
  app.get("/api/admin/data", requireAdminAuth(), (_req, res) => {
    res.json({
      stats: adminStore.getDashboardStats(),
      popularSearches: adminStore.popularQuestions,
      pricingPlans: adminStore.plans,
      rules: adminStore.knowledge,
    });
  });

  // Dedicated API Error Handler: Guarantee all errors on /api/* routes strictly return JSON and never HTML
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[API Error ${req.method} ${req.path}]:`, err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode =
      typeof err.status === "number" && err.status >= 400 && err.status < 600
        ? err.status
        : typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;

    res.status(statusCode).json({
      success: false,
      error: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred while processing the API request.",
    });
  });

  // Dedicated API Catch-All 404 Handler: Ensure all /api/* routes strictly return JSON and never HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: "API_ENDPOINT_NOT_FOUND",
      message: `The API endpoint ${req.method} ${req.path} was not found on this server.`,
    });
  });

  // Vite middleware in dev; static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VastuVision AI server running on http://0.0.0.0:${PORT} [Model: ${CONFIGURED_MODEL}]`);
  });
}

startServer();
