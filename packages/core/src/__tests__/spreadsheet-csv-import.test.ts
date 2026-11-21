/**
 * importCSV reads RFC 4180 CSV: a quoted field can hold a line break (which
 * is how exportCSV writes a multi-line cell), and rows can end in \r\n as
 * they do in files saved on Windows.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function imported(csv: string): (row: number, col: number) => string | undefined {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.importCSV(csv, id);
  return (row, col) => model.getCell(id, row, col)?.value;
}

describe('SpreadsheetModel.importCSV', () => {
  it('keeps a line break inside a quoted field in one cell', () => {
    const cell = imported('Item,Note\nLamp,"two lines\nhere"\nDesk,ok');
    expect(cell(1, 0)).toBe('Lamp');
    expect(cell(1, 1)).toBe('two lines\nhere');
    expect(cell(2, 0)).toBe('Desk');
    expect(cell(2, 1)).toBe('ok');
    expect(cell(3, 0)).toBeUndefined();
  });

  it('reads back what exportCSV writes for a multi-line cell', () => {
    const source = new SpreadsheetModel();
    const id = source.activeSheetId;
    source.setCell(id, 0, 0, 'Address');
    source.setCell(id, 0, 1, 'City');
    source.setCell(id, 1, 0, '1 Main St\nFlat 2, "Rear"');
    source.setCell(id, 1, 1, 'Leeds');
    source.setCell(id, 2, 0, '9 High St');
    source.setCell(id, 2, 1, 'York');

    const cell = imported(source.exportCSV(id));
    expect(cell(0, 0)).toBe('Address');
    expect(cell(1, 0)).toBe('1 Main St\nFlat 2, "Rear"');
    expect(cell(1, 1)).toBe('Leeds');
    expect(cell(2, 0)).toBe('9 High St');
    expect(cell(2, 1)).toBe('York');
  });

  it('ends rows at \\r\\n without leaving \\r in the last cell', () => {
    const cell = imported('Name,Age\r\nAlice,30\r\nBob,25\r\n');
    expect(cell(0, 1)).toBe('Age');
    expect(cell(1, 0)).toBe('Alice');
    expect(cell(1, 1)).toBe('30');
    expect(cell(2, 1)).toBe('25');
    expect(cell(3, 0)).toBeUndefined();
  });

  it('keeps a \\r\\n inside a quoted field', () => {
    const cell = imported('"a\r\nb",c\r\nd,e');
    expect(cell(0, 0)).toBe('a\r\nb');
    expect(cell(0, 1)).toBe('c');
    expect(cell(1, 0)).toBe('d');
  });

  it('still reads plain rows, quoted commas and doubled quotes', () => {
    const cell = imported('"Last, First",Age\n"Say ""hi""",25');
    expect(cell(0, 0)).toBe('Last, First');
    expect(cell(1, 0)).toBe('Say "hi"');
    expect(cell(1, 1)).toBe('25');
  });
});
