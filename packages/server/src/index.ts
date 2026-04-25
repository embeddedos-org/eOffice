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
import { auditLog } from './middleware/audit';
import { sanitizeBody } from './middleware/sanitize';
import { authenticateToken } from './middleware/auth';
import { securityHeaders } from './middleware/security-headers';
import { globalLimiter, ebotLimiter } from './middleware/rate-limit';
import { setupCollaboration } from './services/collaboration';
import { setupSignaling } from './services/signaling';
import { setupChat } from './services/chat';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  'http://localhost:5170,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180,http://localhost:5181,http://localhost:5182,http://localhost:5183'
).split(',');

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
app.use(globalLimiter);
app.use(auditLog);
app.use(sanitizeBody);

// Health endpoint — minimal info, no auth required
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
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

// Create HTTP server for WebSocket upgrade
const server = http.createServer(app);

// WebSocket services
const collabWss = setupCollaboration(server);
const signalWss = setupSignaling(server);
const chatWss = setupChat(server);

server.listen(PORT, () => {
  console.log(`eOffice Server v0.2.0 listening on port ${PORT}`);
  console.log(`  REST API:    http://localhost:${PORT}/api`);
  console.log(`  WebSocket:   ws://localhost:${PORT}/ws/collab (collaboration)`);
  console.log(`  WebSocket:   ws://localhost:${PORT}/ws/signal (video calling)`);
  console.log(`  WebSocket:   ws://localhost:${PORT}/ws/chat (real-time messaging)`);
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed.');
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
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
