// @ts-nocheck
import { describe, it, expect } from 'vitest';
import express from 'express';
import { emailRouter } from '../routes/email';

function mockReq(overrides: Record<string, unknown> = {}) {
  return { params: {}, query: {}, body: {}, ...overrides } as unknown as express.Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.send = () => res;
  res.statusCode = 200;
  return res as unknown as express.Response & { body: unknown; statusCode: number };
}

function findHandler(router: any, path: string, method: string) {
  return router.stack
    .find((layer: any) => layer.route?.path === path && layer.route?.methods?.[method])
    ?.route?.stack[0]?.handle;
}

describe('Email Routes', () => {
  describe('GET /api/email/accounts', () => {
    it('returns accounts array', () => {
      const req = mockReq();
      const res = mockRes();
      findHandler(emailRouter, '/accounts', 'get')?.(req, res);
      expect(res.body).toHaveProperty('accounts');
      expect(Array.isArray((res.body as any).accounts)).toBe(true);
    });
  });

  describe('POST /api/email/accounts', () => {
    it('returns 400 when email is missing', async () => {
      const req = mockReq({ body: { password: 'test123' } });
      const res = mockRes();
      await findHandler(emailRouter, '/accounts', 'post')?.(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const req = mockReq({ body: { email: 'test@test.com' } });
      const res = mockRes();
      await findHandler(emailRouter, '/accounts', 'post')?.(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/email/messages', () => {
    it('returns empty messages when no accountId', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      await findHandler(emailRouter, '/messages', 'get')?.(req, res);
      expect(res.body).toEqual({ messages: [], total: 0 });
    });
  });

  describe('POST /api/email/messages (legacy)', () => {
    it('returns 400 when to is missing', () => {
      const req = mockReq({ body: { subject: 'Test' } });
      const res = mockRes();
      findHandler(emailRouter, '/messages', 'post')?.(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when subject is missing', () => {
      const req = mockReq({ body: { to: 'test@test.com' } });
      const res = mockRes();
      findHandler(emailRouter, '/messages', 'post')?.(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('creates a message with 201 status', () => {
      const req = mockReq({ body: { to: 'bob@test.com', subject: 'Hello', body: 'Hi there' } });
      const res = mockRes();
      findHandler(emailRouter, '/messages', 'post')?.(req, res);
      expect(res.statusCode).toBe(201);
      const body = res.body as any;
      expect(body.id).toBeDefined();
      expect(body.to).toBe('bob@test.com');
      expect(body.subject).toBe('Hello');
    });
  });

  describe('PUT /api/email/messages/:id/read (legacy)', () => {
    it('returns read status in legacy mode', async () => {
      const req = mockReq({ params: { id: '123' }, body: { read: true } });
      const res = mockRes();
      await findHandler(emailRouter, '/messages/:id/read', 'put')?.(req, res);
      expect((res.body as any).read).toBe(true);
    });
  });

  describe('PUT /api/email/messages/:id/star (legacy)', () => {
    it('returns starred status in legacy mode', async () => {
      const req = mockReq({ params: { id: '123' }, body: { starred: true } });
      const res = mockRes();
      await findHandler(emailRouter, '/messages/:id/star', 'put')?.(req, res);
      expect((res.body as any).starred).toBe(true);
    });
  });

  describe('DELETE /api/email/messages/:id (legacy)', () => {
    it('returns 204 in legacy mode', async () => {
      const req = mockReq({ params: { id: '123' }, query: {} });
      const res = mockRes();
      await findHandler(emailRouter, '/messages/:id', 'delete')?.(req, res);
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Calendar Events', () => {
    it('GET /events returns empty initially', () => {
      const req = mockReq();
      const res = mockRes();
      findHandler(emailRouter, '/events', 'get')?.(req, res);
      expect(res.body).toEqual({ events: [], total: 0 });
    });

    it('POST /events returns 400 without title', () => {
      const req = mockReq({ body: { start: '2026-04-01' } });
      const res = mockRes();
      findHandler(emailRouter, '/events', 'post')?.(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('POST /events creates event with 201', () => {
      const req = mockReq({ body: { title: 'Meeting', start: '2026-04-01T10:00:00' } });
      const res = mockRes();
      findHandler(emailRouter, '/events', 'post')?.(req, res);
      expect(res.statusCode).toBe(201);
      expect((res.body as any).title).toBe('Meeting');
    });

    it('DELETE /events/:id returns 404 for unknown', () => {
      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      findHandler(emailRouter, '/events/:id', 'delete')?.(req, res);
      expect(res.statusCode).toBe(404);
    });
  });
});
