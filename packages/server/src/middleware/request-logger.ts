import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = logger.generateRequestId();
  const start = Date.now();

  // Attach request ID to response headers
  res.setHeader('X-Request-Id', requestId);

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent')?.substring(0, 100),
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error', logData);
    } else if (duration > 5000) {
      logger.warn('Slow request', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
