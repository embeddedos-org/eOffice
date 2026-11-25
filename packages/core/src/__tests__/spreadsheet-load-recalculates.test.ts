/**
 * Loading a workbook recalculates its formulas instead of trusting the
 * saved computedValue cache.
 *
 * SpreadsheetModel.fromJSON() copied each cell's saved computedValue as-is,
 * so a workbook kept showing the result the formula had when it was saved:
 * stale whenever an input changed in the saved file, or whenever the
 * evaluator's semantics changed since the save (a workbook saved before a
 * formula fix kept the old wrong number in the grid and in exports until
 * the cell was edited).
 *
 * Issue #65.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

type Saved = { sheets: any[]; activeSheetId: string };

function save(model: SpreadsheetModel): Saved {
  // Through JSON, as a real save/load round-trip goes.
  return JSON.parse(JSON.stringify(model.toJSON())) as Saved;
}

describe('SpreadsheetModel.fromJSON recalculates formulas', () => {
  it('recomputes a formula whose input changed in the saved file', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '2'); // A1
    model.setCell(id, 1, 0, '=A1*10'); // A2
    expect(model.getCell(id, 1, 0)?.computedValue).toBe(20);

    const json = save(model);
    json.sheets[0].cells['0:0'].value = '5'; // A1 edited out of band

    const loaded = SpreadsheetModel.fromJSON(json);
    expect(loaded.getCell(id, 1, 0)?.computedValue).toBe(50);
  });

  it('replaces a cached value that the evaluator no longer agrees with', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '=1+1');
    const json = save(model);
    // What a workbook saved by an older, wrong evaluator looks like.
    json.sheets[0].cells['0:0'].computedValue = 99;

    const loaded = SpreadsheetModel.fromJSON(json);
    expect(loaded.getCell(id, 0, 0)?.computedValue).toBe(2);
  });

  it('recomputes a chain of dependent formulas in order', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '1'); // A1
    model.setCell(id, 1, 0, '=A1+1'); // A2
    model.setCell(id, 2, 0, '=A2*3'); // A3

    const json = save(model);
    json.sheets[0].cells['0:0'].value = '4';

    const loaded = SpreadsheetModel.fromJSON(json);
    expect(loaded.getCell(id, 1, 0)?.computedValue).toBe(5);
    expect(loaded.getCell(id, 2, 0)?.computedValue).toBe(15);
  });

  it('recomputes across sheets', () => {
    const model = new SpreadsheetModel();
    const first = model.activeSheetId;
    const other = model.addSheet('Data').id;
    model.setCell(other, 0, 0, '3');
    model.setCell(first, 0, 0, '=Data!A1*2');
    expect(model.getCell(first, 0, 0)?.computedValue).toBe(6);

    const json = save(model);
    const dataSheet = json.sheets.find((s) => s.name === 'Data')!;
    dataSheet.cells['0:0'].value = '7';

    const loaded = SpreadsheetModel.fromJSON(json);
    expect(loaded.getCell(first, 0, 0)?.computedValue).toBe(14);
  });

  it('leaves plain values and formatting alone', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, 'Hello');
    model.setCell(id, 0, 1, '42');
    model.setCellFormat(id, 0, 0, { bold: true });

    const loaded = SpreadsheetModel.fromJSON(save(model));
    expect(loaded.getCell(id, 0, 0)?.value).toBe('Hello');
    expect(loaded.getCell(id, 0, 1)?.value).toBe('42');
    expect(loaded.getCell(id, 0, 0)?.format?.bold).toBe(true);
  });

  it('does not write computed values back into the JSON it was given', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '2');
    model.setCell(id, 1, 0, '=A1*10');

    const json = save(model);
    json.sheets[0].cells['0:0'].value = '5';

    const loaded = SpreadsheetModel.fromJSON(json);
    expect(loaded.getCell(id, 1, 0)?.computedValue).toBe(50);
    // The caller's object still holds what was on disk.
    expect(json.sheets[0].cells['1:0'].computedValue).toBe(20);
  });
});
