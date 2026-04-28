import { describe, it, expect } from 'vitest';
import { PlannerModel } from '../planner-model';

describe('PlannerModel', () => {
  it('should create a planner model', () => {
    const model = new PlannerModel();
    expect(model).toBeDefined();
  });

  it('should create a board', () => {
    const model = new PlannerModel();
    const board = model.addBoard('Sprint 1');
    expect(board.name).toBe('Sprint 1');
    expect(board.columns.length).toBeGreaterThan(0);
  });

  it('should add a task to a board', () => {
    const model = new PlannerModel();
    const board = model.addBoard('Sprint 1');
    const task = model.addTask(board.id, 'Fix bug', 'Fix the login bug', 'high');
    expect(task).toBeDefined();
    expect(task!.title).toBe('Fix bug');
  });

  it('should move a task between columns', () => {
    const model = new PlannerModel();
    const board = model.addBoard('Sprint 1');
    const task = model.addTask(board.id, 'Test task', '', 'medium');
    model.moveTask(board.id, task!.id, 'done');
    const updatedBoard = model.boards.find((b) => b.id === board.id);
    const updated = updatedBoard?.tasks.find((t) => t.id === task!.id);
    expect(updated?.status).toBe('done');
  });
});
