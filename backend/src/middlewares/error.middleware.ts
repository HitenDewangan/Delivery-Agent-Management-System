import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { AppError } from '../utils/errors';

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // body-parser errors (malformed JSON, payload too large) carry an HTTP status.
  const status = (err as { status?: unknown }).status;
  const type = (err as { type?: unknown }).type;
  if (typeof status === 'number' && status >= 400 && status < 500 && typeof type === 'string') {
    const message = type === 'entity.parse.failed' ? 'Malformed JSON body' : 'Invalid request body';
    return sendError(res, status, 'BAD_REQUEST', message);
  }

  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong');
}
