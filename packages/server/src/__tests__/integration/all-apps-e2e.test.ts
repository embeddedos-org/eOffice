// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import crypto from 'crypto';

// Import all routers
import { documentsRouter } from '../../routes/documents';
import { notesRouter } from '../../routes/notes';
import { spreadsheetsRouter } from '../../routes/spreadsheets';
import { presentationsRouter } from '../../routes/presentations';
import { usersRouter } from '../../routes/users';
import { tasksRouter } from '../../routes/tasks';
import { formsRouter } from '../../routes/forms';
import { emailRouter } from '../../routes/email';
import { databasesRouter } from '../../routes/databases';
import { driveRouter } from '../../routes/drive';
import { connectRouter } from '../../routes/connect';
import { swayRouter } from '../../routes/sway';
import { ebotRouter } from '../../routes/ebot';
import { notificationsRouter } from '../../routes/notifications';
import { createToken } from '../../middleware/auth';

// --- Mock helpers (same pattern as existing tests) ---
const TEST_USER = { id: 'e2e-user-1', username: 'e2e_tester', email: 'e2e@test.com', role: 'user' };
const AUTH_TOKEN = createToken(TEST_USER);

function mockReq(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: { authorization: `Bearer ${AUTH_TOKEN}` },
    user: TEST_USER,
    ...overrides,
  } as unknown as express.Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.send = (data?: unknown) => { if (data) res.body = data; return res; };
  res.end = () => res;
  res.setHeader = () => res;
  res.statusCode = 200;
  return res as unknown as express.Response & { body: unknown; statusCode: number };
}

// Helper to get a route handler from an Express router
function getHandler(router: any, method: string, path: string) {
  const stack = router.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (routeMethod === method && routePath === path) {
        return layer.route.stack[layer.route.stack.length - 1].handle;
      }
    }
  }
  return null;
}

// Direct handler call helper
async function callHandler(router: any, method: string, path: string, reqOverrides = {}) {
  const handler = getHandler(router, method, path);
  if (!handler) throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
  const req = mockReq(reqOverrides);
  const res = mockRes();
  await handler(req, res);
  return res;
}

