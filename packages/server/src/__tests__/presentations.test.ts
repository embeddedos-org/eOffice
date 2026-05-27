// @ts-nocheck
/**
 * Comprehensive Presentations Route Tests
 * Covers: Presentation CRUD, Slide CRUD, reorder, ownership isolation, validation
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { presentationsRouter } from '../routes/presentations';

const USER_A = { id: 'pres-user-a', username: 'alice', email: 'alice@pres.com', role: 'user' };
const USER_B = { id: 'pres-user-b', username: 'bob', email: 'bob@pres.com', role: 'user' };

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
  for (const layer of presentationsRouter.stack) {
    if (layer.route?.path === path && layer.route?.methods?.[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle;
    }
  }
  throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
}

function createPresentation(title: string, theme?: string, user = USER_A) {
  const res = mockRes();
  findHandler('post', '/')(mockReq({ body: { title, theme } }, user), res);
  return res.body as Record<string, unknown>;
}

function addSlide(presId: string, content = '', notes = '', layout = 'blank', user = USER_A) {
  const res = mockRes();
  findHandler('post', '/:id/slides')(mockReq({ params: { id: presId }, body: { content, notes, layout } }, user), res);
  return res.body as Record<string, unknown>;
}

describe('Presentations — GET /', () => {
  it('returns presentations array with total', () => {
    const res = mockRes();
    findHandler('get', '/')(mockReq({}, { id: 'fresh-pres-user', username: 'fresh', email: 'f@p.com', role: 'user' }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).presentations).toBeInstanceOf(Array);
    expect(typeof (res.body as any).total).toBe('number');
  });

  it('isolates presentations by user', () => {
    const presA = createPresentation('Pres A ' + Date.now(), undefined, USER_A);
    const presB = createPresentation('Pres B ' + Date.now(), undefined, USER_B);

    const resA = mockRes();
    findHandler('get', '/')(mockReq({}, USER_A), resA);
    const presListA = (resA.body as any).presentations as any[];
    expect(presListA.some((p: any) => p.id === presA.id)).toBe(true);
    expect(presListA.some((p: any) => p.id === presB.id)).toBe(false);
  });
});

describe('Presentations — POST /', () => {
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

  it('creates presentation with 201 and correct fields', () => {
    const title = 'New Presentation ' + Date.now();
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title, theme: 'dark' } }), res);
    expect(res.statusCode).toBe(201);
    const pres = res.body as any;
    expect(pres.id).toBeTruthy();
    expect(pres.title).toBe(title);
    expect(pres.theme).toBe('dark');
    expect(pres.slides).toEqual([]);
    expect(pres.created_at).toBeTruthy();
    expect(pres.updated_at).toBeTruthy();
  });

  it('defaults theme to "default" when not provided', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'Default Theme ' + Date.now() } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).theme).toBe('default');
  });

  it('accepts titles up to MAX_TITLE_LENGTH (500 chars)', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'T'.repeat(500) } }), res);
    expect(res.statusCode).toBe(201);
  });

  it('returns 400 when title exceeds MAX_TITLE_LENGTH (501 chars)', () => {
    const res = mockRes();
    findHandler('post', '/')(mockReq({ body: { title: 'T'.repeat(501) } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('Presentations — GET /:id', () => {
  it('returns 404 for non-existent presentation', () => {
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: 'ghost' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user accesses the presentation', () => {
    const pres = createPresentation('Private Pres ' + Date.now(), undefined, USER_A);
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: pres.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns presentation for owner', () => {
    const pres = createPresentation('Fetch Pres ' + Date.now());
    const res = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: pres.id } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(pres.id);
  });
});

describe('Presentations — PUT /:id', () => {
  it('returns 404 for non-existent presentation', () => {
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: 'ghost' }, body: { title: 'Update' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates title and theme', () => {
    const pres = createPresentation('Original ' + Date.now());
    const res = mockRes();
    findHandler('put', '/:id')(mockReq({ params: { id: pres.id }, body: { title: 'Updated', theme: 'light' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).title).toBe('Updated');
    expect((res.body as any).theme).toBe('light');
  });
});

describe('Presentations — DELETE /:id', () => {
  it('returns 404 for non-existent presentation', () => {
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: 'ghost' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes presentation with 204', () => {
    const pres = createPresentation('Delete Me ' + Date.now());
    const res = mockRes();
    findHandler('delete', '/:id')(mockReq({ params: { id: pres.id } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('presentation inaccessible after deletion', () => {
    const pres = createPresentation('Gone Pres ' + Date.now());
    findHandler('delete', '/:id')(mockReq({ params: { id: pres.id } }), mockRes());
    const getRes = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: pres.id } }), getRes);
    expect(getRes.statusCode).toBe(404);
  });
});

describe('Presentations — POST /:id/slides', () => {
  it('returns 404 for non-existent presentation', () => {
    const res = mockRes();
    findHandler('post', '/:id/slides')(mockReq({ params: { id: 'ghost' }, body: { content: 'Slide' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('adds a slide with 201 and correct fields', () => {
    const pres = createPresentation('Slide Test ' + Date.now());
    const res = mockRes();
    findHandler('post', '/:id/slides')(mockReq({
      params: { id: pres.id },
      body: { content: '<h1>Title</h1>', notes: 'Speaker notes', layout: 'title' }
    }), res);
    expect(res.statusCode).toBe(201);
    const slide = res.body as any;
    expect(slide.id).toBeTruthy();
    expect(slide.content).toBe('<h1>Title</h1>');
    expect(slide.notes).toBe('Speaker notes');
    expect(slide.layout).toBe('title');
  });

  it('defaults content, notes, layout when not provided', () => {
    const pres = createPresentation('Default Slide ' + Date.now());
    const res = mockRes();
    findHandler('post', '/:id/slides')(mockReq({ params: { id: pres.id }, body: {} }), res);
    expect(res.statusCode).toBe(201);
    const slide = res.body as any;
    expect(slide.content).toBe('');
    expect(slide.notes).toBe('');
    expect(slide.layout).toBe('blank');
  });
});

describe('Presentations — PUT /:id/slides/:slideId', () => {
  it('returns 404 for non-existent slide', () => {
    const pres = createPresentation('Update Slide Pres ' + Date.now());
    const res = mockRes();
    findHandler('put', '/:id/slides/:slideId')(mockReq({ params: { id: pres.id, slideId: 'ghost-slide' }, body: { content: 'New' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates slide content and notes', () => {
    const pres = createPresentation('Slide Update Pres ' + Date.now());
    const slide = addSlide(pres.id as string, 'Original Content');
    const res = mockRes();
    findHandler('put', '/:id/slides/:slideId')(mockReq({
      params: { id: pres.id, slideId: slide.id },
      body: { content: 'Updated Content', notes: 'New Notes' }
    }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).content).toBe('Updated Content');
    expect((res.body as any).notes).toBe('New Notes');
  });
});

describe('Presentations — DELETE /:id/slides/:slideId', () => {
  it('returns 204 even for non-existent slideId (filter-based deletion)', () => {
    // The implementation uses filter() which silently ignores non-existent slide IDs
    const pres = createPresentation('Delete Slide Pres ' + Date.now());
    const res = mockRes();
    findHandler('delete', '/:id/slides/:slideId')(mockReq({ params: { id: pres.id, slideId: 'ghost-slide' } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('deletes slide with 204', () => {
    const pres = createPresentation('Slide Delete Pres ' + Date.now());
    const slide = addSlide(pres.id as string, 'To Delete');
    const res = mockRes();
    findHandler('delete', '/:id/slides/:slideId')(mockReq({ params: { id: pres.id, slideId: slide.id } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('slide removed from presentation after deletion', () => {
    const pres = createPresentation('Slide Removal Pres ' + Date.now());
    const slide = addSlide(pres.id as string, 'Removable');
    findHandler('delete', '/:id/slides/:slideId')(mockReq({ params: { id: pres.id, slideId: slide.id } }), mockRes());
    const getRes = mockRes();
    findHandler('get', '/:id')(mockReq({ params: { id: pres.id } }), getRes);
    const slides = (getRes.body as any).slides as any[];
    expect(slides.find((s: any) => s.id === slide.id)).toBeUndefined();
  });
});

describe('Presentations — PUT /:id/slides/reorder', () => {
  it('returns 404 for non-existent presentation', () => {
    const res = mockRes();
    findHandler('put', '/:id/slides/reorder')(mockReq({ params: { id: 'ghost' }, body: { order: [] } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when order is not an array', () => {
    const pres = createPresentation('Reorder Pres ' + Date.now());
    const res = mockRes();
    findHandler('put', '/:id/slides/reorder')(mockReq({ params: { id: pres.id }, body: { order: 'not-array' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('reorders slides correctly', () => {
    const pres = createPresentation('Reorder Test Pres ' + Date.now());
    const slide1 = addSlide(pres.id as string, 'Slide 1');
    const slide2 = addSlide(pres.id as string, 'Slide 2');
    const slide3 = addSlide(pres.id as string, 'Slide 3');

    const res = mockRes();
    findHandler('put', '/:id/slides/reorder')(mockReq({
      params: { id: pres.id },
      body: { order: [slide3.id, slide1.id, slide2.id] }
    }), res);
    expect(res.statusCode).toBe(200);
    const reorderedSlides = (res.body as any).slides as any[];
    expect(reorderedSlides[0].id).toBe(slide3.id);
    expect(reorderedSlides[1].id).toBe(slide1.id);
    expect(reorderedSlides[2].id).toBe(slide2.id);
  });
});
