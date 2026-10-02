import { readFileSync } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(path.resolve(__dirname, '../../../browser/enotes.html'), 'utf8');

const UNSAFE_TAGS = ['x" data-injected="1', "');window.__xss=1;//", '<img src=x id=injected-img>'];

// Inline handlers only run with runScripts "dangerously", which is what makes
// an onclick injection observable here.
function openNotes(storedNotes: unknown[]) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.localStorage.setItem('enotes_data', JSON.stringify(storedNotes));
    },
  });
}

function listTagPills(dom: JSDOM) {
  return [...dom.window.document.querySelectorAll<HTMLElement>('#noteList .tag-pill')];
}

function expectNothingInjected(dom: JSDOM) {
  const { document } = dom.window;
  expect(document.querySelector('[data-injected]')).toBeNull();
  expect(document.getElementById('injected-img')).toBeNull();
  expect((dom.window as unknown as { __xss?: number }).__xss).toBeUndefined();
}

async function importFile(dom: JSDOM, notes: unknown) {
  const { window } = dom;
  const input = window.document.getElementById('importInput') as HTMLInputElement;
  const file = new window.File([JSON.stringify(notes)], 'notes.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new window.Event('change'));
  await vi.waitFor(() => {
    expect(window.document.getElementById('toast')?.textContent).toMatch(/Imported/);
  });
}

describe('eNotes tags', () => {
  it('normalizes imported tags the same way as tags typed into the editor', async () => {
    const dom = openNotes([]);
    await importFile(dom, [{ id: 'n1', title: 'Imported', content: 'body', tags: [...UNSAFE_TAGS, 42, 'Work', 'work'] }]);

    const pills = listTagPills(dom);
    expect(pills.map((p) => p.dataset.tag)).toEqual(['xdata-injected1', 'window__xss1', 'imgsrcxidinjected-img', 'work']);

    pills.forEach((pill) => pill.click());
    expectNothingInjected(dom);
  });

  it('renders unsafe tags that were stored before the fix as plain text', () => {
    const dom = openNotes([
      {
        id: 'n1',
        title: 'Stored',
        content: 'body',
        tags: UNSAFE_TAGS,
        pinned: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const pills = listTagPills(dom);
    expect(pills.map((p) => p.dataset.tag)).toEqual(UNSAFE_TAGS);
    expect(pills.map((p) => p.textContent)).toEqual(UNSAFE_TAGS);
    expectNothingInjected(dom);

    pills[1].click();
    expectNothingInjected(dom);

    listTagPills(dom)[2].click();
    expectNothingInjected(dom);
    expect(dom.window.document.getElementById('noteCount')?.textContent).toContain(`tagged "${UNSAFE_TAGS[2]}"`);
  });
});
