import { useState, useMemo } from 'react';
import type { TableDef } from '../hooks/useDatabase';

interface QueryEditorProps {
  tables: TableDef[];
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'AND', 'OR', 'NOT',
  'IN', 'IS', 'NULL', 'LIKE', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'AS', 'COUNT', 'SUM', 'AVG',
  'MAX', 'MIN', 'GROUP', 'HAVING', 'DISTINCT', 'BETWEEN', 'UNION', 'ALL',
];

function highlightSQL(sql: string): string {
  return sql.replace(/('[^']*')|(\b\d+\b)|(\b\w+\b)/g, (match, str, num, word) => {
    if (str) return `<span class="sql-string">${str}</span>`;
    if (num) return `<span class="sql-number">${num}</span>`;
    if (word && SQL_KEYWORDS.includes(word.toUpperCase())) {
      return `<span class="sql-keyword">${word}</span>`;
    }
    return match;
  });
}

export default function QueryEditor({ tables }: QueryEditorProps) {
  const [query, setQuery] = useState('SELECT * FROM users;');
  const [results, setResults] = useState('');
  const [isError, setIsError] = useState(false);

  const highlighted = useMemo(() => highlightSQL(query), [query]);

  const runQuery = () => {
    const q = query.trim().toUpperCase();
    setIsError(false);

    if (q.startsWith('SELECT')) {
      const match = query.match(/FROM\s+(\w+)/i);
      const tableName = match?.[1];
      const table = tables.find((t) => t.name === tableName);
      if (!table) {
        setIsError(true);
        setResults(`Error: Table "${tableName || '?'}" not found.`);
        return;
      }

      // Parse WHERE clause
      let filteredRows = table.rows;
      const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*'([^']*)'/i);
      if (whereMatch) {
        const [, col, val] = whereMatch;
        filteredRows = filteredRows.filter((r) => r[col] === val);
      }

      // Parse column selection
      const colMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
      let selectedCols = table.columns;
      if (colMatch && colMatch[1].trim() !== '*') {
        const colNames = colMatch[1].split(',').map((c) => c.trim());
        selectedCols = table.columns.filter((c) => colNames.includes(c.name));
        if (selectedCols.length === 0) selectedCols = table.columns;
      }

      const header = selectedCols.map((c) => c.name.padEnd(15)).join(' | ');
      const sep = selectedCols.map(() => '—'.repeat(15)).join('-+-');
      const rows = filteredRows.map((r) =>
        selectedCols.map((c) => (r[c.name] || '').padEnd(15)).join(' | ')
      ).join('\n');
      setResults(`${header}\n${sep}\n${rows}\n\n${filteredRows.length} row(s) returned.`);
    } else {
      setIsError(true);
      setResults('Only SELECT queries are supported in the demo query editor.');
    }
  };

  return (
    <div className="query-editor">
      <div className="query-editor-header">
        <span>📝 Query Editor</span>
        <button onClick={runQuery}>▶ Run</button>
      </div>
      <div className="query-input-wrapper">
        <div
          className="query-highlight-layer"
          dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
        />
        <textarea
          className="query-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter SQL query..."
          spellCheck={false}
        />
      </div>
      {results && (
        <div className={`query-results ${isError ? 'error' : ''}`}>{results}</div>
      )}
    </div>
  );
}
