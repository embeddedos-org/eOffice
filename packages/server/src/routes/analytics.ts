import { Router, Request, Response } from 'express';
import { AuthRequest, authorizeRole } from '../middleware/auth';
import { trackEvent, trackCrash, getDashboard, getStats, getCrashes } from '../services/analytics';

export const analyticsRouter = Router();

// POST /api/analytics/event — Track any event (from frontend apps)
analyticsRouter.post('/event', (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { type, app, action, metadata } = req.body;
  if (!type || !app || !action) {
    res.status(400).json({ error: 'type, app, and action are required' });
    return;
  }

  trackEvent({
    type,
    app,
    action,
    userId: user?.id,
    metadata,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.socket.remoteAddress,
  });

  res.status(202).json({ status: 'tracked' });
});

// POST /api/analytics/crash — Report a crash/error
analyticsRouter.post('/crash', (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { app, error, stack, version } = req.body;
  if (!app || !error) {
    res.status(400).json({ error: 'app and error are required' });
    return;
  }

  trackCrash({
    app,
    error,
    stack,
    version,
    userId: user?.id,
    userAgent: req.get('user-agent'),
  });

  res.status(202).json({ status: 'reported' });
});

// GET /api/analytics/dashboard — Full analytics dashboard (admin only)
analyticsRouter.get('/dashboard', (req: Request, res: Response) => {
  const dashboard = getDashboard();
  res.json(dashboard);
});

// GET /api/analytics/stats?days=7 — Daily stats
analyticsRouter.get('/stats', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  res.json(getStats(days));
});

// GET /api/analytics/crashes?limit=50 — Recent crashes
analyticsRouter.get('/crashes', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(getCrashes(limit));
});
