/**
 * SUMIF / AVERAGEIF pair each cell of the criteria range with the cell in
 * the same position of the sum or average range.
 *
 * Both ranges were read with expandRange, which leaves out empty cells, so
 * one empty cell in either range shifted every later pair by one.
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

describe('SUMIF and AVERAGEIF keep the two ranges aligned', () => {
  it('SUMIF with an empty cell in the criteria range', () => {
    // A2 is empty: rows 1 and 3 match, so B1 + B3 = 1 + 100.
    const get = sheet({ A1: 'x', A3: 'x', B1: '1', B2: '10', B3: '100', D1: '=SUMIF(A1:A3,"x",B1:B3)' });
    expect(get('D1')).toBe(101);
  });

  it('SUMIF with an empty cell in the sum range', () => {
    // B1 is empty: only row 2 matches, so the sum is B2 = 10.
    const get = sheet({ A1: 'y', A2: 'x', A3: 'y', B2: '10', B3: '100', D1: '=SUMIF(A1:A3,"x",B1:B3)' });
    expect(get('D1')).toBe(10);
  });

  it('SUMIF with no gaps is unchanged', () => {
    const get = sheet({ A1: 'x', A2: 'y', A3: 'x', B1: '1', B2: '10', B3: '100', D1: '=SUMIF(A1:A3,"x",B1:B3)' });
    expect(get('D1')).toBe(101);
  });

  it('SUMIF without a sum range sums the matching cells themselves', () => {
    const get = sheet({ A1: '5', A3: '20', D1: '=SUMIF(A1:A3,">4")' });
    expect(get('D1')).toBe(25);
  });

  it('AVERAGEIF with an empty cell in the criteria range', () => {
    const get = sheet({ A1: 'x', A3: 'x', B1: '2', B2: '50', B3: '4', D1: '=AVERAGEIF(A1:A3,"x",B1:B3)' });
    expect(get('D1')).toBe(3);
  });

  it('AVERAGEIF skips an average cell whose content was deleted', () => {
    // eSheets clears a cell with setCell(..., ''), leaving a cell whose value is ''.
    const get = sheet({ A1: 'x', A2: 'x', B1: '', B2: '8', D1: '=AVERAGEIF(A1:A2,"x",B1:B2)' });
    expect(get('D1')).toBe(8);
  });

  it('AVERAGEIF skips a matching row whose average cell is empty', () => {
    const get = sheet({ A1: 'x', A2: 'x', A3: 'y', B2: '8', B3: '100', D1: '=AVERAGEIF(A1:A3,"x",B1:B3)' });
    expect(get('D1')).toBe(8);
  });
});
