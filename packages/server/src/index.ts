import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ebotRouter } from './routes/ebot';
import { documentsRouter } from './routes/documents';
import { notesRouter } from './routes/notes';
import { spreadsheetsRouter } from './routes/spreadsheets';
import { presentationsRouter } from './routes/presentations';
import { usersRouter } from './routes/users';
import { tasksRouter } from './routes/tasks';
import { formsRouter } from './routes/forms';
import { versionsRouter } from './routes/versions';
import { emailRouter } from './routes/email';
import { databasesRouter } from './routes/databases';
import { driveRouter } from './routes/drive';
import { connectRouter } from './routes/connect';
import { swayRouter } from './routes/sway';
import { notificationsRouter } from './routes/notifications';
import { auditLog } from './middleware/audit';
import { sanitizeBody } from './middleware/sanitize';
import { authenticateToken } from './middleware/auth';
import { securityHeaders } from './middleware/security-headers';
import { globalLimiter, ebotLimiter } from './middleware/rate-limit';
import { setupCollaboration } from './services/collaboration';
import { setupSignaling } from './services/signaling';
import { setupChat } from './services/chat';
import { logger } from './services/logger';
import { generateMetrics } from './services/metrics';
import { requestLogger } from './middleware/request-logger';
import { startAutoBackup, stopAutoBackup } from './services/backup';
import { backupRouter } from './routes/backup';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [
      // Default development origins (Vite dev servers)
      ...Array.from({ length: 14 }, (_, i) => `http://localhost:${5170 + i}`),
    ];

// Security headers
app.use(securityHeaders);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);
app.use(express.json({ limit: '10mb' }));

// Canary instance identifier
const INSTANCE_ID = process.env.EOFFICE_INSTANCE || 'default';
app.use((_req, res, next) => {
  res.setHeader('X-Instance', INSTANCE_ID);
  if (INSTANCE_ID === 'canary') res.setHeader('X-Canary', 'true');
  next();
});
app.use(globalLimiter);
app.use(auditLog);
app.use(sanitizeBody);

// Health endpoint — detailed readiness check, no auth required
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
});

// Prometheus metrics endpoint — no auth required
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(generateMetrics());
});

// Readiness probe
app.get('/api/ready', (_req, res) => {
  res.json({ ready: true, storage: process.env.STORAGE_BACKEND || 'sqlite' });
});

// Auth routes — no auth required
app.use('/api/auth', usersRouter);

// All other routes require authentication
app.use('/api/ebot', authenticateToken, ebotLimiter, ebotRouter);
app.use('/api/documents', authenticateToken, documentsRouter);
app.use('/api/notes', authenticateToken, notesRouter);
app.use('/api/spreadsheets', authenticateToken, spreadsheetsRouter);
app.use('/api/presentations', authenticateToken, presentationsRouter);
app.use('/api/tasks', authenticateToken, tasksRouter);
app.use('/api/forms', authenticateToken, formsRouter);
app.use('/api/versions', authenticateToken, versionsRouter);
app.use('/api/email', authenticateToken, emailRouter);
app.use('/api/databases', authenticateToken, databasesRouter);
app.use('/api/drive', authenticateToken, driveRouter);
app.use('/api/connect', authenticateToken, connectRouter);
app.use('/api/sway', authenticateToken, swayRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);

// Create HTTP server for WebSocket upgrade
const server = http.createServer(app);

// WebSocket services
const collabWss = setupCollaboration(server);
const signalWss = setupSignaling(server);
const chatWss = setupChat(server);

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`eOffice Server v2.0.0 listening on port ${PORT}`);
  logger.info('REST API ready', { url: `http://localhost:${PORT}/api` });
  logger.info('WebSocket services ready', { collab: '/ws/collab', signal: '/ws/signal', chat: '/ws/chat' });
  // Start auto-backup in production
  if (process.env.NODE_ENV === 'production') {
    startAutoBackup();
  }
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);
  stopAutoBackup();

  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close WebSocket servers
  if (collabWss) {
    collabWss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    collabWss.close();
  }
  if (signalWss) {
    signalWss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    signalWss.close();
  }

  if (chatWss) {
    chatWss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    chatWss.close();
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.fatal('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
