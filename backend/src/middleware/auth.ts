import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendUnauthorized, sendForbidden } from '../utils/apiResponse';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

/**
 * Verify JWT token from Authorization header.           
 * Attaches decoded payload to req.user.
 * forbidden if token is invalid or expired.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    sendUnauthorized(res, 'Invalid or expired token');
  }
}

/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate middleware.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendForbidden(res, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
      return;
    }

    next();
  };
}
