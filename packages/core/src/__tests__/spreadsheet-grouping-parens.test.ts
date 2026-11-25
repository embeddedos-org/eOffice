/**
 * Grouping parentheses, e.g. =2*(3+4).
 *
 * evalSimpleExpression had no parenthesis handling: it split on the
 * rightmost top-level + or -, then * or /, and recursed. For 2*(3+4) the
 * split gave left "2*(3" and right "4)", and Number() of either is NaN, so
 * the formula showed #ERROR!. A parenthesised operand was never unwrapped,
 * so "(" carried no precedence at all.
 *
 * Issue #94. The depth- and quote-aware operator scans this builds on come
 * from #80 / PR #81, which left grouping to this follow-up.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function sheet(cells: Record<string, string>): (addr: string) => unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  const pos = (addr: string) => ({
    col: addr.charCodeAt(0) - 65,
    row: Number(addr.slice(1)) - 1,
  });
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

describe('SpreadsheetModel grouping parentheses', () => {
  it('gives a group precedence over a surrounding operator', () => {
    const get = sheet({ C1: '=2*(3+4)', C2: '=(2+3)*4', C3: '=10/(2+3)' });
    expect(get('C1')).toBe(14);
    expect(get('C2')).toBe(20);
    expect(get('C3')).toBe(2);
  });

  it('evaluates a nested group', () => {
    const get = sheet({ C1: '=((1+2)*3)', C2: '=2*((1+2)*3)', C3: '=((((5))))' });
    expect(get('C1')).toBe(9);
    expect(get('C2')).toBe(18);
    expect(get('C3')).toBe(5);
  });

  it('evaluates several groups in one formula', () => {
    const get = sheet({ C1: '=2*(3+4)*5', C2: '=(1+2)*(3+4)', C3: '=(1+2)+(3+4)' });
    expect(get('C1')).toBe(70);
    expect(get('C2')).toBe(21);
    expect(get('C3')).toBe(10);
  });

  it('keeps a subtraction inside a group from being split outside it', () => {
    const get = sheet({ C1: '=2*(3-5)', C2: '=10-(2+3)', C3: '=(10-2)-3' });
    expect(get('C1')).toBe(-4);
    expect(get('C2')).toBe(5);
    expect(get('C3')).toBe(5);
  });

  it('evaluates a group around a lone value or a cell reference', () => {
    const get = sheet({ ...DATA, C1: '=(1+2)', C2: '=(A1+A2)*2', C3: '=(B1)' });
    expect(get('C1')).toBe(3);
    expect(get('C2')).toBe(6);
    expect(get('C3')).toBe(10);
  });

  it('mixes groups with function calls', () => {
    const get = sheet({
      ...DATA,
      C1: '=SUM(A1:A2)*(2+3)',
      C2: '=(SUM(A1:A2)+1)*2',
      C3: '=(SUM(A1:A2))',
    });
    expect(get('C1')).toBe(15);
    expect(get('C2')).toBe(8);
    expect(get('C3')).toBe(3);
  });

  it('does not treat a parenthesis inside a quoted string as a group', () => {
    const get = sheet({
      C1: '=LEN("a)")',
      C2: '=UPPER("(x")',
      C3: '=2*LEN("()")',
    });
    expect(get('C1')).toBe(2);
    expect(get('C2')).toBe('(X');
    expect(get('C3')).toBe(4);
  });

  it('does not accept an unbalanced or empty group as a number', () => {
    const get = sheet({ C1: '=2*(3+4', C2: '=2*()' });
    expect(get('C1')).not.toBe(14);
    expect(get('C2')).not.toBe(2);
  });
});
