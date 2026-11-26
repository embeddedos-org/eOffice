/**
 * VLOOKUP's column index, HLOOKUP's row index and INDEX's row and column
 * numbers are 1-based positions inside the range; fractions are truncated.
 * None of them may read a cell to the left of or above the range.
 *
 * VLOOKUP and HLOOKUP: an index below 1 (or one that is not a number) is
 * #VALUE!, as in other spreadsheets.
 * INDEX: in other spreadsheets a row or column of 0 selects the whole column
 * or row of the range (an array result). eSheets has no array results, so a
 * 0 or negative position gives #VALUE! here instead of a cell outside the range.
 */
import { describe, it, expect } from 'vitest';
import { SpreadsheetModel } from '../spreadsheet-model';

/*
 * Grid used by every test (rows 1-3, columns A-D):
 *
 *        A        B      C     D
 *   1  outside  key    10    20
 *   2  left-a   apple  1     2
 *   3  left-b   pear   3     4
 */
function evaluate(f: string): unknown {
  const model = new SpreadsheetModel();
  const id = model.activeSheetId;
  const grid = [
    ['outside', 'key', '10', '20'],
    ['left-a', 'apple', '1', '2'],
    ['left-b', 'pear', '3', '4'],
  ];
  grid.forEach((row, r) => row.forEach((v, c) => model.setCell(id, r, c, v)));
  model.setCell(id, 5, 0, f); // A6
  return model.getCell(id, 5, 0)?.computedValue;
}

describe('VLOOKUP column index', () => {
  it('still returns the value in the given column of the range', () => {
    expect(evaluate('=VLOOKUP("pear",B2:D3,1)')).toBe('pear');
    expect(evaluate('=VLOOKUP("pear",B2:D3,2)')).toBe(3);
    expect(evaluate('=VLOOKUP("pear",B2:D3,3)')).toBe(4);
    expect(evaluate('=VLOOKUP("pear",B2:D3,4)')).toBe('#REF!');
  });

  it('is #VALUE! below 1 instead of reading the column left of the range', () => {
    expect(evaluate('=VLOOKUP("pear",B2:D3,0)')).toBe('#VALUE!');
    expect(evaluate('=VLOOKUP("pear",B2:D3,-1)')).toBe('#VALUE!');
    expect(evaluate('=VLOOKUP("pear",B2:D3,0.5)')).toBe('#VALUE!');
  });

  it('is #VALUE! for an index that is not a number', () => {
    expect(evaluate('=VLOOKUP("pear",B2:D3,"x")')).toBe('#VALUE!');
  });

  it('truncates a fractional index', () => {
    expect(evaluate('=VLOOKUP("pear",B2:D3,2.9)')).toBe(3);
    expect(evaluate('=VLOOKUP("pear",B2:D3,"3")')).toBe(4);
  });
});

describe('HLOOKUP row index', () => {
  it('still returns the value in the given row of the range', () => {
    expect(evaluate('=HLOOKUP("key",B1:D3,2)')).toBe('apple');
    expect(evaluate('=HLOOKUP(10,C1:D3,3)')).toBe(3);
    expect(evaluate('=HLOOKUP(10,C1:D3,4)')).toBe('#REF!');
  });

  it('is #VALUE! below 1 instead of reading the row above the range', () => {
    expect(evaluate('=HLOOKUP("apple",B2:D3,0)')).toBe('#VALUE!');
    expect(evaluate('=HLOOKUP("apple",B2:D3,-1)')).toBe('#VALUE!');
  });

  it('truncates a fractional index', () => {
    expect(evaluate('=HLOOKUP(10,C1:D3,2.5)')).toBe(1);
  });
});

describe('INDEX row and column', () => {
  it('still returns the cell at the given position in the range', () => {
    expect(evaluate('=INDEX(B2:D3,1,1)')).toBe('apple');
    expect(evaluate('=INDEX(B2:D3,2,3)')).toBe(4);
    expect(evaluate('=INDEX(B2:D3,3,1)')).toBe('#REF!');
    expect(evaluate('=INDEX(B2:D3,1,4)')).toBe('#REF!');
  });

  it('is #VALUE! for a row or column below 1 instead of reading outside the range', () => {
    expect(evaluate('=INDEX(B2:D3,0,1)')).toBe('#VALUE!');
    expect(evaluate('=INDEX(B2:D3,1,0)')).toBe('#VALUE!');
    expect(evaluate('=INDEX(B2:D3,-1,2)')).toBe('#VALUE!');
    expect(evaluate('=INDEX(B2:D3,2,-1)')).toBe('#VALUE!');
  });

  it('truncates fractional positions', () => {
    expect(evaluate('=INDEX(B2:D3,2.7,3.2)')).toBe(4);
  });
});
