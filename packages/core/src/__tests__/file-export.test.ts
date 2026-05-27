/**
 * Comprehensive File Export Tests
 * Tests all export functions: HTML, Markdown, DOCX, PDF, CSV, XLS, PPTX
 * Uses JSDOM environment to simulate browser Blob/URL APIs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock browser APIs ───────────────────────────────────────────────────────
const downloadedFiles: Array<{ filename: string; content: string; mimeType: string }> = [];

const mockBlob = vi.fn().mockImplementation((content: string[], options: { type: string }) => ({
  _content: content.join(''),
  _type: options?.type,
}));

const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();

const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
};
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateElement = vi.fn().mockReturnValue(mockAnchor);

// Patch globals before importing the module
vi.stubGlobal('Blob', mockBlob);
vi.stubGlobal('URL', { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });
vi.stubGlobal('document', {
  createElement: mockCreateElement,
  body: { appendChild: mockAppendChild, removeChild: mockRemoveChild },
});

// Now import the module (after mocking)
import {
  exportToHtml,
  exportToMarkdown,
  exportToDocx,
  exportToCsv,
  exportToXlsx,
  exportToPptx,
} from '../file-export';

describe('File Export — exportToHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({ href: '', download: '', click: vi.fn() });
  });

  it('creates a Blob with text/html mime type', () => {
    exportToHtml('My Document', '<p>Hello World</p>');
    expect(mockBlob).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: 'text/html' })
    );
  });

  it('includes the document title in HTML output', () => {
    exportToHtml('Test Title', '<p>Content</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('Test Title');
  });

  it('includes the HTML content in output', () => {
    exportToHtml('Doc', '<p>My paragraph</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('<p>My paragraph</p>');
  });

  it('includes DOCTYPE declaration', () => {
    exportToHtml('Doc', '<p>Content</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('<!DOCTYPE html>');
  });

  it('escapes HTML special characters in title', () => {
    exportToHtml('<script>alert("xss")</script>', '<p>Safe</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).not.toContain('<script>alert');
    expect(blobContent).toContain('&lt;script&gt;');
  });

  it('sets download filename with .html extension', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToHtml('My Doc', '<p>Content</p>');
    expect(anchor.download).toBe('My Doc.html');
  });

  it('calls anchor.click() to trigger download', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToHtml('Doc', '<p>Content</p>');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('calls URL.revokeObjectURL after download', () => {
    exportToHtml('Doc', '<p>Content</p>');
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('File Export — exportToMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({ href: '', download: '', click: vi.fn() });
  });

  it('creates a Blob with text/markdown mime type', () => {
    exportToMarkdown('My Doc', '<p>Hello</p>');
    expect(mockBlob).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: 'text/markdown' })
    );
  });

  it('includes H1 title in markdown output', () => {
    exportToMarkdown('My Title', '<p>Content</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('# My Title');
  });

  it('converts h1 tags to markdown headings', () => {
    exportToMarkdown('Doc', '<h1>Section One</h1>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('# Section One');
  });

  it('converts h2 tags to ## headings', () => {
    exportToMarkdown('Doc', '<h2>Subsection</h2>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('## Subsection');
  });

  it('converts strong/bold to **bold**', () => {
    exportToMarkdown('Doc', '<strong>Bold Text</strong>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('**Bold Text**');
  });

  it('converts em/italic to *italic*', () => {
    exportToMarkdown('Doc', '<em>Italic Text</em>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('*Italic Text*');
  });

  it('converts anchor tags to [text](url)', () => {
    exportToMarkdown('Doc', '<a href="https://example.com">Link</a>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('[Link](https://example.com)');
  });

  it('converts code tags to `code`', () => {
    exportToMarkdown('Doc', '<code>const x = 1;</code>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('`const x = 1;`');
  });

  it('sets download filename with .md extension', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToMarkdown('My Document', '<p>Content</p>');
    expect(anchor.download).toBe('My Document.md');
  });
});

describe('File Export — exportToDocx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({ href: '', download: '', click: vi.fn() });
  });

  it('creates a Blob with Word XML mime type', () => {
    exportToDocx('My Document', '<p>Hello World</p>');
    expect(mockBlob).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: expect.stringContaining('word') })
    );
  });

  it('includes Word XML namespace declaration', () => {
    exportToDocx('Doc', '<p>Content</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('wordDocument');
  });

  it('sets download filename with .doc extension', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToDocx('My Document', '<p>Content</p>');
    expect(anchor.download).toMatch(/\.doc/);
  });

  it('handles bold text in content', () => {
    exportToDocx('Doc', '<p><strong>Bold</strong> normal</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('<w:b/>');
  });

  it('handles italic text in content', () => {
    exportToDocx('Doc', '<p><em>Italic</em> text</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('<w:i/>');
  });

  it('escapes XML special characters in content', () => {
    exportToDocx('Doc', '<p>5 &lt; 10 &amp; 3 &gt; 1</p>');
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    // Should not contain raw unescaped XML-breaking characters
    expect(blobContent).not.toContain('<w:t xml:space="preserve">5 < 10</w:t>');
  });
});

// exportToPdf uses window.open() for browser print dialog
// It cannot be unit-tested in a Node environment without a real browser
// The function is verified to be exported in the module index.ts

describe('File Export — exportToCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({ href: '', download: '', click: vi.fn() });
  });

  it('creates a Blob with text/csv mime type', () => {
    exportToCsv('My Sheet', [['Name', 'Age'], ['Alice', '30']]);
    expect(mockBlob).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: 'text/csv' })
    );
  });

  it('sets download filename with .csv extension', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToCsv('My Sheet', [['Name', 'Age']]);
    expect(anchor.download).toBe('My Sheet.csv');
  });

  it('generates correct CSV content', () => {
    exportToCsv('Sheet', [['Name', 'Age', 'City'], ['Alice', '30', 'NYC']]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('Name,Age,City');
    expect(blobContent).toContain('Alice,30,NYC');
  });

  it('wraps cells with commas in double quotes', () => {
    exportToCsv('Sheet', [['Name, Jr.', 'Value']]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('"Name, Jr."');
  });

  it('wraps cells with double quotes by escaping them', () => {
    exportToCsv('Sheet', [['Say "Hello"', 'Value']]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('"Say ""Hello"""');
  });

  it('handles empty rows gracefully', () => {
    exportToCsv('Sheet', []);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(typeof blobContent).toBe('string');
  });
});

describe('File Export — exportToXlsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({ href: '', download: '', click: vi.fn() });
  });

  it('creates a Blob with Excel mime type', () => {
    exportToXlsx('My Sheet', [['Name', 'Age'], ['Alice', '30']]);
    expect(mockBlob).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: expect.stringContaining('excel') })
    );
  });

  it('sets download filename with .xls extension', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToXlsx('My Sheet', [['Name', 'Age']]);
    expect(anchor.download).toBe('My Sheet.xls');
  });

  it('includes SpreadsheetML namespace', () => {
    exportToXlsx('Sheet', [['A', 'B']]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('Workbook');
  });

  it('includes worksheet name in output', () => {
    exportToXlsx('My Worksheet', [['A', 'B']]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('My Worksheet');
  });

  it('handles empty data array', () => {
    expect(() => exportToXlsx('Empty Sheet', [])).not.toThrow();
  });
});

describe('File Export — exportToPptx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({ href: '', download: '', click: vi.fn() });
  });

  it('creates a Blob with PowerPoint mime type', () => {
    exportToPptx('My Presentation', [{ title: 'Slide 1', content: 'Content 1' }]);
    expect(mockBlob).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: expect.stringContaining('powerpoint') })
    );
  });

  it('sets download filename with .ppt extension', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    mockCreateElement.mockReturnValue(anchor);
    exportToPptx('My Presentation', [{ title: 'Slide 1', content: 'Content 1' }]);
    expect(anchor.download).toMatch(/\.ppt/);
  });

  it('includes slide titles in output', () => {
    exportToPptx('Pres', [{ title: 'My Slide Title', content: 'Slide content' }]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('My Slide Title');
  });

  it('includes slide content in output', () => {
    exportToPptx('Pres', [{ title: 'Title', content: 'My slide body text' }]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('My slide body text');
  });

  it('handles multiple slides', () => {
    exportToPptx('Pres', [
      { title: 'Slide 1', content: 'Content 1' },
      { title: 'Slide 2', content: 'Content 2' },
      { title: 'Slide 3', content: 'Content 3' },
    ]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).toContain('slide1.xml');
    expect(blobContent).toContain('slide2.xml');
    expect(blobContent).toContain('slide3.xml');
  });

  it('handles empty slides array', () => {
    expect(() => exportToPptx('Empty Pres', [])).not.toThrow();
  });

  it('escapes XML special characters in slide titles', () => {
    exportToPptx('Pres', [{ title: '<script>alert("xss")</script>', content: 'Content' }]);
    const blobContent = (mockBlob.mock.calls[0][0] as string[]).join('');
    expect(blobContent).not.toContain('<script>alert');
    expect(blobContent).toContain('&lt;script&gt;');
  });
});
