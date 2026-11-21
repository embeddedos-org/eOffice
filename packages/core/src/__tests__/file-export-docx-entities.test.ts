/**
 * exportToDocx gets the editor's innerHTML, where text is HTML-escaped
 * (&amp;, &lt;, &gt;, &nbsp;). Each character must reach the Word XML
 * escaped once, not as an escaped entity that Word then shows literally.
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

import { exportToDocx } from '../file-export';

function wordBody(html: string): string {
  exportToDocx('Doc', html);
  const xml = (mockBlob.mock.calls[0][0] as string[]).join('');
  // Only the content paragraphs, after the title paragraph.
  return xml.slice(xml.indexOf('</w:p>') + '</w:p>'.length);
}

const run = (text: string) => `<w:t xml:space="preserve">${text}</w:t>`;

describe('exportToDocx — HTML character references in the content', () => {
  beforeEach(() => {
    mockBlob.mockClear();
  });

  it('writes &lt; &amp; &gt; from the HTML as the characters <, & and >', () => {
    const body = wordBody('<p>5 &lt; 10 &amp; 3 &gt; 1</p>');
    expect(body).toContain(run('5 &lt; 10 &amp; 3 &gt; 1'));
    expect(body).not.toContain('&amp;lt;');
    expect(body).not.toContain('&amp;amp;');
  });

  it('writes &nbsp; as a non-breaking space, not the text "&nbsp;"', () => {
    const body = wordBody('<p>Tom&nbsp;&nbsp;Jerry</p>');
    expect(body).toContain(run('Tom  Jerry'));
    expect(body).not.toContain('nbsp');
  });

  it('decodes quotes and numeric references', () => {
    const body = wordBody('<p>&quot;Hi&quot; it&#39;s &#x20AC;5</p>');
    expect(body).toContain(run('&quot;Hi&quot; it&apos;s €5'));
  });

  it('keeps text that the user typed as "&lt;" as that text', () => {
    // A user typing "&lt;" gives innerHTML "&amp;lt;".
    const body = wordBody('<p>Type &amp;lt; for &lt;</p>');
    expect(body).toContain(run('Type &amp;lt; for &lt;'));
  });

  it('decodes inside bold runs too', () => {
    const body = wordBody('<p><b>R&amp;D</b> team</p>');
    expect(body).toContain(`<w:rPr><w:b/></w:rPr>${run('R&amp;D')}`);
  });

  it('leaves unknown references as text', () => {
    const body = wordBody('<p>&bogus; &constructor; &#0;</p>');
    expect(body).toContain(run('&amp;bogus; &amp;constructor; &amp;#0;'));
  });
});
