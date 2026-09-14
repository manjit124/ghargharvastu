import { Request, Response } from 'express';
import { AuthenticatedUserRequest, getClientIp } from './sessionAuth';
import { rateLimiter } from './rateLimiter';
import { adminStore } from '../adminStore';
import { ReservationRecord, IdempotencyRecord } from './types';

// In-memory idempotency cache (kept for 1 hour)
const idempotencyRecords = new Map<string, IdempotencyRecord>();

setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, record] of idempotencyRecords.entries()) {
    if (record.createdAt < oneHourAgo) {
      idempotencyRecords.delete(key);
    }
  }
}, 10 * 60 * 1000);

export type AIActionType = 'ai_chat' | 'photo_analysis' | 'voice' | 'room_scan' | 'complete_home' | 'pdf_report';

export interface AuthorizeResult {
  authorized: boolean;
  statusCode?: number;
  error?: string;
  code?: string;
  reservation?: ReservationRecord;
  authoritativeUserId?: string;
}

/**
 * Centralized authorization & cost-protection gateway for ALL AI routes
 */
export async function authorizeAndReserveAI(
  req: AuthenticatedUserRequest,
  res: Response,
  actionType: AIActionType
): Promise<AuthorizeResult> {
  const clientIp = getClientIp(req);

  // 1. GLOBAL EMERGENCY AI SAFETY CHECK
  const globalSafety = adminStore.getGlobalAiSafety();
  if (globalSafety.emergencyLockEnabled) {
    adminStore.recordSecurityEvent({
      type: 'GLOBAL_AI_LOCK_TRIGGERED',
      severity: 'warning',
      ip: clientIp,
      details: `Non-admin request rejected because Global AI emergency lock is active: ${globalSafety.emergencyReason}`,
    });
    return {
      authorized: false,
      statusCode: 503,
      code: 'GLOBAL_AI_LOCK_ACTIVE',
      error: 'AI usage limit temporarily reached. Please try again later.',
    };
  }

  if (globalSafety.dailyRequestLimit > 0 && globalSafety.todayRequestCount >= globalSafety.dailyRequestLimit) {
    return {
      authorized: false,
      statusCode: 429,
      code: 'GLOBAL_DAILY_LIMIT_REACHED',
      error: 'AI usage limit temporarily reached. Please try again later.',
    };
  }

  // 2. AUTHENTICATION IDENTITY VERIFICATION
  const userId = req.authoritativeUserId || req.userSession?.userId;
  if (!userId) {
    return {
      authorized: false,
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
      error: 'Authentication session required. Please initiate a valid user session.',
    };
  }

  // 3. IP RATE LIMIT CHECK (15 req/min)
  const ipCheck = rateLimiter.checkIpRateLimit(clientIp, 15);
  if (!ipCheck.allowed) {
    adminStore.recordSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'warning',
      ip: clientIp,
      userId,
      details: `IP ${clientIp} exceeded rate limit on ${req.path}`,
    });
    res.setHeader('Retry-After', ipCheck.retryAfterSeconds || 5);
    return {
      authorized: false,
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      error: `Rate limit exceeded. Please wait ${ipCheck.retryAfterSeconds} seconds before trying again.`,
    };
  }

  // 4. PER-USER COOLDOWN CHECK (Min 3 seconds between successive requests)
  const cooldownCheck = rateLimiter.checkUserCooldown(userId, 3000);
  if (!cooldownCheck.allowed) {
    return {
      authorized: false,
      statusCode: 429,
      code: 'REQUEST_TOO_FREQUENT',
      error: `Please wait ${cooldownCheck.waitSeconds} second(s) before sending another AI request.`,
    };
  }

  // 5. IDEMPOTENCY CHECK
  const requestId = (req.headers['x-request-id'] as string) || req.body?.requestId;
  if (requestId && typeof requestId === 'string') {
    const existing = idempotencyRecords.get(requestId);
    if (existing) {
      if (existing.status === 'in_progress') {
        return {
          authorized: false,
          statusCode: 409,
          code: 'DUPLICATE_REQUEST_IN_PROGRESS',
          error: 'An identical request is already being processed.',
        };
      }
      if (existing.status === 'completed' && existing.responsePayload) {
        // Return cached payload directly
        res.json(existing.responsePayload);
        return { authorized: false }; // Handled
      }
    }
  }

  // 6. CONCURRENT REQUEST LOCK (Max 1 active AI request per user)
  const lockResult = rateLimiter.acquireUserLock(userId);
  if (!lockResult.acquired) {
    adminStore.recordSecurityEvent({
      type: 'CONCURRENT_REQUEST_BLOCKED',
      severity: 'warning',
      ip: clientIp,
      userId,
      details: `User ${userId} attempted concurrent AI request while one was in-flight`,
    });
    return {
      authorized: false,
      statusCode: 429,
      code: 'CONCURRENT_REQUEST_LIMIT',
      error: lockResult.reason || 'Your AI credit is already being used. Please try again.',
    };
  }

  // 7. ATOMIC PLAN / ENTITLEMENT / CREDIT RESERVATION
  const reservationResult = adminStore.reserveUsageForAction(userId, actionType, requestId, clientIp);
  if (!reservationResult.success) {
    // Release in-flight user lock if reservation fails
    rateLimiter.releaseUserLock(userId);
    return {
      authorized: false,
      statusCode: 402,
      code: reservationResult.errorCode || 'INSUFFICIENT_ALLOWANCE',
      error: reservationResult.reason || 'Insufficient credits or trial allowance.',
    };
  }

  // Track in idempotency store
  if (requestId) {
    idempotencyRecords.set(requestId, {
      requestId,
      userId,
      actionType,
      status: 'in_progress',
      createdAt: Date.now(),
    });
  }

  return {
    authorized: true,
    reservation: reservationResult.reservation,
    authoritativeUserId: userId,
  };
}

/**
 * Finalize usage upon successful Gemini execution
 */
export function finalizeAIUsage(
  reservation: ReservationRecord,
  meta?: { modelUsed?: string; responseTimeMs?: number; responsePayload?: any }
) {
  // Release concurrent user lock
  rateLimiter.releaseUserLock(reservation.userId);

  // Commit reservation in admin store
  adminStore.finalizeUsage(reservation, meta);

  // Update idempotency cache if present
  if (reservation.requestId) {
    const record = idempotencyRecords.get(reservation.requestId);
    if (record) {
      record.status = 'completed';
      record.completedAt = Date.now();
      record.responsePayload = meta?.responsePayload;
    }
  }
}

/**
 * Safe rollback/refund logic if Gemini fails
 * Restores user credit or free allowance immediately
 */
export function rollbackAIUsage(
  reservation: ReservationRecord,
  errorReason: string
) {
  // Release concurrent user lock
  rateLimiter.releaseUserLock(reservation.userId);

  // Restore credit / free trial in admin store
  adminStore.rollbackUsage(reservation, errorReason);

  // Mark idempotency as failed
  if (reservation.requestId) {
    const record = idempotencyRecords.get(reservation.requestId);
    if (record) {
      record.status = 'failed';
    }
  }
}