// ======================================================================
describe('eOffice Full E2E — All 12 Apps (Direct Handler Tests)', () => {

  // ============================
  // App 1: eDocs (Documents)
  // ============================
  describe('App 1: eDocs', () => {
    let docId = '';

    it('POST / creates a document', async () => {
      const res = await callHandler(documentsRouter, 'post', '/', {
        body: { title: 'E2E Test Doc', content: '<p>Hello</p>', app_id: 'edocs' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('E2E Test Doc');
      docId = res.body.id;
    });

    it('GET / lists documents', async () => {
      const res = await callHandler(documentsRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
      expect(res.body.documents).toBeDefined();
    });

    it('GET /:id returns a document', async () => {
      const res = await callHandler(documentsRouter, 'get', '/:id', { params: { id: docId } });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('E2E Test Doc');
    });

    it('PUT /:id updates a document', async () => {
      const res = await callHandler(documentsRouter, 'put', '/:id', {
        params: { id: docId },
        body: { title: 'Updated E2E Doc' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated E2E Doc');
    });

    it('DELETE /:id deletes a document', async () => {
      const res = await callHandler(documentsRouter, 'delete', '/:id', { params: { id: docId } });
      expect(res.statusCode).toBe(204);
    });
  });

  // ============================
  // App 2: eSheets
  // ============================
  describe('App 2: eSheets', () => {
    let sheetId = '';

    it('POST / creates a spreadsheet', async () => {
      const res = await callHandler(spreadsheetsRouter, 'post', '/', {
        body: { title: 'E2E Sheet', app_id: 'esheets' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBeDefined();
      sheetId = res.body.id;
    });

    it('GET / lists spreadsheets', async () => {
      const res = await callHandler(spreadsheetsRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('GET /:id returns a spreadsheet', async () => {
      const res = await callHandler(spreadsheetsRouter, 'get', '/:id', { params: { id: sheetId } });
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 3: eSlides
  // ============================
  describe('App 3: eSlides', () => {
    it('POST / creates a presentation', async () => {
      const res = await callHandler(presentationsRouter, 'post', '/', {
        body: { title: 'E2E Slides', app_id: 'eslides' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('GET / lists presentations', async () => {
      const res = await callHandler(presentationsRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 4: eNotes
  // ============================
  describe('App 4: eNotes', () => {
    it('POST / creates a note', async () => {
      const res = await callHandler(notesRouter, 'post', '/', {
        body: { title: 'E2E Note', content: 'Test content', app_id: 'enotes' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('GET / lists notes', async () => {
      const res = await callHandler(notesRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 5: eMail
  // ============================
  describe('App 5: eMail', () => {
    it('GET /accounts lists accounts', async () => {
      const res = await callHandler(emailRouter, 'get', '/accounts');
      expect(res.statusCode).toBe(200);
    });

    it('GET /messages lists messages', async () => {
      const res = await callHandler(emailRouter, 'get', '/messages');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 6: eDB
  // ============================
  describe('App 6: eDB', () => {
    it('GET /tables lists tables', async () => {
      const res = await callHandler(databasesRouter, 'get', '/tables');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 7: eDrive
  // ============================
  describe('App 7: eDrive', () => {
    it('GET / lists files', async () => {
      const res = await callHandler(driveRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 8: eConnect
  // ============================
  describe('App 8: eConnect', () => {
    it('GET /channels lists channels', async () => {
      const res = await callHandler(connectRouter, 'get', '/channels');
      expect(res.statusCode).toBe(200);
    });

    it('POST /channels creates a channel', async () => {
      const res = await callHandler(connectRouter, 'post', '/channels', {
        body: { name: `e2e-ch-${Date.now()}`, description: 'E2E test channel' },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  // ============================
  // App 9: ePlanner
  // ============================
  describe('App 9: ePlanner', () => {
    it('GET /boards lists boards', async () => {
      const res = await callHandler(tasksRouter, 'get', '/boards');
      expect(res.statusCode).toBe(200);
    });

    it('POST /boards creates a board', async () => {
      const res = await callHandler(tasksRouter, 'post', '/boards', {
        body: { name: 'E2E Board', title: 'E2E Board' },
      });
      expect([200, 201]).toContain(res.statusCode);
    });
  });

  // ============================
  // App 10: eForms
  // ============================
  describe('App 10: eForms', () => {
    it('POST / creates a form', async () => {
      const res = await callHandler(formsRouter, 'post', '/', {
        body: { title: 'E2E Form', app_id: 'eforms' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('GET / lists forms', async () => {
      const res = await callHandler(formsRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 11: eSway
  // ============================
  describe('App 11: eSway', () => {
    it('GET / lists sway content', async () => {
      const res = await callHandler(swayRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // App 12: eBot AI
  // ============================
  describe('App 12: eBot AI', () => {
    it('GET /status returns provider status', async () => {
      const res = await callHandler(ebotRouter, 'get', '/status');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.providers).toBeDefined();
      expect(res.body.features).toBeDefined();
    });

    it('GET /models returns available models', async () => {
      const res = await callHandler(ebotRouter, 'get', '/models');
      expect(res.statusCode).toBe(200);
      expect(res.body.models).toBeDefined();
    });

    it('POST /reset resets conversation', async () => {
      const res = await callHandler(ebotRouter, 'post', '/reset');
      expect(res.statusCode).toBe(200);
    });

    it('POST /search performs RAG search', async () => {
      const res = await callHandler(ebotRouter, 'post', '/search', {
        body: { query: 'test document' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBeDefined();
    });

    it('POST /index indexes a document', async () => {
      const res = await callHandler(ebotRouter, 'post', '/index', {
        body: { docId: 'e2e-1', appType: 'edocs', title: 'E2E Doc', content: 'Test' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('indexed');
    });
  });

  // ============================
  // Cross-App: Notifications
  // ============================
  describe('Cross-App: Notifications', () => {
    it('POST / creates a notification', async () => {
      const res = await callHandler(notificationsRouter, 'post', '/', {
        body: { title: 'E2E Test', message: 'Notification test', type: 'info', app: 'e2e' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('GET / lists notifications', async () => {
      const res = await callHandler(notificationsRouter, 'get', '/');
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================
  // Auth (tested via createToken)
  // ============================
  describe('Auth Token Verification', () => {
    it('createToken produces a valid JWT', () => {
      const token = createToken({ id: 'test', username: 'test', email: 'test@test.com', role: 'user' });
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });
  });
});
