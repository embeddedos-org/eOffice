/**
 * MOD(number, divisor) returns the remainder with the sign of the divisor,
 * as spreadsheets define it: number - divisor * INT(number / divisor).
 * JavaScript's % keeps the sign of the dividend instead.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function formula(f: string): unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.setCell(id, 0, 0, f); // A1
  return model.getCell(id, 0, 0)?.computedValue;
}

describe('MOD', () => {
  it('keeps positive operands unchanged', () => {
    expect(formula('=MOD(7,3)')).toBe(1);
    expect(formula('=MOD(5.5,2)')).toBe(1.5);
  });

  it('gives a negative number a result with the sign of a positive divisor', () => {
    expect(formula('=MOD(-3,2)')).toBe(1);
    expect(formula('=MOD(-7,3)')).toBe(2);
  });

  it('gives a positive number a result with the sign of a negative divisor', () => {
    expect(formula('=MOD(3,-2)')).toBe(-1);
    expect(formula('=MOD(7,-3)')).toBe(-2);
  });

  it('keeps both-negative operands negative', () => {
    expect(formula('=MOD(-7,-3)')).toBe(-1);
  });

  it('still reports a zero divisor as an error', () => {
    expect(formula('=MOD(5,0)')).toBe('#ERROR!');
  });
});
