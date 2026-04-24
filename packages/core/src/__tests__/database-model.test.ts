import { describe, it, expect } from 'vitest';
import { DatabaseModel } from '../database-model';

describe('DatabaseModel', () => {
  it('should create a database model', () => {
    const model = new DatabaseModel();
    expect(model).toBeDefined();
  });

  it('should create a table', () => {
    const model = new DatabaseModel();
    const table = model.createTable('users', ['id', 'name', 'email']);
    expect(table.name).toBe('users');
    expect(table.columns).toEqual(['id', 'name', 'email']);
  });

  it('should insert a row', () => {
    const model = new DatabaseModel();
    model.createTable('users', ['id', 'name']);
    model.insertRow('users', { id: '1', name: 'Alice' });
    const rows = model.getRows('users');
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Alice');
  });

  it('should list tables', () => {
    const model = new DatabaseModel();
    model.createTable('table1', ['col1']);
    model.createTable('table2', ['col1', 'col2']);
    const tables = model.getTables();
    expect(tables.length).toBe(2);
  });

  it('should delete a table', () => {
    const model = new DatabaseModel();
    model.createTable('temp', ['col']);
    model.deleteTable('temp');
    const tables = model.getTables();
    expect(tables.find((t) => t.name === 'temp')).toBeUndefined();
  });
});
