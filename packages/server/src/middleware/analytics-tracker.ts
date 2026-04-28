import { Request, Response, NextFunction } from 'express';
import { trackEvent } from '../services/analytics';
import { AuthRequest } from './auth';

/**
 * Middleware that automatically tracks API calls as analytics events.
 * Tracks: method, path, status, and response time.
 */
export function analyticsTracker(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = (req as AuthRequest).user;

    // Determine the app from the URL path
    const pathParts = req.originalUrl.split('/');
    const app = pathParts[2] || 'api'; // e.g., /api/documents -> "documents"

    // Skip analytics and health endpoints to avoid recursion
    if (app === 'analytics' || app === 'health' || app === 'ready' || req.originalUrl === '/metrics') {
      return;
    }

    trackEvent({
      type: 'api_call',
      app,
      action: `${req.method} ${req.originalUrl.split('?')[0]}`,
      userId: user?.id,
      metadata: {
        status: res.statusCode,
        duration,
        method: req.method,
      },
    });
  });

  next();
}
