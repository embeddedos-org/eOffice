import { describe, it, expect } from 'vitest';
import { DatabaseModel } from '../database-model';

describe('DatabaseModel', () => {
  it('should create a database model', () => {
    const model = new DatabaseModel();
    expect(model).toBeDefined();
  });

  it('should create a table', () => {
    const model = new DatabaseModel();
    const table = model.createTable('users', [
      { name: 'id', type: 'text' },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ]);
    expect(table.name).toBe('users');
    expect(table.columns.length).toBe(3);
  });

  it('should insert a row', () => {
    const model = new DatabaseModel();
    const table = model.createTable('users', [
      { name: 'id', type: 'text' },
      { name: 'name', type: 'text' },
    ]);
    model.insertRow(table.id, { id: '1', name: 'Alice' });
    const rows = model.query(table.id, () => true);
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Alice');
  });

  it('should list tables', () => {
    const model = new DatabaseModel();
    model.createTable('table1', [{ name: 'col1', type: 'text' }]);
    model.createTable('table2', [{ name: 'col1', type: 'text' }, { name: 'col2', type: 'text' }]);
    expect(model.tables.length).toBe(2);
  });

  it('should delete a table', () => {
    const model = new DatabaseModel();
    const table = model.createTable('temp', [{ name: 'col', type: 'text' }]);
    model.dropTable(table.id);
    expect(model.tables.find((t) => t.name === 'temp')).toBeUndefined();
  });
});
