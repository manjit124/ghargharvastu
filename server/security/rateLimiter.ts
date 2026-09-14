import { Request, Response, NextFunction } from 'express';
import { getClientIp } from './sessionAuth';
import { adminStore } from '../adminStore';

interface RateLimitBucket {
  timestamps: number[];
}

const ipBuckets = new Map<string, RateLimitBucket>();
const userLastRequestTime = new Map<string, number>();
const activeUserLocks = new Set<string>();

// Cleanup stale rate limit buckets every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 60 * 1000;
  for (const [ip, bucket] of ipBuckets.entries()) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length === 0) {
      ipBuckets.delete(ip);
    }
  }

  // Clear stale locks (> 2 minutes without resolution)
  const staleCutoff = Date.now() - 2 * 60 * 1000;
  for (const [userId, time] of userLastRequestTime.entries()) {
    if (time < staleCutoff && activeUserLocks.has(userId)) {
      activeUserLocks.delete(userId);
    }
  }
}, 5 * 60 * 1000);

export const rateLimiter = {
  /**
   * Check IP-based rate limiting (Default: 15 req/min on AI endpoints)
   */
  checkIpRateLimit(
    ip: string,
    limit = 15,
    windowMs = 60 * 1000
  ): { allowed: boolean; retryAfterSeconds?: number; currentCount: number } {
    const now = Date.now();
    let bucket = ipBuckets.get(ip);
    if (!bucket) {
      bucket = { timestamps: [] };
      ipBuckets.set(ip, bucket);
    }

    // Filter out timestamps older than the window
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= limit) {
      const oldestInWindow = bucket.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      return {
        allowed: false,
        retryAfterSeconds,
        currentCount: bucket.timestamps.length,
      };
    }

    bucket.timestamps.push(now);
    return { allowed: true, currentCount: bucket.timestamps.length };
  },

  /**
   * Check minimum interval between requests for a single user (Default: 3 seconds)
   */
  checkUserCooldown(userId: string, minIntervalMs = 3000): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const lastTime = userLastRequestTime.get(userId);

    if (lastTime && now - lastTime < minIntervalMs) {
      const waitSeconds = Math.max(1, Math.ceil((lastTime + minIntervalMs - now) / 1000));
      return { allowed: false, waitSeconds };
    }

    return { allowed: true };
  },

  /**
   * Acquire single-user concurrent request lock
   * Prevents simultaneous double-spend requests (e.g. 10 requests at once with 1 credit)
   */
  acquireUserLock(userId: string): { acquired: boolean; reason?: string } {
    if (activeUserLocks.has(userId)) {
      return {
        acquired: false,
        reason: 'Your AI credit is already being used. Please wait for your current analysis to complete.',
      };
    }

    activeUserLocks.add(userId);
    userLastRequestTime.set(userId, Date.now());
    return { acquired: true };
  },

  /**
   * Release single-user concurrent request lock
   */
  releaseUserLock(userId: string) {
    activeUserLocks.delete(userId);
    userLastRequestTime.set(userId, Date.now());
  },

  /**
   * Inspect if user has an active lock
   */
  isUserLocked(userId: string): boolean {
    return activeUserLocks.has(userId);
  },
};

/**
 * Express middleware to enforce IP rate limits on AI endpoints
 */
export function ipRateLimitMiddleware(limitPerMinute = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const result = rateLimiter.checkIpRateLimit(ip, limitPerMinute);

    if (!result.allowed) {
      adminStore.recordSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'warning',
        ip,
        details: `IP ${ip} exceeded limit of ${limitPerMinute} req/min on ${req.path}`,
      });

      res.setHeader('Retry-After', result.retryAfterSeconds || 5);
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${result.retryAfterSeconds} seconds before trying again.`,
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: result.retryAfterSeconds,
      });
    }

    next();
  };
}
