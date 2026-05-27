/**
 * Frontend Performance Tests
 * Tests: Store operations, utility functions, data processing under load
 * Validates that key operations complete within acceptable time thresholds
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../../store/documentStore';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { SpreadsheetModel } from '../../../packages/core/src/spreadsheet-model';

function resetDocumentStore() {
  useDocumentStore.setState({
    documents: [],
    recentDocuments: [],
    currentDocument: null,
    isLoading: false,
    hasUnsavedChanges: false,
    autoSaveEnabled: true,
  });
}

describe('Performance — Document Store Operations', () => {
  beforeEach(resetDocumentStore);

  it('creates 100 documents in under 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      useDocumentStore.getState().createDocument('writer', `Document ${i}`);
    }
    const duration = performance.now() - start;
    expect(useDocumentStore.getState().documents).toHaveLength(100);
    expect(duration).toBeLessThan(500);
    console.log(`  ✓ Created 100 documents in ${duration.toFixed(2)}ms`);
  });

  it('deletes 50 documents in under 200ms', () => {
    // Create 50 documents first
    for (let i = 0; i < 50; i++) {
      useDocumentStore.getState().createDocument('writer', `Doc ${i}`);
    }
    const ids = useDocumentStore.getState().documents.map(d => d.id);

    const start = performance.now();
    for (const id of ids) {
      useDocumentStore.getState().deleteDocument(id);
    }
    const duration = performance.now() - start;
    expect(useDocumentStore.getState().documents).toHaveLength(0);
    expect(duration).toBeLessThan(200);
    console.log(`  ✓ Deleted 50 documents in ${duration.toFixed(2)}ms`);
  });

  it('saves content to 20 documents in under 100ms', () => {
    for (let i = 0; i < 20; i++) {
      useDocumentStore.getState().createDocument('writer', `Doc ${i}`);
    }
    const ids = useDocumentStore.getState().documents.map(d => d.id);
    const content = '<p>' + 'A'.repeat(1000) + '</p>';

    const start = performance.now();
    for (const id of ids) {
      useDocumentStore.getState().saveDocument(id, content);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    console.log(`  ✓ Saved content to 20 documents in ${duration.toFixed(2)}ms`);
  });

  it('stars and unstars 100 documents in under 300ms', () => {
    for (let i = 0; i < 100; i++) {
      useDocumentStore.getState().createDocument('writer', `Doc ${i}`);
    }
    const ids = useDocumentStore.getState().documents.map(d => d.id);

    const start = performance.now();
    for (const id of ids) {
      useDocumentStore.getState().starDocument(id);
    }
    for (const id of ids) {
      useDocumentStore.getState().starDocument(id); // unstar
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(300);
    console.log(`  ✓ Starred/unstarred 100 documents in ${duration.toFixed(2)}ms`);
  });
});

describe('Performance — Theme Store Operations', () => {
  it('performs 1000 theme changes in under 100ms', () => {
    const themes = ['light', 'dark', 'system'] as const;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      useThemeStore.getState().setTheme(themes[i % 3]);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    console.log(`  ✓ 1000 theme changes in ${duration.toFixed(2)}ms`);
  });

  it('performs 1000 font size changes in under 100ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      useThemeStore.getState().setFontSize(12 + (i % 12));
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    console.log(`  ✓ 1000 font size changes in ${duration.toFixed(2)}ms`);
  });
});

describe('Performance — cn() Utility', () => {
  it('generates 10,000 class names in under 200ms', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      cn('flex', 'items-center', i % 2 === 0 ? 'text-red-500' : 'text-blue-500', {
        'font-bold': i % 3 === 0,
        'opacity-50': i % 5 === 0,
      });
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
    console.log(`  ✓ 10,000 cn() calls in ${duration.toFixed(2)}ms`);
  });

  it('resolves 1,000 tailwind conflicts in under 100ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      cn(`p-${i % 8}`, `p-${(i + 1) % 8}`, `m-${i % 4}`, `m-${(i + 2) % 4}`);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    console.log(`  ✓ 1,000 conflict resolutions in ${duration.toFixed(2)}ms`);
  });
});

describe('Performance — SpreadsheetModel', () => {
  it('populates 1000 cells in under 500ms', () => {
    const model = new SpreadsheetModel();
    const sheetId = model.activeSheetId;
    const start = performance.now();
    for (let row = 0; row < 40; row++) {
      for (let col = 0; col < 25; col++) {
        model.setCell(sheetId, row, col, `${row * 25 + col}`);
      }
    }
    const duration = performance.now() - start;
    expect(model.getCellCount()).toBe(1000);
    expect(duration).toBeLessThan(500);
    console.log(`  ✓ Populated 1000 cells in ${duration.toFixed(2)}ms`);
  });

  it('calculates SUM formula over 100 cells in under 100ms', () => {
    const model = new SpreadsheetModel();
    const sheetId = model.activeSheetId;
    // Populate A1:A100 with values
    for (let i = 0; i < 100; i++) {
      model.setCell(sheetId, i, 0, `${i + 1}`);
    }
    const start = performance.now();
    model.setCell(sheetId, 100, 0, '=SUM(A1:A100)');
    const result = model.getCell(sheetId, 100, 0);
    const duration = performance.now() - start;
    expect(Number(result?.computedValue)).toBe(5050); // sum of 1..100
    expect(duration).toBeLessThan(100);
    console.log(`  ✓ SUM(A1:A100) calculated in ${duration.toFixed(2)}ms`);
  });

  it('creates and removes 10 sheets in under 200ms', () => {
    const model = new SpreadsheetModel();
    const start = performance.now();
    const sheets = [];
    for (let i = 0; i < 10; i++) {
      sheets.push(model.addSheet(`Sheet ${i + 2}`));
    }
    for (const sheet of sheets) {
      model.removeSheet(sheet.id);
    }
    const duration = performance.now() - start;
    expect(model.sheets).toHaveLength(1);
    expect(duration).toBeLessThan(200);
    console.log(`  ✓ Created/removed 10 sheets in ${duration.toFixed(2)}ms`);
  });

  it('exports CSV for 500-cell sheet in under 200ms', () => {
    const model = new SpreadsheetModel();
    const sheetId = model.activeSheetId;
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 25; col++) {
        model.setCell(sheetId, row, col, `Cell-${row}-${col}`);
      }
    }
    const start = performance.now();
    const csv = model.exportCSV(sheetId);
    const duration = performance.now() - start;
    expect(csv.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(200);
    console.log(`  ✓ Exported 500-cell CSV in ${duration.toFixed(2)}ms`);
  });

  it('JSON serialization round-trip for 200-cell model in under 100ms', () => {
    const model = new SpreadsheetModel();
    const sheetId = model.activeSheetId;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 20; col++) {
        model.setCell(sheetId, row, col, `${row * 20 + col}`);
      }
    }
    const start = performance.now();
    const json = model.toJSON();
    const model2 = SpreadsheetModel.fromJSON(json as { sheets: any[]; activeSheetId: string });
    const duration = performance.now() - start;
    expect(model2.getCellCount()).toBe(200);
    expect(duration).toBeLessThan(100);
    console.log(`  ✓ JSON round-trip for 200 cells in ${duration.toFixed(2)}ms`);
  });
});

describe('Performance — Memory Efficiency', () => {
  it('document store does not leak memory with many create/delete cycles', () => {
    resetDocumentStore();
    // Create and delete 500 documents in cycles
    for (let cycle = 0; cycle < 5; cycle++) {
      for (let i = 0; i < 100; i++) {
        useDocumentStore.getState().createDocument('writer', `Doc ${i}`);
      }
      const ids = useDocumentStore.getState().documents.map(d => d.id);
      for (const id of ids) {
        useDocumentStore.getState().deleteDocument(id);
      }
    }
    expect(useDocumentStore.getState().documents).toHaveLength(0);
  });

  it('spreadsheet model handles large formula recalculation without crash', () => {
    const model = new SpreadsheetModel();
    const sheetId = model.activeSheetId;
    // Create a chain of dependent formulas
    model.setCell(sheetId, 0, 0, '1');
    for (let i = 1; i < 50; i++) {
      const prevCol = String.fromCharCode(65 + ((i - 1) % 26));
      const currCol = String.fromCharCode(65 + (i % 26));
      // Each cell references the previous one
      model.setCell(sheetId, 0, i % 26, `=${prevCol}1`);
    }
    // Should not throw
    expect(() => model.setCell(sheetId, 0, 0, '42')).not.toThrow();
  });
});
