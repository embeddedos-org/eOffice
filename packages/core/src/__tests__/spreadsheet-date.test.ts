/**
 * DATE(year, month, day) returns a real calendar date as YYYY-MM-DD. A month
 * or day outside its range carries into the next field instead of being
 * printed as given ("2024-13-01", "2024-02-30").
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function formula(f: string): unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.setCell(id, 0, 0, f); // A1
  return model.getCell(id, 0, 0)?.computedValue;
}

describe('DATE', () => {
  it('formats an in-range date as before', () => {
    expect(formula('=DATE(2024,3,5)')).toBe('2024-03-05');
    expect(formula('=DATE(2024,12,31)')).toBe('2024-12-31');
    expect(formula('=DATE(2024,1,1)')).toBe('2024-01-01');
    expect(formula('=DATE(2024,2,29)')).toBe('2024-02-29');
  });

  it('carries a month above 12 into the year', () => {
    expect(formula('=DATE(2024,13,1)')).toBe('2025-01-01');
    expect(formula('=DATE(2024,25,15)')).toBe('2026-01-15');
  });

  it('carries a month below 1 back into the previous year', () => {
    expect(formula('=DATE(2024,0,1)')).toBe('2023-12-01');
    expect(formula('=DATE(2024,-1,1)')).toBe('2023-11-01');
  });

  it('carries a day past the end of the month into the next month', () => {
    expect(formula('=DATE(2024,2,30)')).toBe('2024-03-01');
    expect(formula('=DATE(2023,2,29)')).toBe('2023-03-01');
    expect(formula('=DATE(2024,1,32)')).toBe('2024-02-01');
    expect(formula('=DATE(2024,12,32)')).toBe('2025-01-01');
  });

  it('carries a day below 1 back into the previous month', () => {
    expect(formula('=DATE(2024,3,0)')).toBe('2024-02-29');
    expect(formula('=DATE(2024,1,0)')).toBe('2023-12-31');
  });

  it('reads the parts from cells', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '2024'); // A1
    model.setCell(id, 0, 1, '14'); // B1
    model.setCell(id, 0, 2, '1'); // C1
    model.setCell(id, 1, 0, '=DATE(A1,B1,C1)'); // A2
    expect(model.getCell(id, 1, 0)?.computedValue).toBe('2025-02-01');
  });

  it('keeps a year below 100 as given', () => {
    expect(formula('=DATE(24,1,1)')).toBe('24-01-01');
  });

  it('drops the fraction of a non-integer part', () => {
    expect(formula('=DATE(2024,1.9,5.7)')).toBe('2024-01-05');
  });

  it('returns #VALUE! for a part that is not a number', () => {
    expect(formula('=DATE(2024,"x",1)')).toBe('#VALUE!');
  });

  it('returns #VALUE! for a date past the range it can represent', () => {
    expect(formula('=DATE(2024,1,1e9)')).toBe('#VALUE!');
    expect(formula('=DATE(275760,9,14)')).toBe('#VALUE!');
    expect(formula('=DATE(275760,9,13)')).toBe('275760-09-13');
  });
});
