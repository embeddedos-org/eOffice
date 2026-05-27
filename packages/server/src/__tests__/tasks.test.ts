// @ts-nocheck
/**
 * Comprehensive Tasks/Planner Route Tests
 * Covers: Board CRUD, Task CRUD, ownership isolation, validation, column management
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { tasksRouter } from '../routes/tasks';

const USER_A = { id: 'task-user-a', username: 'alice', email: 'alice@tasks.com', role: 'user' };
const USER_B = { id: 'task-user-b', username: 'bob', email: 'bob@tasks.com', role: 'user' };

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
  for (const layer of tasksRouter.stack) {
    if (layer.route?.path === path && layer.route?.methods?.[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle;
    }
  }
  throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
}

function createBoard(title: string, columns?: string[], user = USER_A) {
  const res = mockRes();
  findHandler('post', '/boards')(mockReq({ body: { title, columns } }, user), res);
  return res.body as Record<string, unknown>;
}

function createTask(boardId: string, title: string, overrides: Record<string, unknown> = {}, user = USER_A) {
  const res = mockRes();
  findHandler('post', '/boards/:id/tasks')(mockReq({ params: { id: boardId }, body: { title, ...overrides } }, user), res);
  return res.body as Record<string, unknown>;
}

describe('Tasks — GET /boards', () => {
  it('returns boards array with total', () => {
    const res = mockRes();
    findHandler('get', '/boards')(mockReq({}, { id: 'fresh-task-user', username: 'fresh', email: 'f@t.com', role: 'user' }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).boards).toBeInstanceOf(Array);
    expect(typeof (res.body as any).total).toBe('number');
  });

  it('isolates boards by user', () => {
    const boardA = createBoard('Board A ' + Date.now(), undefined, USER_A);
    const boardB = createBoard('Board B ' + Date.now(), undefined, USER_B);

    const resA = mockRes();
    findHandler('get', '/boards')(mockReq({}, USER_A), resA);
    const boardsA = (resA.body as any).boards as any[];
    expect(boardsA.some((b: any) => b.id === boardA.id)).toBe(true);
    expect(boardsA.some((b: any) => b.id === boardB.id)).toBe(false);
  });
});

describe('Tasks — POST /boards', () => {
  it('returns 400 when title is missing', () => {
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as any).error).toMatch(/title/i);
  });

  it('returns 401 when user is not authenticated', () => {
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: { title: 'Test' }, user: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('creates a board with default columns', () => {
    const title = 'Default Columns Board ' + Date.now();
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: { title } }), res);
    expect(res.statusCode).toBe(201);
    const board = res.body as any;
    expect(board.id).toBeTruthy();
    expect(board.title).toBe(title);
    expect(board.columns).toEqual(['To Do', 'In Progress', 'Done']);
    expect(board.tasks).toEqual([]);
  });

  it('creates a board with custom columns', () => {
    const columns = ['Backlog', 'Review', 'Released'];
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: { title: 'Custom Cols ' + Date.now(), columns } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).columns).toEqual(columns);
  });

  it('filters non-string values from columns array', () => {
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: { title: 'Filter Cols ' + Date.now(), columns: ['Valid', 123, null, 'Also Valid'] } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).columns).toEqual(['Valid', 'Also Valid']);
  });

  it('accepts titles up to MAX_TITLE_LENGTH (500 chars)', () => {
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: { title: 'X'.repeat(500) } }), res);
    expect(res.statusCode).toBe(201);
  });

  it('returns 400 when title exceeds MAX_TITLE_LENGTH (501 chars)', () => {
    const res = mockRes();
    findHandler('post', '/boards')(mockReq({ body: { title: 'X'.repeat(501) } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('Tasks — GET /boards/:id', () => {
  it('returns 404 for non-existent board', () => {
    const res = mockRes();
    findHandler('get', '/boards/:id')(mockReq({ params: { id: 'nonexistent' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user accesses the board', () => {
    const board = createBoard('Private Board ' + Date.now(), undefined, USER_A);
    const res = mockRes();
    findHandler('get', '/boards/:id')(mockReq({ params: { id: board.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns board by id for owner', () => {
    const board = createBoard('Fetch Board ' + Date.now());
    const res = mockRes();
    findHandler('get', '/boards/:id')(mockReq({ params: { id: board.id } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe(board.id);
  });
});

describe('Tasks — DELETE /boards/:id', () => {
  it('returns 404 for non-existent board', () => {
    const res = mockRes();
    findHandler('delete', '/boards/:id')(mockReq({ params: { id: 'ghost' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user deletes the board', () => {
    const board = createBoard('Protected Board ' + Date.now(), undefined, USER_A);
    const res = mockRes();
    findHandler('delete', '/boards/:id')(mockReq({ params: { id: board.id } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes board with 204 status', () => {
    const board = createBoard('Delete Me Board ' + Date.now());
    const res = mockRes();
    findHandler('delete', '/boards/:id')(mockReq({ params: { id: board.id } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('board is inaccessible after deletion', () => {
    const board = createBoard('Gone Board ' + Date.now());
    const delRes = mockRes();
    findHandler('delete', '/boards/:id')(mockReq({ params: { id: board.id } }), delRes);
    expect(delRes.statusCode).toBe(204);
    const getRes = mockRes();
    findHandler('get', '/boards/:id')(mockReq({ params: { id: board.id } }), getRes);
    expect(getRes.statusCode).toBe(404);
  });
});

describe('Tasks — POST /boards/:id/tasks', () => {
  it('returns 404 for non-existent board', () => {
    const res = mockRes();
    findHandler('post', '/boards/:id/tasks')(mockReq({ params: { id: 'ghost' }, body: { title: 'Task' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when another user adds task to board', () => {
    const board = createBoard('Board for Task ' + Date.now(), undefined, USER_A);
    const res = mockRes();
    findHandler('post', '/boards/:id/tasks')(mockReq({ params: { id: board.id }, body: { title: 'Hack Task' } }, USER_B), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when task title is missing', () => {
    const board = createBoard('Task Board ' + Date.now());
    const res = mockRes();
    findHandler('post', '/boards/:id/tasks')(mockReq({ params: { id: board.id }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates a task with 201 status and correct fields', () => {
    const board = createBoard('Task Creation Board ' + Date.now());
    const title = 'My Task ' + Date.now();
    const res = mockRes();
    findHandler('post', '/boards/:id/tasks')(mockReq({
      params: { id: board.id },
      body: { title, description: 'Do it', column: 'In Progress', assignee: 'alice', priority: 'high' }
    }), res);
    expect(res.statusCode).toBe(201);
    const task = res.body as any;
    expect(task.id).toBeTruthy();
    expect(task.title).toBe(title);
    expect(task.description).toBe('Do it');
    expect(task.column).toBe('In Progress');
    expect(task.assignee).toBe('alice');
    expect(task.priority).toBe('high');
  });

  it('defaults priority to medium for invalid values', () => {
    const board = createBoard('Priority Board ' + Date.now());
    const res = mockRes();
    findHandler('post', '/boards/:id/tasks')(mockReq({
      params: { id: board.id },
      body: { title: 'Task ' + Date.now(), priority: 'invalid-priority' }
    }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).priority).toBe('medium');
  });

  it('defaults column to first board column when not specified', () => {
    const board = createBoard('Default Col Board ' + Date.now(), ['Backlog', 'Done']);
    const res = mockRes();
    findHandler('post', '/boards/:id/tasks')(mockReq({
      params: { id: board.id },
      body: { title: 'Default Col Task ' + Date.now() }
    }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as any).column).toBe('Backlog');
  });
});

describe('Tasks — PUT /boards/:id/tasks/:taskId', () => {
  it('returns 404 for non-existent board', () => {
    const res = mockRes();
    findHandler('put', '/boards/:id/tasks/:taskId')(mockReq({ params: { id: 'ghost', taskId: 'task1' }, body: { title: 'Update' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for non-existent task', () => {
    const board = createBoard('Update Task Board ' + Date.now());
    const res = mockRes();
    findHandler('put', '/boards/:id/tasks/:taskId')(mockReq({ params: { id: board.id, taskId: 'ghost-task' }, body: { title: 'Update' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates task fields successfully', () => {
    const board = createBoard('Update Board ' + Date.now());
    const task = createTask(board.id as string, 'Original Task ' + Date.now());
    const res = mockRes();
    findHandler('put', '/boards/:id/tasks/:taskId')(mockReq({
      params: { id: board.id, taskId: task.id },
      body: { title: 'Updated Task', column: 'Done', priority: 'low' }
    }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as any).title).toBe('Updated Task');
    expect((res.body as any).column).toBe('Done');
    expect((res.body as any).priority).toBe('low');
  });
});

describe('Tasks — DELETE /boards/:id/tasks/:taskId', () => {
  it('returns 404 for non-existent board', () => {
    const res = mockRes();
    findHandler('delete', '/boards/:id/tasks/:taskId')(mockReq({ params: { id: 'ghost', taskId: 'task1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes task with 204 status', () => {
    const board = createBoard('Delete Task Board ' + Date.now());
    const task = createTask(board.id as string, 'Delete Me Task ' + Date.now());
    const res = mockRes();
    findHandler('delete', '/boards/:id/tasks/:taskId')(mockReq({ params: { id: board.id, taskId: task.id } }), res);
    expect(res.statusCode).toBe(204);
  });

  it('task is removed from board after deletion', () => {
    const board = createBoard('Task Removal Board ' + Date.now());
    const task = createTask(board.id as string, 'Removable Task ' + Date.now());
    // Delete the task
    const delRes = mockRes();
    findHandler('delete', '/boards/:id/tasks/:taskId')(mockReq({ params: { id: board.id, taskId: task.id } }), delRes);
    expect(delRes.statusCode).toBe(204);
    // Fetch the board and verify task is gone
    const getRes = mockRes();
    findHandler('get', '/boards/:id')(mockReq({ params: { id: board.id } }), getRes);
    expect(getRes.statusCode).toBe(200);
    const tasks = (getRes.body as any).tasks as any[];
    expect(tasks.find((t: any) => t.id === task.id)).toBeUndefined();
  });
});
