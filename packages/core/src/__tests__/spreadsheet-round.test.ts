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

describe('ROUND family at scaling boundaries', () => {
  it.each(['ROUND', 'ROUNDUP', 'ROUNDDOWN'])('%s preserves finite values when scaling overflows', (fn) => {
    for (const value of ['1e308', '-1e308', '1.7976931348623157e308', '-1.7976931348623157e308']) {
      expect(formula(value, `=${fn}(A1,2)`)).toBe(Number(value));
    }
  });

  it.each(['ROUND', 'ROUNDUP', 'ROUNDDOWN'])('%s handles very large finite digit counts', (fn) => {
    for (const value of ['0.000001', '-1.005', '5e-324', '1e308']) {
      expect(formula(value, `=${fn}(A1,1e30)`)).toBe(Number(value));
    }
  });

  it.each(['ROUND', 'ROUNDUP', 'ROUNDDOWN'])('%s validates digits before returning zero', (fn) => {
    for (const value of ['0', '-0', '1']) {
      for (const digits of ['abc', 'Infinity', '-Infinity']) {
        expect(formula(value, `=${fn}(A1,"${digits}")`)).toBeNaN();
      }
    }
  });

  it.each(['1e-320', '-1e-320', '5e-324', '-5e-324'])('rounds %s away from zero after scaling underflows', (value) => {
    const sign = Math.sign(Number(value));
    expect(formula(value, '=ROUNDUP(A1,-20)')).toBe(sign * 1e20);
    expect(formula(value, '=ROUNDUP(A1,-1e30)')).toBe(sign * Infinity);
    expect(formula(value, '=ROUND(A1,-1e30)')).toBe(sign * 0);
    expect(formula(value, '=ROUNDDOWN(A1,-1e30)')).toBe(sign * 0);
  });

  it('preserves rounding at subnormal precision', () => {
    expect(formula('5e-324', '=ROUND(A1,323)')).toBe(1e-323);
    expect(formula('-5e-324', '=ROUND(A1,323)')).toBe(-1e-323);
    expect(formula('5e-324', '=ROUNDUP(A1,324)')).toBe(5e-324);
    expect(formula('5e-324', '=ROUNDDOWN(A1,324)')).toBe(5e-324);
  });

  it('allows a genuinely unrepresentable rounded result to overflow', () => {
    expect(formula('1.7976931348623157e308', '=ROUNDUP(A1,-308)')).toBe(Infinity);
    expect(formula('-1.7976931348623157e308', '=ROUND(A1,-308)')).toBe(-Infinity);
    expect(formula('1.7976931348623157e308', '=ROUNDDOWN(A1,-308)')).toBe(1e308);
  });
});
