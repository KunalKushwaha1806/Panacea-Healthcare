import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('❌ Unhandled error:', err);

  if (err.name === 'ZodError') {
    sendError(res, 'Validation error', 422, err.message);
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      sendError(res, 'A record with this value already exists', 409);
      return;
    }
    if (prismaErr.code === 'P2025') {
      sendError(res, 'Record not found', 404);
      return;
    }
  }

  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Token expired', 401);
    return;
  }

  sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
}
