import { Request, Response, NextFunction } from 'express';
import { adminStore, AdminRole, AdminUser } from './adminStore';

export interface AdminAuthRequest extends Request {
  admin?: AdminUser;
}

/**
 * Extracts bearer token or x-admin-token header
 */
export function extractAdminToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-admin-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]).trim();
    }
  }
  return null;
}

/**
 * Sanitize admin object so password hash and salt are never returned
 */
export function sanitizeAdmin(admin: AdminUser) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
  };
}

/**
 * Middleware: Strictly requires authenticated Admin session
 */
export function requireAdminAuth(allowedRoles?: AdminRole[]) {
  return (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    const token = extractAdminToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Admin authentication token required',
        code: 'UNAUTHORIZED_ADMIN',
      });
    }

    const { valid, admin, reason } = adminStore.validateSession(token);
    if (!valid || !admin) {
      if (reason === 'SUSPENDED') {
        adminStore.logAudit(
          { id: admin?.id || 'unknown', name: admin?.name || 'Suspended Admin' },
          'SUSPENDED_ADMIN_BLOCKED',
          req.originalUrl || req.url,
          `Blocked attempt to access ${req.method} ${req.originalUrl} by suspended account.`
        );
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Admin account is suspended. Access denied.',
          code: 'ADMIN_ACCOUNT_SUSPENDED',
        });
      }

      return res.status(401).json({
        success: false,
        error: reason === 'EXPIRED'
          ? 'Unauthorized: Admin session expired. Please login again.'
          : 'Unauthorized: Session invalid or expired. Please login again.',
        code: reason === 'EXPIRED' ? 'SESSION_EXPIRED' : 'INVALID_ADMIN_SESSION',
      });
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(admin.role) && admin.role !== 'SUPER_ADMIN') {
        adminStore.logAudit(
          { id: admin.id, name: admin.name },
          'UNAUTHORIZED_ROLE_ACCESS_BLOCKED',
          req.originalUrl || req.url,
          `Blocked unauthorized attempt to ${req.method} ${req.originalUrl}. Role '${admin.role}' lacks required: [${allowedRoles.join(', ')}]`
        );

        return res.status(403).json({
          success: false,
          error: `Forbidden: Insufficient privileges. Only verified administrators (${allowedRoles.join(', ')}) can perform this action.`,
          code: 'FORBIDDEN_ADMIN_ROLE',
          requiredRoles: allowedRoles,
          currentRole: admin.role,
        });
      }
    }

    req.admin = admin;
    next();
  };
}

/**
 * Middleware: Strictly requires verified Administrator privilege ('SUPER_ADMIN' or 'ADMIN').
 * Rejects requests from unauthorized users or lower staff roles (e.g., CONTENT_MANAGER, SUPPORT).
 */
export const requireVerifiedAdmin = (allowedRoles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN']) =>
  requireAdminAuth(allowedRoles);

/**
 * Middleware: Strictly requires Super Administrator privilege
 */
export const requireSuperAdmin = () => requireAdminAuth(['SUPER_ADMIN']);

