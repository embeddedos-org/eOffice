// @ts-nocheck
/**
 * Comprehensive Forms Route Tests
 * Covers: Form CRUD, field management, submissions, ownership isolation, validation
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { formsRouter } from '../routes/forms';

const USER_A = { id: 'forms-user-a', username: 'alice', email: 'alice@forms.com', role: 'user' };
const USER_B = { id: 'forms-user-b', username: 'bob', email: 'bob@forms.com', role: 'user' };

function mockReq(overrides: Record<string, unknown> = {}, user = USER_A) {
  return { params: {}, query: {}, body: {}, user, ...overrides } as unknown as express.Request;
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
  for (const layer of formsRouter.stack) {
    if (layer.route?.path === path && layer.route?.methods?.[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle;
    }
  }
  throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
}

function createForm(title: string, fields: unknown[] = [], user = USER_A) {
  const res = mockRes();
  findHandler('post', '/')(mockReq({ body: { title, fields } }, user), res);
  return res.body as Record<string, unknown>;
}

describe('Forms — GET /', () => {
  it('returns forms array with total', () => {
    const res = mockRes();
    findHandler('get', '/')(mockReq({}, { id: 'fresh-forms-user', username: 'fresh', email: 'f@f.com', role: 'user' }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).forms).toBeInstanceOf(Array);
    expect(typeof (res.body as any).total).toBe('number');
  });

  it('isolates forms by user', () => {
    const formA = createForm('Form A ' + Date.now(), [], USER_A);
    const formB = createForm('Form B ' + Date.now(), [], USER_B);

    const resA = mockRes();
    findHandler('get', '/')(mockReq({}, USER_A), resA);
    const formsA = (resA.body as any).forms as any[];
    expect(formsA.some((f: any) => f.id === formA.id)).toBe(true);
    expect(formsA.some((f: any) => f.id === formB.id)).toBe(false);
  });
});

describe('Forms — POST /', () => {
  it('returns 400 when title is missing', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as any).error).toMatch(/title/i);
  });

  it('returns 401 when not authenticated', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'Test' }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a form with 201 and correct fields', () => {
    const title = 'Contact Form ' + Date.now();
    const fields = [
      { id: 'f1', type: 'text', label: 'Name', required: true },
      { id: 'f2', type: 'email', label: 'Email', required: true },
    ];
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title, fields } }), res);
    expect(res.statusCode).toBe(201);
    const form = res.body as any;
    expect(form.id).toBeTruthy();
    expect(form.title).toBe(title);
    expect(form.fields).toHaveLength(2);
    expect(form.created_at).toBeTruthy();
  });

  it('creates a form with empty fields when not provided', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'Empty Fields ' + Date.now() } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).fields).toEqual([]);
  });

  it('accepts titles up to MAX_TITLE_LENGTH (500 chars)', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'F'.repeat(500) } }), res);
    expect(res.statusCode).toBe(201);
  });

  it('returns 400 when title exceeds MAX_TITLE_LENGTH (501 chars)', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'F'.repeat(501) } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('Forms — GET /:id', () => {
  it('returns 404 for non-existent form', () => {
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: 'ghost' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user accesses the form', () => {
    const form = createForm('Private Form ' + Date.now(), [], USER_A);
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: form.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns form for owner', () => {
    const form = createForm('Fetch Form ' + Date.now());
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: form.id } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(form.id);
  });
});

describe('Forms — PUT /:id', () => {
  it('returns 404 for non-existent form', () => {
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: 'ghost' }, body: { title: 'Update' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates form title', () => {
    const form = createForm('Original Form ' + Date.now());
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: form.id }, body: { title: 'Updated Form' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).title).toBe('Updated Form');
  });

  it('updates form fields', () => {
    const form = createForm('Fields Form ' + Date.now());
    const newFields = [{ id: 'f1', type: 'textarea', label: 'Message', required: false }];
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: form.id }, body: { fields: newFields } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).fields).toHaveLength(1);
    expect((res.body as any).fields[0].type).toBe('textarea');
  });
});

describe('Forms — DELETE /:id', () => {
  it('returns 404 for non-existent form', () => {
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: 'ghost' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes form with 204', () => {
    const form = createForm('Delete Me Form ' + Date.now());
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: form.id } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('form inaccessible after deletion', () => {
    const form = createForm('Gone Form ' + Date.now());
    findHandler('delete', '/:id')(mockReq({ params: { id: form.id } }), mockRes());
    const getRes = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: form.id } }), getRes);
    expect(getRes.statusCode).toBe(404);
  });
});

describe('Forms — POST /:id/submit', () => {
  it('returns 404 for non-existent form', () => {
    const res = mockRes();
    findHandler('post', '/:id/submit')(mockReq({ params: { id: 'ghost' }, body: { data: { name: 'Test' } } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when data is missing', () => {
    const form = createForm('Submit Form ' + Date.now());
    const res = mockRes();
    findHandler('post', '/:id/submit')(mockReq({ params: { id: form.id }, body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as any).error).toMatch(/data/i);
  });

  it('returns 400 when data is not an object', () => {
    const form = createForm('Submit Form 2 ' + Date.now());
    const res = mockRes();
    findHandler('post', '/:id/submit')(mockReq({ params: { id: form.id }, body: { data: 'string-not-object' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('submits form data with 201', () => {
    const form = createForm('Survey ' + Date.now());
    const data = { name: 'Alice', email: 'alice@test.com', message: 'Hello!' };
    const res = mockRes();
    findHandler('post', '/:id/submit')(mockReq({ params: { id: form.id }, body: { data } }), res);
    expect(res.statusCode).toBe(201);
    const submission = res.body as any;
    expect(submission.id).toBeTruthy();
    expect(submission.formId).toBe(form.id);
    expect(submission.data).toEqual(data);
    expect(submission.submitted_at).toBeTruthy();
  });

  it('allows public submission (no user auth required)', () => {
    const form = createForm('Public Form ' + Date.now());
    const res = mockRes();
    // Submit without user context (public form submission)
    findHandler('post', '/:id/submit')(mockReq({ params: { id: form.id }, body: { data: { answer: 'yes' } }, user: undefined }), res);
    expect(res.statusCode).toBe(201);
  });
});

describe('Forms — GET /:id/submissions', () => {
  it('returns 404 for non-existent form', () => {
    const res = mockRes();
    findHandler('get', '/:id/submissions')(mockReq({ params: { id: 'ghost' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user accesses submissions', () => {
    const form = createForm('Protected Submissions ' + Date.now(), [], USER_A);
    const res = mockRes();
    findHandler('get', '/:id/submissions')(mockReq({ params: { id: form.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns submissions list with total', () => {
    const form = createForm('Submissions Form ' + Date.now());
    // Submit some data
    findHandler('post', '/:id/submit')(mockReq({ params: { id: form.id }, body: { data: { q: 'a1' } } }), mockRes());
    findHandler('post', '/:id/submit')(mockReq({ params: { id: form.id }, body: { data: { q: 'a2' } } }), mockRes());

    const res = mockRes();
    findHandler('get', '/:id/submissions')(mockReq({ params: { id: form.id } }), res);
    expect(res.statusCode).toBe(200);
    const body = res.body as any;
    expect(body.submissions).toBeInstanceOf(Array);
    expect(body.submissions.length).toBeGreaterThanOrEqual(2);
    expect(body.total).toBe(body.submissions.length);
  });
});
