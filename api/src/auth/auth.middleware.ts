import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from './auth.service';
import { Role, PERMISSION_MATRIX } from './roles';
import { query } from '../db';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = AuthService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Access token expired or invalid' });
  }
}

export function authorise(allowedRoles?: Role[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    }

    const routeKey = `${req.method} ${req.route ? req.route.path : req.path}`;
    const matrixRoles = PERMISSION_MATRIX[routeKey];
    const requiredRoles = allowedRoles || matrixRoles;

    if (requiredRoles && !requiredRoles.includes(req.user.role)) {
      // Audit log RBAC violation
      await query(
        `INSERT INTO audit_logs (acting_user_id, table_name, operation, event, ip_address, user_agent)
         VALUES ($1, 'rbac', 'ACCESS_DENIED', 'RBAC_VIOLATION', $2, $3)`,
        [req.user.sub, req.ip || '127.0.0.1', req.headers['user-agent'] || '']
      );

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Role ${req.user.role} does not have required permissions for ${req.method} ${req.path}`,
      });
    }

    next();
  };
}
