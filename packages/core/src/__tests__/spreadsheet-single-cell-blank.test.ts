/**
 * A single-cell argument (=COUNT(A2), =AVERAGE(A1,A2,A3), =MIN(A1,A4))
 * that is blank must be skipped the same way a blank cell inside a range is.
 *
 * Ranges go through expandRange, which leaves blank cells out. A single cell
 * went through resolveValue instead, which reads an empty or missing cell as
 * 0, so COUNT counted it and AVERAGE and MIN used it as a zero.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

// A1 = 10, A2 = (cleared), A3 = 30, A4 never set, A5 = 0, A6 = formula giving "",
// A7 = "text".
function build(): { model: SpreadsheetModel; id: string } {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.setCell(id, 0, 0, '10');
  model.setCell(id, 1, 0, '20');
  model.setCell(id, 1, 0, ''); // Delete key in eSheets
  model.setCell(id, 2, 0, '30');
  model.setCell(id, 4, 0, '0');
  model.setCell(id, 5, 0, '=IF(A1>5,"","x")');
  model.setCell(id, 6, 0, 'text');
  return { model, id };
}

function formula(model: SpreadsheetModel, id: string, f: string): unknown {
  model.setCell(id, 9, 1, f); // B10
  return model.getCell(id, 9, 1)?.computedValue;
}

describe('blank single-cell arguments', () => {
  it('COUNT does not count a cleared, missing or empty-formula cell', () => {
    const { model, id } = build();
    expect(formula(model, id, '=COUNT(A2)')).toBe(0);
    expect(formula(model, id, '=COUNT(A4)')).toBe(0);
    expect(formula(model, id, '=COUNT(A6)')).toBe(0);
    expect(formula(model, id, '=COUNT(A1,A2,A3,A4)')).toBe(2);
  });

  it('AVERAGE, MIN and MAX ignore a blank single cell', () => {
    const { model, id } = build();
    expect(formula(model, id, '=AVERAGE(A1,A2,A3)')).toBe(20);
    expect(formula(model, id, '=MIN(A1,A4)')).toBe(10);
    expect(formula(model, id, '=MAX(A4)')).toBe(0); // no numbers at all: 0, as before
    model.setCell(id, 7, 0, '-5'); // A8
    expect(formula(model, id, '=MAX(A8,A2)')).toBe(-5);
  });

  it('SUM is unchanged', () => {
    const { model, id } = build();
    expect(formula(model, id, '=SUM(A1,A2,A3,A4)')).toBe(40);
  });

  it('a cell that holds 0 still counts', () => {
    const { model, id } = build();
    expect(formula(model, id, '=COUNT(A5)')).toBe(1);
    expect(formula(model, id, '=AVERAGE(A1,A5)')).toBe(5);
    expect(formula(model, id, '=MIN(A1,A5)')).toBe(0);
  });

  it('text in a single cell is still not a number', () => {
    const { model, id } = build();
    expect(formula(model, id, '=COUNT(A7)')).toBe(0);
    expect(formula(model, id, '=SUM(A1,A7)')).toBe(10);
  });

  it('single cells and ranges can be mixed', () => {
    const { model, id } = build();
    expect(formula(model, id, '=AVERAGE(A1:A2,A4,A3)')).toBe(20);
    expect(formula(model, id, '=COUNT(a2,A1:A3)')).toBe(2);
  });

  it('a blank cell on another sheet is skipped too', () => {
    const { model, id } = build();
    const other = model.addSheet('Data');
    model.setCell(other.id, 0, 0, '7'); // Data!A1
    expect(formula(model, id, '=COUNT(Data!A1,Data!A2)')).toBe(1);
    expect(formula(model, id, '=AVERAGE(Data!A1,Data!A2,A1)')).toBe(8.5);
    expect(formula(model, id, '=COUNT(Nope!A1)')).toBe(0);
  });

  it('COUNTIF on a single blank cell matches nothing', () => {
    const { model, id } = build();
    expect(formula(model, id, '=COUNTIF(A2,"<1")')).toBe(0);
    expect(formula(model, id, '=COUNTIF(A5,"<1")')).toBe(1);
  });
});
