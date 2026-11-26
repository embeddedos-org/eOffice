/**
 * COUNTA counts the cells that are not empty. A cell holding the number 0
 * is not empty; a cell with no content (never set, deleted, or only
 * formatted) is.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

function sheet(values: string[]): { model: SpreadsheetModel; id: string } {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  values.forEach((v, row) => {
    if (v !== '') model.setCell(id, row, 0, v); // column A
  });
  return { model, id };
}

function formula(model: SpreadsheetModel, id: string, f: string): unknown {
  model.setCell(id, 0, 5, f); // F1
  return model.getCell(id, 0, 5)?.computedValue;
}

describe('COUNTA', () => {
  it('counts a cell that holds 0', () => {
    const { model, id } = sheet(['0', '5', 'x']);
    expect(formula(model, id, '=COUNTA(A1:A3)')).toBe(3);
  });

  it('counts a formula whose result is 0', () => {
    const { model, id } = sheet(['5', '=A1-5']);
    expect(formula(model, id, '=COUNTA(A1:A2)')).toBe(2);
  });

  it('counts a single cell that holds 0, but not an empty one', () => {
    const { model, id } = sheet(['0', '', '7']);
    expect(formula(model, id, '=COUNTA(A1)')).toBe(1);
    expect(formula(model, id, '=COUNTA(A2)')).toBe(0);
    expect(formula(model, id, '=COUNTA(A1,A2,A3)')).toBe(2);
  });

  it('counts a 0 on another sheet', () => {
    const model = new SpreadsheetModel();
    const first = model.activeSheetId;
    const other = model.addSheet('Data').id;
    model.setCell(other, 0, 0, '0');
    model.setCell(other, 1, 0, 'y');
    model.setCell(first, 0, 5, '=COUNTA(Data!A1:A3)');
    expect(model.getCell(first, 0, 5)?.computedValue).toBe(2);
    model.setCell(first, 1, 5, '=COUNTA(Data!A1)');
    expect(model.getCell(first, 1, 5)?.computedValue).toBe(1);
  });

  it('still skips empty, deleted and formatted-only cells', () => {
    const { model, id } = sheet(['1', '', 'a', '2']);
    model.setCell(id, 3, 0, ''); // A4 deleted
    model.setCellFormat(id, 4, 0, { bold: true }); // A5 formatted only
    expect(formula(model, id, '=COUNTA(A1:A6)')).toBe(2);
  });

  // Issue #66: a formula that returns '' still holds a formula, so the cell
  // is not empty. rangeSlots reports '' as an empty slot, the same as a
  // missing cell, so COUNTA used to skip it and undercount.
  describe('a formula whose result is an empty string', () => {
    it('counts it in a range', () => {
      const { model, id } = sheet(['x', '=IF(1>2,"y","")']);
      // A3 is genuinely empty.
      expect(formula(model, id, '=COUNTA(A1:A3)')).toBe(2);
    });

    it('counts it as a single-cell argument', () => {
      const { model, id } = sheet(['=IF(1>2,"y","")']);
      expect(formula(model, id, '=COUNTA(A1)')).toBe(1);
    });

    it('counts several of them, and still skips the empty cells', () => {
      const { model, id } = sheet(['=IF(1>2,"y","")', '', '=IF(1>2,"y","")', '5']);
      model.setCell(id, 4, 0, ''); // A5 deleted
      model.setCellFormat(id, 5, 0, { bold: true }); // A6 formatted only
      expect(formula(model, id, '=COUNTA(A1:A6)')).toBe(3);
    });

    it('counts it on another sheet', () => {
      const model = new SpreadsheetModel();
      const first = model.activeSheetId;
      const other = model.addSheet('Data').id;
      model.setCell(other, 0, 0, '=IF(1>2,"y","")');
      model.setCell(other, 1, 0, 'y');
      model.setCell(first, 0, 5, '=COUNTA(Data!A1:A3)');
      expect(model.getCell(first, 0, 5)?.computedValue).toBe(2);
    });

    it('does not make a plain empty-text cell count', () => {
      const { model, id } = sheet(['a']);
      model.setCell(id, 1, 0, ''); // A2 holds no formula
      expect(formula(model, id, '=COUNTA(A1:A2)')).toBe(1);
    });
  });
});
