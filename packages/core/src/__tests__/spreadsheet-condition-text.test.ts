/**
 * Conditions in IF / AND / OR / NOT that compare text.
 *
 * evalCondition converted both sides with Number(), so any text became
 * NaN: "=" was never true and "<>" was always true for text.
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

describe('SpreadsheetModel conditions on text', () => {
  it('IF with = matches equal text', () => {
    const get = sheet({ A1: 'yes', B1: '=IF(A1="yes", "match", "no match")' });
    expect(get('B1')).toBe('match');
  });

  it('IF with = ignores case, like other spreadsheets', () => {
    const get = sheet({ A1: 'Paid', B1: '=IF(A1="paid", 1, 0)' });
    expect(get('B1')).toBe(1);
  });

  it('IF with = is false for different text', () => {
    const get = sheet({ A1: 'no', B1: '=IF(A1="yes", 1, 0)' });
    expect(get('B1')).toBe(0);
  });

  it('IF with <> is false for equal text', () => {
    const get = sheet({ A1: 'yes', B1: '=IF(A1<>"yes", 1, 0)', C1: '=IF(A1!="yes", 1, 0)' });
    expect(get('B1')).toBe(0);
    expect(get('C1')).toBe(0);
  });

  it('IF compares two text cells', () => {
    const get = sheet({ A1: 'red', A2: 'red', A3: 'blue', B1: '=IF(A1=A2, 1, 0)', B2: '=IF(A1=A3, 1, 0)' });
    expect(get('B1')).toBe(1);
    expect(get('B2')).toBe(0);
  });

  it('AND, OR and NOT use the same text comparison', () => {
    const get = sheet({
      A1: 'open',
      A2: '7',
      B1: '=AND(A1="open", A2>5)',
      B2: '=OR(A1="closed", A2>100)',
      B3: '=NOT(A1="open")',
    });
    expect(get('B1')).toBe(1);
    expect(get('B2')).toBe(0);
    expect(get('B3')).toBe(0);
  });

  it('text never equals a number', () => {
    const get = sheet({ A1: 'abc', B1: '=IF(A1=0, 1, 0)' });
    expect(get('B1')).toBe(0);
  });

  it('numeric comparisons are unchanged', () => {
    const get = sheet({
      A1: '10',
      B1: '=IF(A1=10, 1, 0)',
      B2: '=IF(A1<>10, 1, 0)',
      B3: '=IF(A1>=10, 1, 0)',
      B4: '=IF(A1="10", 1, 0)',
      B5: '=IF(A9="", 1, 0)',
    });
    expect(get('B1')).toBe(1);
    expect(get('B2')).toBe(0);
    expect(get('B3')).toBe(1);
    expect(get('B4')).toBe(1);
    expect(get('B5')).toBe(1);
  });
});
