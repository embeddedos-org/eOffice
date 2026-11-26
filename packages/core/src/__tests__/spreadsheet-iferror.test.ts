/**
 * IFERROR(value, fallback) returns the fallback only when value is one of
 * the error values the model writes into a cell. Text that merely starts
 * with "#" is an ordinary value and is returned unchanged.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function iferrorOf(a1: string): unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.setCell(id, 0, 0, a1); // A1
  model.setCell(id, 0, 1, '=IFERROR(A1,"fallback")'); // B1
  return model.getCell(id, 0, 1)?.computedValue;
}

describe('IFERROR', () => {
  it('returns text that starts with "#" unchanged', () => {
    expect(iferrorOf('#1 pick')).toBe('#1 pick');
    expect(iferrorOf('#hashtag')).toBe('#hashtag');
    expect(iferrorOf('#')).toBe('#');
  });

  it('returns ordinary values unchanged', () => {
    expect(iferrorOf('hello')).toBe('hello');
    expect(iferrorOf('42')).toBe(42);
  });

  it('returns the fallback for an error from a formula', () => {
    expect(iferrorOf('=1/0')).toBe('fallback');
    expect(iferrorOf('=NOSUCHFUNCTION(1)')).toBe('fallback');
    expect(iferrorOf('=Missing!A1')).toBe('fallback');
    expect(iferrorOf('=AVERAGEIF(C1:C2,">0")')).toBe('fallback');
    expect(iferrorOf('=FIND("z","abc")')).toBe('fallback');
  });

  it('returns the fallback for #N/A from MATCH', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, 'a'); // A1
    model.setCell(id, 1, 0, 'b'); // A2
    model.setCell(id, 0, 1, '=MATCH("z",A1:A2)'); // B1
    model.setCell(id, 0, 2, '=IFERROR(B1,"none")'); // C1
    expect(model.getCell(id, 0, 1)?.computedValue).toBe('#N/A');
    expect(model.getCell(id, 0, 2)?.computedValue).toBe('none');
  });
});
