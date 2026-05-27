// @ts-nocheck
/**
 * Comprehensive Databases, Analytics, and Versions Route Tests
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { databasesRouter } from '../routes/databases';
import { analyticsRouter } from '../routes/analytics';
import { versionsRouter } from '../routes/versions';

const USER_A = { id: 'db-user-a-' + Date.now(), username: 'alice', email: 'alice@db.com', role: 'user' };
const USER_B = { id: 'db-user-b-' + Date.now(), username: 'bob', email: 'bob@db.com', role: 'user' };
const ADMIN_USER = { id: 'admin-user-' + Date.now(), username: 'admin', email: 'admin@eoffice.com', role: 'admin' };

function mockReq(overrides: Record<string, unknown> = {}, user = USER_A) {
  const req: Record<string, unknown> = { params: {}, query: {}, body: {}, user, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' }, ...overrides };
  req.get = (header: string) => header === 'user-agent' ? 'test-agent/1.0' : undefined;
  return req as unknown as express.Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.send = (data?: unknown) => { if (data !== undefined) res.body = data; return res; };
  res.statusCode = 200;
  return res as unknown as express.Response & { body: unknown; statusCode: number };
}

function findHandler(router: any, method: string, path: string) {
  for (const layer of router.stack) {
    if (layer.route?.path === path && layer.route?.methods?.[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle;
    }
  }
  throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
}

// ============================================================
// DATABASE TESTS
// ============================================================
function createTable(name: string, columns: unknown[] = [], user = USER_A) {
  const res = mockRes();
  findHandler(databasesRouter, 'post', '/tables')(mockReq({ body: { name, columns } }, user), res);
  return res.body as Record<string, unknown>;
}

describe('Databases — GET /tables', () => {
  it('returns tables array', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'get', '/tables')(mockReq({}), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).tables).toBeInstanceOf(Array);
  });

  it('isolates tables by user', () => {
    const tableA = createTable('TableA-' + Date.now(), [], USER_A);
    const tableB = createTable('TableB-' + Date.now(), [], USER_B);

    const resA = mockRes();
    findHandler(databasesRouter, 'get', '/tables')(mockReq({}, USER_A), resA);
    const tablesA = (resA.body as any).tables as any[];
    expect(tablesA.some((t: any) => t.id === tableA.id)).toBe(true);
    expect(tablesA.some((t: any) => t.id === tableB.id)).toBe(false);
  });
});

describe('Databases — POST /tables', () => {
  it('returns 400 when name is missing', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'post', '/tables')(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when not authenticated', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'post', '/tables')(mockReq({ body: { name: 'Test' }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a table with 201', () => {
    const name = 'Customers-' + Date.now();
    const columns = [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ];
    const res = mockRes();
    findHandler(databasesRouter, 'post', '/tables')(mockReq({ body: { name, columns } }), res);
    expect(res.statusCode).toBe(201);
    const table = res.body as any;
    expect(table.id).toBeTruthy();
    expect(table.name).toBe(name);
    expect(table.columns).toHaveLength(3);
    expect(table.rows).toEqual([]);
  });
});

describe('Databases — GET /tables/:id', () => {
  it('returns 404 for non-existent table', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'get', '/tables/:id')(mockReq({ params: { id: 'ghost-table' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns table by id for owner', () => {
    const table = createTable('Fetch Table ' + Date.now());
    const res = mockRes();
    findHandler(databasesRouter, 'get', '/tables/:id')(mockReq({ params: { id: table.id } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(table.id);
  });
});

describe('Databases — DELETE /tables/:id', () => {
  it('returns 404 for non-existent table', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'delete', '/tables/:id')(mockReq({ params: { id: 'ghost-del-table' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes table with 204', () => {
    const table = createTable('Delete Table ' + Date.now());
    const res = mockRes();
    findHandler(databasesRouter, 'delete', '/tables/:id')(mockReq({ params: { id: table.id } }), res);
    expect(res.statusCode).toBe(204);
  });
});

describe('Databases — POST /tables/:id/rows', () => {
  it('returns 404 for non-existent table', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'post', '/tables/:id/rows')(mockReq({ params: { id: 'ghost-table-rows' }, body: { row: {} } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('adds a row with 201 (using row field)', () => {
    const table = createTable('Row Test Table ' + Date.now(), [{ name: 'name', type: 'text' }]);
    const res = mockRes();
    findHandler(databasesRouter, 'post', '/tables/:id/rows')(mockReq({
      params: { id: table.id },
      body: { row: { name: 'Alice' } }
    }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).row).toEqual({ name: 'Alice' });
    expect(typeof (res.body as any).index).toBe('number');
  });

  it('adds a row using direct body (no row wrapper)', () => {
    const table = createTable('Row Direct Test ' + Date.now());
    const res = mockRes();
    findHandler(databasesRouter, 'post', '/tables/:id/rows')(mockReq({
      params: { id: table.id },
      body: { name: 'Bob', age: 30 }
    }), res);
    expect(res.statusCode).toBe(201);
  });
});

describe('Databases — PUT /tables/:id/rows/:index', () => {
  it('returns 404 for non-existent table', () => {
    const res = mockRes();
    findHandler(databasesRouter, 'put', '/tables/:id/rows/:index')(mockReq({ params: { id: 'ghost-table', index: '0' }, body: { row: {} } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for out-of-range row index', () => {
    const table = createTable('Update Row Table ' + Date.now());
    const res = mockRes();
    findHandler(databasesRouter, 'put', '/tables/:id/rows/:index')(mockReq({ params: { id: table.id, index: '999' }, body: { row: {} } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates a row', () => {
    const table = createTable('Update Row Test ' + Date.now(), [{ name: 'name', type: 'text' }]);
    // Add a row first
    findHandler(databasesRouter, 'post', '/tables/:id/rows')(mockReq({ params: { id: table.id }, body: { row: { name: 'Old Name' } } }), mockRes());
    // Update it
    const res = mockRes();
    findHandler(databasesRouter, 'put', '/tables/:id/rows/:index')(mockReq({ params: { id: table.id, index: '0' }, body: { row: { name: 'New Name' } } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).row.name).toBe('New Name');
  });
});

describe('Databases — DELETE /tables/:id/rows/:index', () => {
  it('returns 404 for out-of-range row index', () => {
    const table = createTable('Delete Row Table ' + Date.now());
    const res = mockRes();
    findHandler(databasesRouter, 'delete', '/tables/:id/rows/:index')(mockReq({ params: { id: table.id, index: '999' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a row with 204', () => {
    const table = createTable('Delete Row Test ' + Date.now());
    findHandler(databasesRouter, 'post', '/tables/:id/rows')(mockReq({ params: { id: table.id }, body: { row: { val: 1 } } }), mockRes());
    const res = mockRes();
    findHandler(databasesRouter, 'delete', '/tables/:id/rows/:index')(mockReq({ params: { id: table.id, index: '0' } }), res);
    expect(res.statusCode).toBe(204);
  });
});

// ============================================================
// ANALYTICS TESTS
// ============================================================
describe('Analytics — POST /event', () => {
  it('returns 400 when type, app, or action is missing', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'post', '/event')(mockReq({ body: { type: 'feature_use' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('tracks an event with 202 (async tracking)', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'post', '/event')(mockReq({
      body: { type: 'feature_use', app: 'edocs', action: 'document_created', metadata: { docId: '123' } }
    }), res);
    expect(res.statusCode).toBe(202);
    expect((res.body as any).status).toBe('tracked');
  });
});

describe('Analytics — POST /crash', () => {
  it('returns 400 when app or error is missing', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'post', '/crash')(mockReq({ body: { app: 'edocs' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('reports a crash with 202', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'post', '/crash')(mockReq({
      body: { app: 'edocs', error: 'TypeError: Cannot read property', stack: 'Error: ...\n  at App.tsx:42' }
    }), res);
    expect(res.statusCode).toBe(202);
    expect((res.body as any).status).toBe('reported');
  });
});

describe('Analytics — GET /dashboard', () => {
  it('returns dashboard data (no admin restriction in current implementation)', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'get', '/dashboard')(mockReq({}, USER_A), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
  });
});

describe('Analytics — GET /stats', () => {
  it('returns stats data', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'get', '/stats')(mockReq({ query: { days: '7' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
  });
});

describe('Analytics — GET /crashes', () => {
  it('returns crashes data', () => {
    const res = mockRes();
    findHandler(analyticsRouter, 'get', '/crashes')(mockReq({ query: {} }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
  });
});

// ============================================================
// VERSIONS TESTS
// ============================================================
describe('Versions — GET /:resourceType/:resourceId', () => {
  it('returns versions array', () => {
    const res = mockRes();
    findHandler(versionsRouter, 'get', '/:resourceType/:resourceId')(mockReq({ params: { resourceType: 'documents', resourceId: 'doc-123' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).versions).toBeInstanceOf(Array);
  });
});

describe('Versions — POST /:resourceType/:resourceId', () => {
  it('returns 401 when not authenticated', () => {
    const res = mockRes();
    findHandler(versionsRouter, 'post', '/:resourceType/:resourceId')(mockReq({ params: { resourceType: 'documents', resourceId: 'doc-123' }, body: { data: { content: 'test' } }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a version with 201 (uses data field, not content)', () => {
    const res = mockRes();
    findHandler(versionsRouter, 'post', '/:resourceType/:resourceId')(mockReq({
      params: { resourceType: 'documents', resourceId: 'doc-version-test-' + Date.now() },
      body: { data: { content: '<p>Version 1 content</p>' }, message: 'Initial version' }
    }), res);
    expect(res.statusCode).toBe(201);
    const version = res.body as any;
    expect(version.id).toBeTruthy();
    expect(version.data.content).toBe('<p>Version 1 content</p>');
    expect(version.message).toBe('Initial version');
    expect(version.number).toBe(1);
  });

  it('increments version number on each save', () => {
    const resourceId = 'doc-ver-increment-' + Date.now();
    const params = { resourceType: 'documents', resourceId };

    findHandler(versionsRouter, 'post', '/:resourceType/:resourceId')(mockReq({ params, body: { data: { v: 1 } } }), mockRes());
    const res = mockRes();
    findHandler(versionsRouter, 'post', '/:resourceType/:resourceId')(mockReq({ params, body: { data: { v: 2 } } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).number).toBe(2);
  });
});

describe('Versions — GET /:resourceType/:resourceId/:versionId', () => {
  it('returns 404 for non-existent version', () => {
    const res = mockRes();
    findHandler(versionsRouter, 'get', '/:resourceType/:resourceId/:versionId')(mockReq({
      params: { resourceType: 'documents', resourceId: 'doc-123', versionId: 'ghost-version' }
    }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns a specific version', () => {
    const resourceId = 'doc-ver-fetch-' + Date.now();
    const createRes = mockRes();
    findHandler(versionsRouter, 'post', '/:resourceType/:resourceId')(mockReq({
      params: { resourceType: 'documents', resourceId },
      body: { data: { content: 'Version content' }, message: 'v1' }
    }), createRes);
    const version = createRes.body as any;

    const res = mockRes();
    findHandler(versionsRouter, 'get', '/:resourceType/:resourceId/:versionId')(mockReq({
      params: { resourceType: 'documents', resourceId, versionId: version.id }
    }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(version.id);
  });
});
