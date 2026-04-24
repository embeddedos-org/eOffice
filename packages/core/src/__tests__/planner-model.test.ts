import { describe, it, expect } from 'vitest';
import { PlannerModel } from '../planner-model';

describe('PlannerModel', () => {
  it('should create a planner model', () => {
    const model = new PlannerModel();
    expect(model).toBeDefined();
  });

  it('should create a board', () => {
    const model = new PlannerModel();
    const board = model.createBoard('Sprint 1');
    expect(board.title).toBe('Sprint 1');
    expect(board.columns.length).toBeGreaterThan(0);
  });

  it('should add a task to a board', () => {
    const model = new PlannerModel();
    const board = model.createBoard('Sprint 1');
    const task = model.addTask(board.id, {
      title: 'Fix bug',
      description: 'Fix the login bug',
      priority: 'high',
    });
    expect(task.title).toBe('Fix bug');
  });

  it('should move a task between columns', () => {
    const model = new PlannerModel();
    const board = model.createBoard('Sprint 1');
    const task = model.addTask(board.id, {
      title: 'Test task',
      description: '',
      priority: 'medium',
    });
    model.moveTask(board.id, task.id, 'Done');
    const updated = model.getTask(board.id, task.id);
    expect(updated?.status).toBe('Done');
  });
});
