/**
 * Function calls combined with arithmetic, e.g. =SUM(A1:A2)+SUM(B1:B2).
 *
 * evalExpression matched /^([A-Z]+)\((.+)\)$/, so any formula that began
 * with a function and ended with ")" was run as ONE call whose argument
 * ran across the operator ("A1:A2)+SUM(B1:B2"). SUM/MAX/MIN of that text
 * is 0. A function call used as an operand (=SUM(A1:A2)*2, =A1+SUM(...))
 * was not evaluated at all and gave #ERROR!.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function sheet(cells: Record<string, string>): (addr: string) => unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  const pos = (addr: string) => ({ col: addr.charCodeAt(0) - 65, row: Number(addr.slice(1)) - 1 });
  for (const [addr, value] of Object.entries(cells)) {
    const { row, col } = pos(addr);
    model.setCell(id, row, col, value);
  }
  return (addr: string) => {
    const { row, col } = pos(addr);
    return model.getCell(id, row, col)?.computedValue;
  };
}

const DATA = { A1: '1', A2: '2', B1: '10', B2: '20' };

describe('SpreadsheetModel function calls inside arithmetic', () => {
  it('adds two function results', () => {
    const get = sheet({ ...DATA, C1: '=SUM(A1:A2)+SUM(B1:B2)' });
    expect(get('C1')).toBe(33);
  });

  it('subtracts two function results', () => {
    const get = sheet({ ...DATA, C1: '=MAX(A1:B2)-MIN(A1:B2)' });
    expect(get('C1')).toBe(19);
  });

  it('multiplies a function result', () => {
    const get = sheet({ ...DATA, C1: '=SUM(A1:A2)*2', C2: '=2*SUM(A1:A2)' });
    expect(get('C1')).toBe(6);
    expect(get('C2')).toBe(6);
  });

  it('uses a function result next to a cell reference', () => {
    const get = sheet({ ...DATA, C1: '=A1+SUM(B1:B2)', C2: '=SUM(B1:B2)/A2' });
    expect(get('C1')).toBe(31);
    expect(get('C2')).toBe(15);
  });

  it('chains three calls left to right', () => {
    const get = sheet({ ...DATA, C1: '=SUM(B1:B2)-SUM(A1:A2)-MAX(A1:A2)' });
    expect(get('C1')).toBe(25);
  });

  it('adds to an IF result', () => {
    const get = sheet({ ...DATA, C1: '=IF(A1>0, 5, 0)+1', C2: '=IF(A1>0, 1, 0)+IF(B1>0, 1, 0)' });
    expect(get('C1')).toBe(6);
    expect(get('C2')).toBe(2);
  });

  it('a single call is unchanged, including operators inside quoted arguments', () => {
    const get = sheet({ ...DATA, C1: '=SUM(A1:A2)', C2: '=MAX(A1:B2)', C3: '=CONCATENATE("a+b", "-c")' });
    expect(get('C1')).toBe(3);
    expect(get('C2')).toBe(20);
    expect(get('C3')).toBe('a+b-c');
  });

  it('a single call with a parenthesis inside a quoted argument is unchanged', () => {
    const get = sheet({
      C1: '=LEN("a)")',
      C2: '=UPPER("(x")',
      C3: '=TRIM(" :) ")',
      C4: "=LOWER('A(B')",
    });
    expect(get('C1')).toBe(2);
    expect(get('C2')).toBe('(X');
    expect(get('C3')).toBe(':)');
    expect(get('C4')).toBe('a(b');
  });

  it('a call with empty parentheses does not recurse into an error', () => {
    const get = sheet({ C1: '=NOW()', C2: '=TODAY()' });
    expect(get('C1')).not.toBe('#ERROR!');
    expect(get('C2')).not.toBe('#ERROR!');
  });

  it('a line break inside the parentheses does not recurse into an error', () => {
    const get = sheet({ C1: '=SUM(1,\n2)', C2: '=SUM(1,\r\n2)', C3: '=SUM(1, 2)' });
    expect(get('C1')).not.toBe('#ERROR!');
    expect(get('C2')).not.toBe('#ERROR!');
    expect(get('C3')).not.toBe('#ERROR!');
  });

  it('never re-enters evaluation without progress', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '1');
    model.setCell(id, 1, 0, '2');
    const evalExpression = (expr: string) =>
      (model as unknown as { evalExpression(e: string, s: string): unknown }).evalExpression(expr, id);
    for (const expr of [
      'NOW()',
      'NOW()+1',
      'SUM(1,\n2)',
      'SUM(1,\n2)+1',
      '1+SUM(1,\r\n2)',
      'SUM(1,\r2)*2',
      'SUM(1, 2)-1',
      'SUM(\n)+1',
      'IF(A1>0,\n1,2)+1',
      'SUM(A1:A2',
      'SUM(A1:A2))*2',
      'SUM((A1:A2))*2',
      '(SUM(A1:A2))',
    ]) {
      expect(() => evalExpression(expr), JSON.stringify(expr)).not.toThrow();
    }
    expect(evalExpression('SUM(1,\t2)*2')).toBe(6);
    expect(evalExpression(' SUM(A1:A2) *2')).toBe(6);
    expect(evalExpression('MAX(SUM(A1:A2),5)*2')).toBe(10);
  });

  it('ignores parentheses and operators inside quoted arguments in arithmetic', () => {
    const get = sheet({ C1: '=1+LEN("a(")', C2: '=LEN("a)")*2', C3: "=LEN('x-(')+LEN(\"*)\")" });
    expect(get('C1')).toBe(3);
    expect(get('C2')).toBe(4);
    expect(get('C3')).toBe(5);
  });
});
