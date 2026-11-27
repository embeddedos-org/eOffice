/**
 * COUNTIF / SUMIF wildcard criteria must treat regex metacharacters as
 * literal text.  Before the fix, a dot in the criteria matched any
 * character because it was passed straight into the RegExp.
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

describe('COUNTIF wildcard criteria escape regex metacharacters', () => {
  it('a dot in the criteria matches only a literal dot', () => {
    // "v2.0" should match "v2.0" but NOT "v2X0"
    const get = sheet({
      A1: 'v2.0',
      A2: 'v2X0',
      A3: 'v2.0',
      B1: '=COUNTIF(A1:A3,"v2.0")',
    });
    expect(get('B1')).toBe(2);
  });

  it('parentheses in the criteria are literal', () => {
    const get = sheet({
      A1: 'foo(bar)',
      A2: 'fooXbarY',
      B1: '=COUNTIF(A1:A2,"foo(bar)")',
    });
    expect(get('B1')).toBe(1);
  });

  it('wildcard * still works alongside escaped metacharacters', () => {
    const get = sheet({
      A1: 'v2.0-beta',
      A2: 'v2X0-beta',
      A3: 'v2.1-rc',
      B1: '=COUNTIF(A1:A3,"v2.*")',
    });
    // "v2." is literal, then * matches anything: v2.0-beta and v2.1-rc
    expect(get('B1')).toBe(2);
  });
});
