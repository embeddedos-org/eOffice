/**
 * eOffice File Export Utilities
 * Client-side export to .docx, .xlsx, .pptx, .pdf, .html, .csv, .md
 * Uses the browser's Blob API — no server dependency
 */

// ─── HTML/Markdown Export (eDocs) ───

export function exportToHtml(title: string, htmlContent: string): void {
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}h1,h2,h3{margin-top:1.5em}</style>
</head><body><h1>${escHtml(title)}</h1>${htmlContent}</body></html>`;
  download(`${title}.html`, fullHtml, 'text/html');
}

export function exportToMarkdown(title: string, htmlContent: string): void {
  const md = htmlToMarkdown(htmlContent);
  download(`${title}.md`, `# ${title}\n\n${md}`, 'text/markdown');
}

export function exportToDocx(title: string, htmlContent: string): void {
  // DOCX is a ZIP of XML files. We create a minimal valid .docx
  // Using the simpler approach: HTML inside a Word-compatible XML wrapper
  const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml"
  xmlns:wx="http://schemas.microsoft.com/office/word/2003/auxHint"
  xmlns:o="urn:schemas-microsoft-com:office:office">
<w:body>
<wx:sect>
<w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${escXml(title)}</w:t></w:r></w:p>
${htmlToWordXml(htmlContent)}
</wx:sect>
</w:body>
</w:wordDocument>`;
  download(`${title}.doc`, wordXml, 'application/msword');
}

export function exportToPdf(title: string, htmlContent: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${escHtml(title)}</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>${escHtml(title)}</h1>${htmlContent}</body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ─── CSV/XLSX Export (eSheets) ───

export function exportToCsv(title: string, data: string[][]): void {
  const csv = data.map((row) => row.map((cell) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }).join(',')).join('\n');
  download(`${title}.csv`, csv, 'text/csv');
}

export function exportToXlsx(title: string, data: string[][]): void {
  // Minimal XLSX: XML Spreadsheet 2003 format (widely supported)
  const rows = data.map((row) =>
    `<Row>${row.map((cell) => {
      const isNum = cell !== '' && !isNaN(Number(cell));
      return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escXml(cell)}</Data></Cell>`;
    }).join('')}</Row>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="${escXml(title)}">
<Table>${rows}</Table>
</Worksheet>
</Workbook>`;
  download(`${title}.xls`, xml, 'application/vnd.ms-excel');
}

// ─── PPTX Export (eSlides) ───

export function exportToPptx(title: string, slides: Array<{ title: string; content: string }>): void {
  // PowerPoint XML format
  const slideXml = slides.map((slide, i) => `
<pkg:part pkg:name="/ppt/slides/slide${i + 1}.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml">
<pkg:xmlData>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<p:cSld>
<p:spTree>
<p:sp><p:txBody><a:p><a:r><a:rPr lang="en-US" sz="2800" b="1"/><a:t>${escXml(slide.title)}</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:txBody><a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${escXml(slide.content)}</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree>
</p:cSld>
</p:sld>
</pkg:xmlData>
</pkg:part>`).join('\n');

  const pptXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="PowerPoint.Show"?>
<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
${slideXml}
</pkg:package>`;
  download(`${title}.ppt`, pptXml, 'application/vnd.ms-powerpoint');
}

// ─── Helpers ───

function download(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__')
    .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img\s+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img\s+src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlToWordXml(html: string): string {
  const paragraphs: string[] = [];

  // Process paragraph by paragraph
  const blocks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .split(/\n+/)
    .filter((l) => l.trim());

  for (const block of blocks) {
    let text = block;
    const runs: string[] = [];

    // Extract inline formatting
    text = text.replace(/<[^>]+>/g, (tag) => {
      if (/<b\b|<strong\b/i.test(tag)) return '{{B_START}}';
      if (/<\/b>|<\/strong>/i.test(tag)) return '{{B_END}}';
      if (/<i\b|<em\b/i.test(tag)) return '{{I_START}}';
      if (/<\/i>|<\/em>/i.test(tag)) return '{{I_END}}';
      if (/<li\b/i.test(tag)) return '• ';
      return '';
    });

    // Simple run generation
    const parts = text.split(/({{[A-Z_]+}})/);
    let bold = false;
    let italic = false;

    for (const part of parts) {
      if (part === '{{B_START}}') { bold = true; continue; }
      if (part === '{{B_END}}') { bold = false; continue; }
      if (part === '{{I_START}}') { italic = true; continue; }
      if (part === '{{I_END}}') { italic = false; continue; }
      if (!part.trim()) continue;

      let rPr = '';
      if (bold || italic) {
        rPr = '<w:rPr>';
        if (bold) rPr += '<w:b/>';
        if (italic) rPr += '<w:i/>';
        rPr += '</w:rPr>';
      }
      runs.push(`<w:r>${rPr}<w:t xml:space="preserve">${escXml(part)}</w:t></w:r>`);
    }

    if (runs.length > 0) {
      paragraphs.push(`<w:p>${runs.join('')}</w:p>`);
    }
  }

  return paragraphs.join('\n');
}
