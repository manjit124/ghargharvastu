import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UserSession } from './types';
import { adminStore } from '../adminStore';

const SESSION_COOKIE_NAME = 'vv_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'vastuvision_secure_hmac_key_2026_production';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthenticatedUserRequest extends Request {
  userSession?: UserSession;
  authoritativeUserId?: string;
}

/**
 * Hash client IP address for privacy-safe tracking and guest allowance anchoring
 */
export function hashIp(ip: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(ip.trim()).digest('hex').substring(0, 24);
}

/**
 * Extract client IP from headers or socket
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Sign a session payload with HMAC-SHA256
 */
export function signSession(session: UserSession): string {
  const payloadStr = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an HMAC-signed session token
 */
export function verifySessionToken(token: string): UserSession | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const rawJson = Buffer.from(payloadStr, 'base64url').toString('utf-8');
    const session: UserSession = JSON.parse(rawJson);

    if (!session.sessionId || !session.userId || !session.expiresAt) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      return null; // Expired
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Extract token from HTTP-only cookie or Authorization header or x-session-token
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }

  // Raw cookie header fallback
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  // 2. Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 3. Custom header
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }

  return null;
}

/**
 * Set signed session cookie on HTTP response
 */
export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

/**
 * Clear session cookie on HTTP response
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Create and persist a signed authenticated user session
 */
export function createSessionForUser(
  res: Response,
  user: { id: string; name: string; email: string },
  req?: Request
): { session: UserSession; token: string } {
  const clientIp = req ? getClientIp(req) : '127.0.0.1';
  const ipHash = hashIp(clientIp);

  const session: UserSession = {
    sessionId: 'sess_' + crypto.randomBytes(12).toString('hex'),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    isGuest: false,
    ipHash,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  };

  const token = signSession(session);
  setSessionCookie(res, token);
  res.setHeader('x-session-token', token);
  return { session, token };
}

/**
 * Issue or retrieve a persistent session for a user or guest.
 * Anchors guest allowance to the IP hash so clearing cookies/incognito does not reset free allowance!
 */
export function getOrCreateSessionForClient(
  req: Request,
  res: Response,
  options?: { preferredUserId?: string; userName?: string; userEmail?: string }
): { session: UserSession; token: string; isNew: boolean } {
  const existingToken = extractSessionToken(req);
  if (existingToken) {
    const verified = verifySessionToken(existingToken);
    if (verified) {
      return { session: verified, token: existingToken, isNew: false };
    }
  }

  const clientIp = getClientIp(req);
  const ipHash = hashIp(clientIp);

  // Check if this IP is already mapped to a guest user in adminStore to prevent reset abuse
  let targetUserId = adminStore.getUserIdForIpHash(ipHash);
  let isGuest = true;
  let userName = options?.userName || 'Vastu Homeowner';
  let userEmail = options?.userEmail || '';

  if (!targetUserId) {
    targetUserId = 'guest_' + crypto.randomBytes(8).toString('hex');
    adminStore.setIpHashMapping(ipHash, targetUserId);
  }

  // Ensure credit account is initialized
  adminStore.getUserAccount(targetUserId, userName, userEmail);

  const newSession: UserSession = {
    sessionId: 'sess_' + crypto.randomBytes(12).toString('hex'),
    userId: targetUserId,
    userName,
    userEmail,
    isGuest,
    ipHash,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  };

  const token = signSession(newSession);
  setSessionCookie(res, token);
  return { session: newSession, token, isNew: true };
}

/**
 * Middleware ensuring a valid session exists (either registered user or guest).
 * Allows visitors to use free AI features (chat, photo analysis, room scan, etc.)
 * backed by the existing free-credit system and IP tracking.
 */
export function requireUserSession(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractSessionToken(req);
  if (token) {
    const session = verifySessionToken(token);
    if (session) {
      req.userSession = session;
      req.authoritativeUserId = session.userId;
      return next();
    }
  }

  // If no token or invalid, automatically issue or retrieve guest session anchored to client IP
  const { session } = getOrCreateSessionForClient(req, res);
  req.userSession = session;
  req.authoritativeUserId = session.userId;
  return next();
}

/**
 * Strict authentication middleware: Requires a REAL, registered, logged-in user account.
 * Used for paid subscriptions, Razorpay order creation, payment verification, and profile management.
 * Guest sessions are rejected with HTTP 401 UNAUTHENTICATED.
 */
export function requireRegisteredUser(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractSessionToken(req);
  if (token) {
    const session = verifySessionToken(token);
    if (session && !session.isGuest && session.userId && !session.userId.startsWith('guest_')) {
      req.userSession = session;
      req.authoritativeUserId = session.userId;
      return next();
    }
  }

  // Reject unauthenticated or guest requests with 401 Unauthorized
  return res.status(401).json({
    success: false,
    code: 'UNAUTHENTICATED',
    error: 'AUTHENTICATION_REQUIRED',
    message: 'Subscription continue karne ke liye account me login karein',
  });
}
