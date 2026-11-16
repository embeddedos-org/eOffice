/**
 * A cell whose content was deleted, or that only carries formatting, is
 * blank: range functions must skip it, not read it as the number 0.
 *
 * eSheets clears content with setCell(..., '') (Delete, cut, merge) and
 * setCellFormat creates a cell with value ''. expandRange turned that ''
 * into Number('') === 0, so AVERAGE, COUNT and MIN counted the blank.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

const A = (row: number) => ({ row: row - 1, col: 0 });

function build(): { model: SpreadsheetModel; id: string } {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  model.setCell(id, A(1).row, 0, '10');
  model.setCell(id, A(2).row, 0, '20');
  model.setCell(id, A(3).row, 0, '30');
  return { model, id };
}

function formula(model: SpreadsheetModel, id: string, f: string): unknown {
  model.setCell(id, 9, 1, f);
  return model.getCell(id, 9, 1)?.computedValue;
}

describe('blank cells in ranges', () => {
  it('a cell whose content was deleted is skipped by AVERAGE, COUNT and MIN', () => {
    const { model, id } = build();
    model.setCell(id, A(2).row, 0, ''); // Delete key in eSheets
    expect(formula(model, id, '=AVERAGE(A1:A3)')).toBe(20);
    expect(formula(model, id, '=COUNT(A1:A3)')).toBe(2);
    expect(formula(model, id, '=MIN(A1:A3)')).toBe(10);
    expect(formula(model, id, '=SUM(A1:A3)')).toBe(40);
  });

  it('a cell that only has formatting is skipped', () => {
    const { model, id } = build();
    model.setCellFormat(id, 4 - 1, 0, { bold: true }); // A4: formatted, no value
    expect(formula(model, id, '=AVERAGE(A1:A4)')).toBe(20);
    expect(formula(model, id, '=COUNT(A1:A4)')).toBe(3);
    expect(formula(model, id, '=MIN(A1:A4)')).toBe(10);
  });

  it('a formula that returns "" is not counted as a number', () => {
    const { model, id } = build();
    model.setCell(id, 4 - 1, 0, '=IF(A1>100, 1, "")');
    expect(formula(model, id, '=COUNT(A1:A4)')).toBe(3);
    expect(formula(model, id, '=AVERAGE(A1:A4)')).toBe(20);
  });

  it('a real 0 is still a number', () => {
    const { model, id } = build();
    model.setCell(id, A(2).row, 0, '0');
    expect(formula(model, id, '=COUNT(A1:A3)')).toBe(3);
    expect(formula(model, id, '=MIN(A1:A3)')).toBe(0);
    expect(formula(model, id, '=AVERAGE(A1:A3)')).toBe(40 / 3);
  });

  it('MAX of a range of only negatives ignores the blank', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '-5');
    model.setCell(id, 1, 0, '');
    model.setCell(id, 2, 0, '-2');
    expect(formula(model, id, '=MAX(A1:A3)')).toBe(-2);
  });
});
