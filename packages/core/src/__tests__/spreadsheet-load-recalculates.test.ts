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

  it('loads a dependency chain far deeper than the call stack', () => {
    // fromJSON() now recalculates, and recalculate() orders the formulas with
    // a depth-first search. A recursive search cost one frame per link, so a
    // long chain threw RangeError out of fromJSON and the workbook never
    // loaded. A1 = 1, then each cell adds 1 to the one above it.
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    const depth = 20000;
    const sheet = (model as unknown as { sheets: { id: string; cells: Record<string, unknown> }[] })
      .sheets[0];
    // Written straight into the sheet: setCell() recalculates on every call,
    // which would make building a chain this long quadratic.
    sheet.cells['0:0'] = { value: '1' };
    // Written deepest first, so the ordering walk starts at the far end of the
    // chain and has to descend the whole way. Inserted the other way round,
    // each cell's dependency is already visited and the walk never goes deep.
    for (let r = depth; r >= 1; r -= 1) {
      sheet.cells[`${r}:0`] = { value: `=A${r}+1`, formula: `=A${r}+1` };
    }

    let loaded: SpreadsheetModel | undefined;
    expect(() => {
      loaded = SpreadsheetModel.fromJSON(save(model));
    }).not.toThrow();
    expect(loaded!.getCell(id, 1, 0)?.computedValue).toBe(2);
    expect(loaded!.getCell(id, depth, 0)?.computedValue).toBe(depth + 1);
  });

  it('loads a formula over a range far larger than the cells in it', () => {
    // The dependency scan used to enumerate every coordinate a range spans and
    // push a node id for each, once per formula, on every recalculate() — and
    // fromJSON() now calls recalculate(). This range covers a million cells
    // and two of them hold anything. Only formula cells can be graph nodes, so
    // the scan now looks at the formulas in the sheet instead of the area.
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '2');
    model.setCell(id, 1, 0, '3');
    // In B1, so the formula is not inside its own range.
    model.setCell(id, 0, 1, '=SUM(A1:A1000000)');

    const started = Date.now();
    const loaded = SpreadsheetModel.fromJSON(save(model));
    expect(Date.now() - started).toBeLessThan(5000);
    expect(loaded.getCell(id, 0, 1)?.computedValue).toBe(5);
  });

  it('still reports a circular chain rather than looping', () => {
    const model = new SpreadsheetModel();
    const id = model.activeSheetId;
    model.setCell(id, 0, 0, '=A2+1');
    model.setCell(id, 1, 0, '=A1+1');

    const loaded = SpreadsheetModel.fromJSON(save(model));
    expect(loaded.getCell(id, 0, 0)?.computedValue).toBe('#CIRCULAR!');
    expect(loaded.getCell(id, 1, 0)?.computedValue).toBe('#CIRCULAR!');
  });
});
