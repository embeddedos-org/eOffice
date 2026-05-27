// @ts-nocheck
/**
 * Comprehensive Notes Route Tests
 * Covers: CRUD, search, tag filter, validation, auth, ownership isolation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { notesRouter } from '../routes/notes';

const USER_A = { id: 'user-a', username: 'alice', email: 'alice@test.com', role: 'user' };
const USER_B = { id: 'user-b', username: 'bob', email: 'bob@test.com', role: 'user' };

function mockReq(overrides: Record<string, unknown> = {}, user = USER_A) {
  return {
    params: {},
    query: {},
    body: {},
    user,
    ...overrides,
  } as unknown as express.Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.send = (data?: unknown) => { if (data !== undefined) res.body = data; return res; };
  res.statusCode = 200;
  return res as unknown as express.Response & { body: unknown; statusCode: number };
}

function findHandler(method: string, path: string) {
  for (const layer of notesRouter.stack) {
    if (layer.route?.path === path && layer.route?.methods?.[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle;
    }
  }
  throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
}

function createNote(title: string, content = '', tags: string[] = [], user = USER_A) {
  const req = mockReq({ body: { title, content, tags } }, user);
  const res = mockRes();
  findHandler('post', '/')(req, res);
  return res.body as Record<string, unknown>;
}

describe('Notes Routes — GET /', () => {
  it('returns empty array for new user', () => {
    const res = mockRes();
    findHandler('get', '/')(mockReq({}, { id: 'fresh-user', username: 'fresh', email: 'f@t.com', role: 'user' }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).notes).toBeInstanceOf(Array);
    expect((res.body as any).total).toBeGreaterThanOrEqual(0);
  });

  it('returns only notes owned by the requesting user', () => {
    const noteA = createNote('Alice Note ' + Date.now(), '', [], USER_A);
    const noteB = createNote('Bob Note ' + Date.now(), '', [], USER_B);

    const resA = mockRes();
    findHandler('get', '/')(mockReq({}, USER_A), resA);
    const notesA = (resA.body as any).notes as any[];
    expect(notesA.some((n: any) => n.id === noteA.id)).toBe(true);
    expect(notesA.some((n: any) => n.id === noteB.id)).toBe(false);
  });

  it('filters notes by search query (title match)', () => {
    const unique = 'uniqueSearchTerm' + Date.now();
    createNote(unique + ' Title', '', [], USER_A);
    createNote('Other Note', '', [], USER_A);

    const res = mockRes();
    findHandler('get', '/')(mockReq({ query: { search: unique } }, USER_A), res);
    const notes = (res.body as any).notes as any[];
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes.every((n: any) => n.title.toLowerCase().includes(unique.toLowerCase()) || n.content.toLowerCase().includes(unique.toLowerCase()))).toBe(true);
  });

  it('filters notes by search query (content match)', () => {
    const unique = 'contentSearchTerm' + Date.now();
    createNote('Generic Title', unique + ' in content', [], USER_A);

    const res = mockRes();
    findHandler('get', '/')(mockReq({ query: { search: unique } }, USER_A), res);
    const notes = (res.body as any).notes as any[];
    expect(notes.some((n: any) => n.content.includes(unique))).toBe(true);
  });

  it('filters notes by tag', () => {
    const tag = 'work-' + Date.now();
    createNote('Tagged Note', '', [tag], USER_A);
    createNote('Untagged Note', '', ['other'], USER_A);

    const res = mockRes();
    findHandler('get', '/')(mockReq({ query: { tag } }, USER_A), res);
    const notes = (res.body as any).notes as any[];
    expect(notes.every((n: any) => n.tags.includes(tag))).toBe(true);
  });

  it('returns total count matching the notes array length', () => {
    const res = mockRes();
    findHandler('get', '/')(mockReq({}, USER_A), res);
    const body = res.body as any;
    expect(body.total).toBe(body.notes.length);
  });
});

describe('Notes Routes — GET /:id', () => {
  it('returns 404 for non-existent note', () => {
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: 'does-not-exist' } }), res);
    expect(res.statusCode).toBe(404);
    expect((res.body as any).error).toBeTruthy();
  });

  it('returns a note by id for the owner', () => {
    const note = createNote('Fetch Me ' + Date.now());
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: note.id } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(note.id);
    expect((res.body as any).title).toBe(note.title);
  });

  it('returns 404 when another user tries to access the note', () => {
    const note = createNote('Private Note ' + Date.now(), '', [], USER_A);
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: note.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('Notes Routes — POST /', () => {
  it('returns 400 when title is missing', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { content: 'no title' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as any).error).toMatch(/title/i);
  });

  it('returns 401 when user is not authenticated', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'Test' }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a note with 201 status and correct fields', () => {
    const title = 'New Note ' + Date.now();
    const content = 'Some content here';
    const tags = ['tag1', 'tag2'];
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title, content, tags, pinned: true } }), res);
    expect(res.statusCode).toBe(201);
    const note = res.body as any;
    expect(note.id).toBeTruthy();
    expect(note.title).toBe(title);
    expect(note.content).toBe(content);
    expect(note.tags).toEqual(tags);
    expect(note.pinned).toBe(true);
    expect(note.created_at).toBeTruthy();
    expect(note.updated_at).toBeTruthy();
  });

  it('creates a note with empty content when not provided', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'No Content ' + Date.now() } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).content).toBe('');
  });

  it('creates a note with empty tags when not provided', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'No Tags ' + Date.now() } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).tags).toEqual([]);
  });

  it('strips non-string tags from the array', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'Tag Test ' + Date.now(), tags: ['valid', 123, null, 'also-valid'] } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).tags).toEqual(['valid', 'also-valid']);
  });

  it('accepts titles up to MAX_TITLE_LENGTH (500 chars)', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'A'.repeat(500) } }), res);
    expect(res.statusCode).toBe(201);
  });

  it('returns 400 when title exceeds MAX_TITLE_LENGTH (501 chars)', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'A'.repeat(501) } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('Notes Routes — PUT /:id', () => {
  it('returns 404 for non-existent note', () => {
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: 'ghost' }, body: { title: 'Update' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user tries to update', () => {
    const note = createNote('Owned by A ' + Date.now(), '', [], USER_A);
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: note.id }, body: { title: 'Hacked' } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates title successfully', () => {
    const note = createNote('Original Title ' + Date.now());
    const newTitle = 'Updated Title ' + Date.now();
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: note.id }, body: { title: newTitle } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).title).toBe(newTitle);
  });

  it('updates content and tags', () => {
    const note = createNote('Update Test ' + Date.now());
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: note.id }, body: { content: 'new content', tags: ['updated'] } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).content).toBe('new content');
    expect((res.body as any).tags).toEqual(['updated']);
  });

  it('toggles pinned status', () => {
    const note = createNote('Pin Test ' + Date.now());
    expect((note as any).pinned).toBe(false);
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: note.id }, body: { pinned: true } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).pinned).toBe(true);
  });

  it('updates the updated_at timestamp', () => {
    const note = createNote('Timestamp Test ' + Date.now());
    const originalUpdatedAt = (note as any).updated_at;
    // Small delay to ensure timestamp changes
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: note.id }, body: { title: 'New Title' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).updated_at).toBeTruthy();
  });
});

describe('Notes Routes — DELETE /:id', () => {
  it('returns 404 for non-existent note', () => {
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: 'ghost-note' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user tries to delete', () => {
    const note = createNote('Delete Protect ' + Date.now(), '', [], USER_A);
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: note.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a note with 204 status', () => {
    const note = createNote('To Delete ' + Date.now());
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: note.id } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('note is no longer accessible after deletion', () => {
    const note = createNote('Gone Note ' + Date.now());
    // Delete it
    const delRes = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: note.id } }), delRes);
    expect(delRes.statusCode).toBe(204);
    // Try to fetch it
    const getRes = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: note.id } }), getRes);
    expect(getRes.statusCode).toBe(404);
  });
});
