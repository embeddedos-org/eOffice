/**
 * ROUND, ROUNDUP and ROUNDDOWN follow the usual spreadsheet rules:
 * ROUND rounds a half away from zero, ROUNDUP rounds away from zero and
 * ROUNDDOWN rounds toward zero, for negative numbers as well as positive
 * ones, and a value that is already exact at the requested number of
 * digits is returned unchanged.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function formula(value: string, f: string): unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.setCell(id, 0, 0, value); // A1
  model.setCell(id, 0, 1, f); // B1
  return model.getCell(id, 0, 1)?.computedValue;
}

describe('ROUND family on negative numbers', () => {
  it('ROUND rounds a negative half away from zero', () => {
    expect(formula('-2.5', '=ROUND(A1,0)')).toBe(-3);
    expect(formula('-1.25', '=ROUND(A1,1)')).toBe(-1.3);
    expect(formula('-0.5', '=ROUND(A1)')).toBe(-1);
    expect(formula('-1250', '=ROUND(A1,-2)')).toBe(-1300);
  });

  it('ROUNDUP rounds a negative number away from zero', () => {
    expect(formula('-2.1', '=ROUNDUP(A1,0)')).toBe(-3);
    expect(formula('-3.141', '=ROUNDUP(A1,2)')).toBe(-3.15);
  });

  it('ROUNDDOWN rounds a negative number toward zero', () => {
    expect(formula('-2.9', '=ROUNDDOWN(A1,0)')).toBe(-2);
    expect(formula('-3.149', '=ROUNDDOWN(A1,2)')).toBe(-3.14);
  });
});

describe('ROUND family on values already exact at that precision', () => {
  it('ROUNDUP and ROUNDDOWN leave an exact value unchanged', () => {
    expect(formula('0.07', '=ROUNDUP(A1,2)')).toBe(0.07);
    expect(formula('4.35', '=ROUNDDOWN(A1,2)')).toBe(4.35);
    expect(formula('0.29', '=ROUNDDOWN(A1,2)')).toBe(0.29);
    expect(formula('-4.35', '=ROUNDUP(A1,2)')).toBe(-4.35);
  });

  it('ROUND rounds a decimal half up even when its binary value is just below it', () => {
    expect(formula('1.005', '=ROUND(A1,2)')).toBe(1.01);
    expect(formula('-1.005', '=ROUND(A1,2)')).toBe(-1.01);
  });
});

describe('ROUND family behaviour that does not change', () => {
  it('positive numbers and negative digit counts', () => {
    expect(formula('2.5', '=ROUND(A1,0)')).toBe(3);
    expect(formula('3.14159', '=ROUND(A1,2)')).toBe(3.14);
    expect(formula('2.1', '=ROUNDUP(A1,0)')).toBe(3);
    expect(formula('2.9', '=ROUNDDOWN(A1,0)')).toBe(2);
    expect(formula('1234.5', '=ROUND(A1,-2)')).toBe(1200);
    expect(formula('0', '=ROUND(A1,2)')).toBe(0);
    expect(formula('abc', '=ROUND(A1,2)')).toBe('#ERROR!');
  });
});
