// @ts-nocheck
import { describe, it, expect } from 'vitest';
import express from 'express';
import { connectRouter } from '../routes/connect';
import { formsRouter } from '../routes/forms';
import { swayRouter } from '../routes/sway';
import { tasksRouter } from '../routes/tasks';
import { databasesRouter } from '../routes/databases';
import { driveRouter } from '../routes/drive';
import { presentationsRouter } from '../routes/presentations';

function mockReq(overrides: Record<string, unknown> = {}) {
  return { params: {}, query: {}, body: {}, user: { id: 'test-user-1', username: 'testuser', email: 'test@test.com', role: 'user' }, ...overrides } as unknown as express.Request;
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

describe('Connect Routes (eConnect)', () => {
  it('GET /channels returns channels', () => {
    const res = mockRes();
    findHandler(connectRouter, '/channels', 'get')?.(mockReq(), res);
    expect(res.body).toBeDefined();
  });
});

describe('Forms Routes (eForms)', () => {
  it('GET / returns forms', () => {
    const res = mockRes();
    findHandler(formsRouter, '/', 'get')?.(mockReq(), res);
    expect(res.body).toBeDefined();
  });

  it('POST / returns 400 without title', () => {
    const res = mockRes();
    findHandler(formsRouter, '/', 'post')?.(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('Sway Routes (eSway)', () => {
  it('GET / returns sways', () => {
    const res = mockRes();
    findHandler(swayRouter, '/', 'get')?.(mockReq(), res);
    expect(res.body).toBeDefined();
  });
});

describe('Tasks Routes (ePlanner)', () => {
  it('GET /boards returns boards', () => {
    const res = mockRes();
    findHandler(tasksRouter, '/boards', 'get')?.(mockReq({ query: {} }), res);
    expect(res.body).toBeDefined();
  });

  it('POST /boards returns 400 without name', () => {
    const res = mockRes();
    findHandler(tasksRouter, '/boards', 'post')?.(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /boards/:id returns 404 for unknown', () => {
    const res = mockRes();
    findHandler(tasksRouter, '/boards/:id', 'delete')?.(mockReq({ params: { id: 'unknown' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('Database Routes (eDB)', () => {
  it('GET /tables returns tables', () => {
    const res = mockRes();
    findHandler(databasesRouter, '/tables', 'get')?.(mockReq(), res);
    expect(res.body).toBeDefined();
  });
});

describe('Drive Routes (eDrive)', () => {
  it('GET / returns files', () => {
    const res = mockRes();
    findHandler(driveRouter, '/', 'get')?.(mockReq({ query: {} }), res);
    expect(res.body).toBeDefined();
  });
});

describe('Presentations Routes (eSlides)', () => {
  it('GET / returns presentations', () => {
    const res = mockRes();
    findHandler(presentationsRouter, '/', 'get')?.(mockReq(), res);
    expect(res.body).toBeDefined();
  });

  it('POST / returns 400 without title', () => {
    const res = mockRes();
    findHandler(presentationsRouter, '/', 'post')?.(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('POST / creates presentation with 201', () => {
    const res = mockRes();
    findHandler(presentationsRouter, '/', 'post')?.(mockReq({ body: { title: 'My Slides' } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).title).toBe('My Slides');
  });
});
