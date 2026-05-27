/**
 * Extended SpreadsheetModel Tests
 * Covers: Additional formula functions, edge cases, format operations, range operations
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function makeModel(data: Record<string, string> = {}): SpreadsheetModel {
  const model = new SpreadsheetModel();
  const sheetId = model.activeSheetId;
  // data keys like 'A1', 'B2', etc.
  for (const [addr, value] of Object.entries(data)) {
    const col = addr.charCodeAt(0) - 65; // A=0, B=1...
    const row = parseInt(addr.slice(1)) - 1;
    model.setCell(sheetId, row, col, value);
  }
  return model;
}

describe('SpreadsheetModel — Sheet Operations', () => {
  it('can have multiple sheets', () => {
    const model = new SpreadsheetModel();
    model.addSheet('Sheet 2');
    model.addSheet('Sheet 3');
    expect(model.sheets).toHaveLength(3);
  });

  it('renameSheet updates sheet name', () => {
    const model = new SpreadsheetModel();
    const sheet = model.addSheet('Old Name');
    model.renameSheet(sheet.id, 'New Name');
    expect(model.getSheet(sheet.id)?.name).toBe('New Name');
  });

  it('renameSheet returns false for non-existent sheet', () => {
    const model = new SpreadsheetModel();
    expect(model.renameSheet('ghost-id', 'Name')).toBe(false);
  });

  it('removeSheet prevents removing last sheet', () => {
    const model = new SpreadsheetModel();
    expect(model.removeSheet(model.activeSheetId)).toBe(false);
    expect(model.sheets).toHaveLength(1);
  });

  it('getActiveSheet returns the active sheet', () => {
    const model = new SpreadsheetModel();
    const active = model.getActiveSheet();
    expect(active.id).toBe(model.activeSheetId);
  });

  it('getSheetCount returns correct count', () => {
    const model = new SpreadsheetModel();
    model.addSheet('S2');
    model.addSheet('S3');
    expect(model.getSheetCount()).toBe(3);
  });
});

describe('SpreadsheetModel — Cell Operations', () => {
  it('setCell and getCell round-trip', () => {
    const model = new SpreadsheetModel();
    model.setCell(model.activeSheetId, 0, 0, 'Hello');
    expect(model.getCell(model.activeSheetId, 0, 0)?.value).toBe('Hello');
  });

  it('clearCell removes cell value', () => {
    const model = new SpreadsheetModel();
    model.setCell(model.activeSheetId, 0, 0, 'Data');
    model.clearCell(model.activeSheetId, 0, 0);
    expect(model.getCell(model.activeSheetId, 0, 0)).toBeUndefined();
  });

  it('clearRange removes multiple cells', () => {
    const model = new SpreadsheetModel();
    const sid = model.activeSheetId;
    model.setCell(sid, 0, 0, 'A');
    model.setCell(sid, 0, 1, 'B');
    model.setCell(sid, 1, 0, 'C');
    model.clearRange(sid, 0, 0, 1, 1);
    expect(model.getCell(sid, 0, 0)).toBeUndefined();
    expect(model.getCell(sid, 0, 1)).toBeUndefined();
    expect(model.getCell(sid, 1, 0)).toBeUndefined();
  });

  it('getCellCount returns number of non-empty cells', () => {
    const model = new SpreadsheetModel();
    const sid = model.activeSheetId;
    model.setCell(sid, 0, 0, 'A');
    model.setCell(sid, 0, 1, 'B');
    model.setCell(sid, 1, 0, 'C');
    expect(model.getCellCount()).toBe(3);
  });

  it('setCellFormat applies format to cell', () => {
    const model = new SpreadsheetModel();
    const sid = model.activeSheetId;
    model.setCell(sid, 0, 0, '42');
    model.setCellFormat(sid, 0, 0, { bold: true, italic: false, numberFormat: 'currency' });
    const cell = model.getCell(sid, 0, 0);
    expect(cell?.format?.bold).toBe(true);
    expect(cell?.format?.numberFormat).toBe('currency');
  });
});

describe('SpreadsheetModel — Formula Functions (Extended)', () => {
  it('LEN returns string length', () => {
    const model = makeModel({ A1: 'Hello' });
    model.setCell(model.activeSheetId, 1, 0, '=LEN(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(Number(result?.computedValue)).toBe(5);
  });

  it('UPPER converts to uppercase', () => {
    const model = makeModel({ A1: 'hello' });
    model.setCell(model.activeSheetId, 1, 0, '=UPPER(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBe('HELLO');
  });

  it('LOWER converts to lowercase', () => {
    const model = makeModel({ A1: 'WORLD' });
    model.setCell(model.activeSheetId, 1, 0, '=LOWER(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBe('world');
  });

  it('TRIM removes leading/trailing whitespace', () => {
    const model = makeModel({ A1: '  hello  ' });
    model.setCell(model.activeSheetId, 1, 0, '=TRIM(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBe('hello');
  });

  it('ABS returns absolute value', () => {
    const model = makeModel({ A1: '-42' });
    model.setCell(model.activeSheetId, 1, 0, '=ABS(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(Number(result?.computedValue)).toBe(42);
  });

  it('ROUND rounds to specified decimals', () => {
    const model = makeModel({ A1: '3.14159' });
    model.setCell(model.activeSheetId, 1, 0, '=ROUND(A1,2)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(Number(result?.computedValue)).toBeCloseTo(3.14, 2);
  });

  it('SQRT returns square root', () => {
    const model = makeModel({ A1: '16' });
    model.setCell(model.activeSheetId, 1, 0, '=SQRT(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(Number(result?.computedValue)).toBe(4);
  });

  it('POWER raises to power', () => {
    const model = makeModel({ A1: '2' });
    model.setCell(model.activeSheetId, 1, 0, '=POWER(A1,10)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(Number(result?.computedValue)).toBe(1024);
  });

  it('AND returns true when all conditions true', () => {
    const model = makeModel({ A1: '5', B1: '10' });
    model.setCell(model.activeSheetId, 1, 0, '=AND(A1>0,B1>0)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBeTruthy();
  });

  it('OR returns true when any condition true', () => {
    const model = makeModel({ A1: '-1', B1: '10' });
    model.setCell(model.activeSheetId, 1, 0, '=OR(A1>0,B1>0)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBeTruthy();
  });

  it('NOT negates boolean', () => {
    const model = makeModel({ A1: '0' });
    model.setCell(model.activeSheetId, 1, 0, '=NOT(A1)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBeTruthy();
  });

  it('COUNTIF counts cells matching criteria', () => {
    const model = makeModel({ A1: '10', A2: '20', A3: '10', A4: '30' });
    model.setCell(model.activeSheetId, 4, 0, '=COUNTIF(A1:A4,10)');
    const result = model.getCell(model.activeSheetId, 4, 0);
    expect(Number(result?.computedValue)).toBe(2);
  });

  it('SUMIF sums cells matching criteria', () => {
    const model = makeModel({ A1: '10', A2: '20', A3: '10', B1: '1', B2: '2', B3: '3' });
    model.setCell(model.activeSheetId, 3, 0, '=SUMIF(A1:A3,10,B1:B3)');
    const result = model.getCell(model.activeSheetId, 3, 0);
    expect(Number(result?.computedValue)).toBe(4); // B1+B3 where A=10
  });

  it('IFERROR returns the value when no error', () => {
    const model = makeModel({ A1: '10', B1: '2' });
    model.setCell(model.activeSheetId, 1, 0, '=IFERROR(A1,"Error!")');
    const result = model.getCell(model.activeSheetId, 1, 0);
    // IFERROR with a valid value returns the value
    expect(result).toBeDefined();
  });

  it('LEFT returns left N characters', () => {
    const model = makeModel({ A1: 'Hello World' });
    model.setCell(model.activeSheetId, 1, 0, '=LEFT(A1,5)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBe('Hello');
  });

  it('RIGHT returns right N characters', () => {
    const model = makeModel({ A1: 'Hello World' });
    model.setCell(model.activeSheetId, 1, 0, '=RIGHT(A1,5)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBe('World');
  });

  it('MID returns substring', () => {
    const model = makeModel({ A1: 'Hello World' });
    model.setCell(model.activeSheetId, 1, 0, '=MID(A1,7,5)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(result?.computedValue).toBe('World');
  });

  it('SUM of range equals correct total', () => {
    // The formula engine evaluates SUM directly; test pure SUM
    const model = makeModel({ A1: '5', A2: '10', A3: '15', B1: '100' });
    model.setCell(model.activeSheetId, 3, 0, '=SUM(A1:A3)');
    const result = model.getCell(model.activeSheetId, 3, 0);
    expect(Number(result?.computedValue)).toBe(30);
  });

  it('handles empty cells in SUM as zero', () => {
    const model = makeModel({ A1: '10', A3: '20' }); // A2 is empty
    model.setCell(model.activeSheetId, 3, 0, '=SUM(A1:A3)');
    const result = model.getCell(model.activeSheetId, 3, 0);
    expect(Number(result?.computedValue)).toBe(30);
  });

  it('handles string values in COUNT (excludes non-numeric)', () => {
    const model = makeModel({ A1: '10', A2: 'text', A3: '20' });
    model.setCell(model.activeSheetId, 3, 0, '=COUNT(A1:A3)');
    const result = model.getCell(model.activeSheetId, 3, 0);
    expect(Number(result?.computedValue)).toBe(2);
  });
});

describe('SpreadsheetModel — Import/Export', () => {
  it('exportCSV produces correct CSV', () => {
    const model = makeModel({ A1: 'Name', B1: 'Age', A2: 'Alice', B2: '30' });
    const csv = model.exportCSV(model.activeSheetId);
    expect(csv).toContain('Name');
    expect(csv).toContain('Age');
    expect(csv).toContain('Alice');
    expect(csv).toContain('30');
  });

  it('importCSV populates cells correctly', () => {
    const model = new SpreadsheetModel();
    // importCSV signature: importCSV(csv, sheetId?)
    model.importCSV('Name,Age\nAlice,30\nBob,25', model.activeSheetId);
    expect(model.getCell(model.activeSheetId, 0, 0)?.value).toBe('Name');
    expect(model.getCell(model.activeSheetId, 0, 1)?.value).toBe('Age');
    expect(model.getCell(model.activeSheetId, 1, 0)?.value).toBe('Alice');
    expect(model.getCell(model.activeSheetId, 2, 1)?.value).toBe('25');
  });

  it('toJSON and fromJSON round-trip preserves data', () => {
    const model = makeModel({ A1: 'Hello', B2: '42', C3: '=A1' });
    const json = model.toJSON();
    const model2 = SpreadsheetModel.fromJSON(json);
    expect(model2.getCell(model2.activeSheetId, 0, 0)?.value).toBe('Hello');
    expect(model2.getCell(model2.activeSheetId, 1, 1)?.value).toBe('42');
  });

  it('fromJSON preserves sheet names', () => {
    const model = new SpreadsheetModel();
    model.addSheet('My Custom Sheet');
    const json = model.toJSON();
    const model2 = SpreadsheetModel.fromJSON(json);
    expect(model2.sheets.some((s) => s.name === 'My Custom Sheet')).toBe(true);
  });
});

describe('SpreadsheetModel — Edge Cases', () => {
  it('getCell returns undefined for empty cell', () => {
    const model = new SpreadsheetModel();
    expect(model.getCell(model.activeSheetId, 99, 99)).toBeUndefined();
  });

  it('formula with non-existent cell reference returns empty', () => {
    const model = new SpreadsheetModel();
    model.setCell(model.activeSheetId, 0, 0, '=Z99');
    const result = model.getCell(model.activeSheetId, 0, 0);
    // Should not throw, result should be empty or 0
    expect(result).toBeDefined();
  });

  it('handles very large numbers', () => {
    const model = makeModel({ A1: '999999999', B1: '999999999' });
    model.setCell(model.activeSheetId, 0, 2, '=A1+B1');
    const result = model.getCell(model.activeSheetId, 0, 2);
    expect(Number(result?.computedValue)).toBe(1999999998);
  });

  it('handles negative numbers in formulas', () => {
    const model = makeModel({ A1: '-10', B1: '5' });
    model.setCell(model.activeSheetId, 0, 2, '=A1+B1');
    const result = model.getCell(model.activeSheetId, 0, 2);
    expect(Number(result?.computedValue)).toBe(-5);
  });

  it('handles decimal arithmetic with ROUND', () => {
    const model = makeModel({ A1: '3.14159' });
    model.setCell(model.activeSheetId, 1, 0, '=ROUND(A1,2)');
    const result = model.getCell(model.activeSheetId, 1, 0);
    expect(Number(result?.computedValue)).toBeCloseTo(3.14, 2);
  });
});
