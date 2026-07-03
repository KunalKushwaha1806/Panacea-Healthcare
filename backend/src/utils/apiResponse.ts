import { Response } from 'express';

export interface ApiResponseData<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export function sendSuccess<T>(res: Response, data: T, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res: Response, message: string, statusCode = 400, error?: string) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || message,
  });
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

export function sendNotFound(res: Response, message = 'Resource not found') {
  return sendError(res, message, 404);
}

export function sendUnauthorized(res: Response, message = 'Unauthorized') {
  return sendError(res, message, 401);
}

export function sendForbidden(res: Response, message = 'Forbidden') {
  return sendError(res, message, 403);
}

export function sendConflict(res: Response, message = 'Conflict') {
  return sendError(res, message, 409);
}
