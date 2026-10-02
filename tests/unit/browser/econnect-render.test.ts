import { readFileSync } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const html = readFileSync(path.resolve(__dirname, '../../../browser/econnect.html'), 'utf8');

describe('eConnect rendering', () => {
  it('renders stored channel meta and message times as plain text', () => {
    const channel = {
      id: 'c1',
      title: 'General',
      meta: '<img src=x id=injected-meta>',
      msgs: [{ f: 'Alice', t: 'Hi', tm: '<img src=x id=injected-time>' }],
    };
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
      beforeParse(window) {
        window.localStorage.setItem('econnect_data', JSON.stringify([channel]));
      },
    });
    const { document } = dom.window;

    const item = document.querySelector<HTMLElement>('#il .it');
    expect(item?.querySelector('.it-m')?.textContent).toBe(channel.meta);
    expect(document.getElementById('injected-meta')).toBeNull();

    item?.click();
    expect(document.getElementById('det')?.textContent).toContain(channel.msgs[0].tm);
    expect(document.getElementById('injected-time')).toBeNull();
  });
});
