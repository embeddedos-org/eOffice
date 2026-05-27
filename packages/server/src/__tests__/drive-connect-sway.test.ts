// @ts-nocheck
/**
 * Comprehensive Drive, Connect (eConnect), and Sway (eSway) Route Tests
 * Covers: File CRUD, folder management, trash/restore, channel CRUD, messaging, sway CRUD
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { driveRouter } from '../routes/drive';
import { connectRouter } from '../routes/connect';
import { swayRouter } from '../routes/sway';

const USER_A = { id: 'drive-user-a-' + Date.now(), username: 'alice', email: 'alice@drive.com', role: 'user' };
const USER_B = { id: 'drive-user-b-' + Date.now(), username: 'bob', email: 'bob@drive.com', role: 'user' };

function mockReq(overrides: Record<string, unknown> = {}, user = USER_A) {
  return { params: {}, query: {}, body: {}, user, ...overrides } as unknown as express.Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.send = (data?: unknown) => { if (data !== undefined) res.body = data; return res; };
  res.sendFile = (_path: string) => res;
  res.statusCode = 200;
  return res as unknown as express.Response & { body: unknown; statusCode: number };
}

function findHandler(router: any, method: string, path: string) {
  for (const layer of router.stack) {
    if (layer.route?.path === path && layer.route?.methods?.[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle;
    }
  }
  throw new Error(`No handler for ${method.toUpperCase()} ${path} in router`);
}

// ============================================================
// DRIVE TESTS
// ============================================================
describe('Drive Routes — GET /', () => {
  it('returns files array with total', () => {
    const res = mockRes();
    findHandler(driveRouter, 'get', '/')(mockReq({ query: {} }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).files).toBeInstanceOf(Array);
    expect(typeof (res.body as any).total).toBe('number');
  });

  it('isolates files by user', () => {
    const createResA = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'FileA-' + Date.now(), type: 'file', content: 'hello' } }, USER_A), createResA);
    const fileA = createResA.body as any;

    const createResB = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'FileB-' + Date.now(), type: 'file', content: 'world' } }, USER_B), createResB);
    const fileB = createResB.body as any;

    const resA = mockRes();
    findHandler(driveRouter, 'get', '/')(mockReq({ query: {} }, USER_A), resA);
    const filesA = (resA.body as any).files as any[];
    expect(filesA.some((f: any) => f.id === fileA.id)).toBe(true);
    expect(filesA.some((f: any) => f.id === fileB.id)).toBe(false);
  });
});

describe('Drive Routes — POST /', () => {
  it('returns 400 when name is missing', () => {
    const res = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { type: 'file' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when not authenticated', () => {
    const res = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'Test', type: 'file' }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a file with 201', () => {
    const name = 'document-' + Date.now() + '.txt';
    const res = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name, type: 'file', content: 'Hello World' } }), res);
    expect(res.statusCode).toBe(201);
    const file = res.body as any;
    expect(file.id).toBeTruthy();
    expect(file.name).toBe(name);
    expect(file.type).toBe('file');
  });

  it('creates a folder with 201', () => {
    const res = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'My Folder ' + Date.now(), type: 'folder' } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).type).toBe('folder');
  });
});

describe('Drive Routes — GET /:id', () => {
  it('returns 404 for non-existent file', () => {
    const res = mockRes();
    findHandler(driveRouter, 'get', '/:id')(mockReq({ params: { id: 'ghost-drive-file' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns file for owner', () => {
    const createRes = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'Fetch File ' + Date.now(), type: 'file', content: 'data' } }), createRes);
    const file = createRes.body as any;

    const res = mockRes();
    findHandler(driveRouter, 'get', '/:id')(mockReq({ params: { id: file.id } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(file.id);
  });
});

describe('Drive Routes — PUT /:id', () => {
  it('returns 404 for non-existent file', () => {
    const res = mockRes();
    findHandler(driveRouter, 'put', '/:id')(mockReq({ params: { id: 'ghost-drive' }, body: { name: 'New Name' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates file name', () => {
    const createRes = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'Rename Me ' + Date.now(), type: 'file', content: '' } }), createRes);
    const file = createRes.body as any;

    const res = mockRes();
    findHandler(driveRouter, 'put', '/:id')(mockReq({ params: { id: file.id }, body: { name: 'Renamed File' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).name).toBe('Renamed File');
  });
});

describe('Drive Routes — DELETE /:id (soft delete)', () => {
  it('returns 404 for non-existent file', () => {
    const res = mockRes();
    findHandler(driveRouter, 'delete', '/:id')(mockReq({ params: { id: 'ghost-drive-del' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('soft-deletes file (returns 204)', () => {
    const createRes = mockRes();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: 'Trash Me ' + Date.now(), type: 'file', content: '' } }), createRes);
    const file = createRes.body as any;

    const delRes = mockRes();
    findHandler(driveRouter, 'delete', '/:id')(mockReq({ params: { id: file.id } }), delRes);
    // Implementation returns 204 (soft delete)
    expect(delRes.statusCode).toBe(204);
  });
});

describe('Drive Routes — GET /trash', () => {
  it('returns trash list', () => {
    const res = mockRes();
    findHandler(driveRouter, 'get', '/trash')(mockReq({}), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).files).toBeInstanceOf(Array);
  });
});

describe('Drive Routes — GET /search', () => {
  it('returns empty results for empty query', () => {
    const res = mockRes();
    findHandler(driveRouter, 'get', '/search')(mockReq({ query: { q: '' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).files).toEqual([]);
  });

  it('returns matching files for query', () => {
    const unique = 'searchable' + Date.now();
    findHandler(driveRouter, 'post', '/')(mockReq({ body: { name: unique + '.txt', type: 'file', content: '' } }), mockRes());

    const res = mockRes();
    findHandler(driveRouter, 'get', '/search')(mockReq({ query: { q: unique } }), res);
    expect(res.statusCode).toBe(200);
    const files = (res.body as any).files as any[];
    expect(files.some((f: any) => f.name.includes(unique))).toBe(true);
  });
});

describe('Drive Routes — GET /stats', () => {
  it('returns storage stats with used, quota, percentage, fileCount', () => {
    const res = mockRes();
    findHandler(driveRouter, 'get', '/stats')(mockReq({}), res);
    expect(res.statusCode).toBe(200);
    const body = res.body as any;
    expect(typeof body.used).toBe('number');
    expect(typeof body.quota).toBe('number');
    expect(typeof body.percentage).toBe('number');
    expect(typeof body.fileCount).toBe('number');
  });
});

// ============================================================
// CONNECT (eConnect) TESTS
// ============================================================
const CONNECT_USER_A = { id: 'connect-user-a-' + Date.now(), username: 'alice', email: 'alice@connect.com', role: 'user' };

function createChannel(name: string, user = CONNECT_USER_A) {
  const res = mockRes();
  findHandler(connectRouter, 'post', '/channels')(mockReq({ body: { name } }, user), res);
  return res.body as Record<string, unknown>;
}

describe('Connect Routes — GET /channels', () => {
  it('returns channels array', () => {
    const res = mockRes();
    findHandler(connectRouter, 'get', '/channels')(mockReq({}, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).channels).toBeInstanceOf(Array);
  });
});

describe('Connect Routes — POST /channels', () => {
  it('returns 400 when name is missing', () => {
    const res = mockRes();
    findHandler(connectRouter, 'post', '/channels')(mockReq({ body: {} }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when not authenticated', () => {
    const res = mockRes();
    findHandler(connectRouter, 'post', '/channels')(mockReq({ body: { name: 'general' }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a channel with 201', () => {
    const name = 'general-' + Date.now();
    const res = mockRes();
    findHandler(connectRouter, 'post', '/channels')(mockReq({ body: { name } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(201);
    const channel = res.body as any;
    expect(channel.id).toBeTruthy();
    expect(channel.name).toBe(name);
  });
});

describe('Connect Routes — GET /channels/:id', () => {
  it('returns 404 for non-existent channel', () => {
    const res = mockRes();
    findHandler(connectRouter, 'get', '/channels/:id')(mockReq({ params: { id: 'ghost-channel' } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns channel by id', () => {
    const channel = createChannel('fetch-channel-' + Date.now(), CONNECT_USER_A);
    const res = mockRes();
    findHandler(connectRouter, 'get', '/channels/:id')(mockReq({ params: { id: channel.id } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(channel.id);
  });
});

describe('Connect Routes — POST /channels/:id/messages', () => {
  it('returns 404 for non-existent channel', () => {
    const res = mockRes();
    findHandler(connectRouter, 'post', '/channels/:id/messages')(mockReq({ params: { id: 'ghost-ch' }, body: { content: 'Hello' } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when content is missing', () => {
    const channel = createChannel('msg-channel-' + Date.now(), CONNECT_USER_A);
    const res = mockRes();
    findHandler(connectRouter, 'post', '/channels/:id/messages')(mockReq({ params: { id: channel.id }, body: {} }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(400);
  });

  it('sends a message with 201 using content field', () => {
    const channel = createChannel('send-msg-channel-' + Date.now(), CONNECT_USER_A);
    const res = mockRes();
    findHandler(connectRouter, 'post', '/channels/:id/messages')(mockReq({
      params: { id: channel.id },
      body: { content: 'Hello World!' }
    }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(201);
    const msg = res.body as any;
    expect(msg.id).toBeTruthy();
    expect(msg.content).toBe('Hello World!');
  });
});

describe('Connect Routes — GET /channels/:id/messages', () => {
  it('returns messages for a channel', () => {
    const channel = createChannel('get-msgs-channel-' + Date.now(), CONNECT_USER_A);
    // Send a message first
    findHandler(connectRouter, 'post', '/channels/:id/messages')(mockReq({ params: { id: channel.id }, body: { content: 'Test msg' } }, CONNECT_USER_A), mockRes());

    const res = mockRes();
    findHandler(connectRouter, 'get', '/channels/:id/messages')(mockReq({ params: { id: channel.id } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).messages).toBeInstanceOf(Array);
    expect((res.body as any).messages.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Connect Routes — DELETE /channels/:id', () => {
  it('returns 404 for non-existent channel', () => {
    const res = mockRes();
    findHandler(connectRouter, 'delete', '/channels/:id')(mockReq({ params: { id: 'ghost-del-ch' } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes channel with 204', () => {
    const channel = createChannel('delete-channel-' + Date.now(), CONNECT_USER_A);
    const res = mockRes();
    findHandler(connectRouter, 'delete', '/channels/:id')(mockReq({ params: { id: channel.id } }, CONNECT_USER_A), res);
    expect(res.statusCode).toBe(204);
  });
});

// ============================================================
// SWAY (eSway) TESTS
// ============================================================
const SWAY_USER_A = { id: 'sway-user-a-' + Date.now(), username: 'alice', email: 'alice@sway.com', role: 'user' };

function createSway(title: string, user = SWAY_USER_A) {
  const res = mockRes();
  findHandler(swayRouter, 'post', '/')(mockReq({ body: { title } }, user), res);
  return res.body as Record<string, unknown>;
}

describe('Sway Routes — GET /', () => {
  it('returns presentations array (sways use presentations key)', () => {
    const res = mockRes();
    findHandler(swayRouter, 'get', '/')(mockReq({}, SWAY_USER_A), res);
    expect(res.statusCode).toBe(200);
    // Sway router returns { presentations: [...] }
    expect((res.body as any).presentations).toBeInstanceOf(Array);
  });
});

describe('Sway Routes — POST /', () => {
  it('returns 400 when title is missing', () => {
    const res = mockRes();
    findHandler(swayRouter, 'post', '/')(mockReq({ body: {} }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates a sway with 201', () => {
    const title = 'My Sway ' + Date.now();
    const res = mockRes();
    findHandler(swayRouter, 'post', '/')(mockReq({ body: { title } }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(201);
    const sway = res.body as any;
    expect(sway.id).toBeTruthy();
    expect(sway.title).toBe(title);
  });
});

describe('Sway Routes — GET /:id', () => {
  it('returns 404 for non-existent sway', () => {
    const res = mockRes();
    findHandler(swayRouter, 'get', '/:id')(mockReq({ params: { id: 'ghost-sway' } }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns sway by id', () => {
    const sway = createSway('Fetch Sway ' + Date.now());
    const res = mockRes();
    findHandler(swayRouter, 'get', '/:id')(mockReq({ params: { id: sway.id } }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(sway.id);
  });
});

describe('Sway Routes — DELETE /:id', () => {
  it('returns 404 for non-existent sway', () => {
    const res = mockRes();
    findHandler(swayRouter, 'delete', '/:id')(mockReq({ params: { id: 'ghost-sway-del' } }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes sway with 204', () => {
    const sway = createSway('Delete Me Sway ' + Date.now());
    const res = mockRes();
    findHandler(swayRouter, 'delete', '/:id')(mockReq({ params: { id: sway.id } }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(204);
  });
});

describe('Sway Routes — POST /:id/slides', () => {
  it('returns 404 for non-existent sway', () => {
    const res = mockRes();
    findHandler(swayRouter, 'post', '/:id/slides')(mockReq({ params: { id: 'ghost-sway-slide' }, body: { type: 'text', content: 'Hello' } }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(404);
  });

  it('adds a slide to sway with 201', () => {
    const sway = createSway('Slide Sway ' + Date.now());
    const res = mockRes();
    findHandler(swayRouter, 'post', '/:id/slides')(mockReq({
      params: { id: sway.id },
      body: { type: 'text', content: 'Welcome to my sway!' }
    }, SWAY_USER_A), res);
    expect(res.statusCode).toBe(201);
    const slide = res.body as any;
    expect(slide.id).toBeTruthy();
    expect(slide.type).toBe('text');
    expect(slide.content).toBe('Welcome to my sway!');
  });
});
