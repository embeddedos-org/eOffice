/**
 * exportToXlsx marks a cell as a Number only when its text is a decimal number.
 *
 * The check was `!isNaN(Number(cell))`, and JavaScript's Number() also accepts
 * whitespace (" " -> 0), hex/binary/octal ("0x1F", "0b101", "0o17") and
 * "Infinity". Those cells were written as <Data ss:Type="Number"> with text
 * that is not a SpreadsheetML number.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockBlob = vi.fn().mockImplementation((content: string[], options: { type: string }) => ({
  _content: content.join(''),
  _type: options?.type,
}));

vi.stubGlobal('Blob', mockBlob);
vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:mock-url'), revokeObjectURL: vi.fn() });
vi.stubGlobal('document', {
  createElement: vi.fn().mockReturnValue({ href: '', download: '', click: vi.fn() }),
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
});

import { exportToXlsx } from '../file-export';

function cellType(cell: string): string | undefined {
  mockBlob.mockClear();
  exportToXlsx('Sheet', [[cell]]);
  const xml = (mockBlob.mock.calls[0][0] as string[]).join('');
  return /<Data ss:Type="(\w+)">/.exec(xml)?.[1];
}

describe('exportToXlsx number cells', () => {
  beforeEach(() => {
    mockBlob.mockClear();
  });

  it.each(['30', '-1.5', '+2', '0.25', '.5', '3.', '1e3', '6.02E-23', '007', ' 12 '])(
    'writes %j as a Number',
    (cell) => {
      expect(cellType(cell)).toBe('Number');
    },
  );

  it.each([' ', '\t', '0x1F', '0b101', '0o17', 'Infinity', '-Infinity', 'abc', ''])(
    'writes %j as a String',
    (cell) => {
      expect(cellType(cell)).toBe('String');
    },
  );
});
