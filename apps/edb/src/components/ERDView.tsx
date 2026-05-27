import type { TableDef } from '../hooks/useDatabase';

interface ERDViewProps {
  tables: TableDef[];
  onSelectTable: (id: string) => void;
}

interface Relationship {
  from: string;
  fromCol: string;
  to: string;
  toCol: string;
}

function detectRelationships(tables: TableDef[]): Relationship[] {
  const rels: Relationship[] = [];
  const tableNames = tables.map((t) => t.name.toLowerCase());

  for (const table of tables) {
    for (const col of table.columns) {
      const colLower = col.name.toLowerCase();
      if (colLower.endsWith('_id') && colLower !== 'id') {
        const refName = colLower.replace(/_id$/, '');
        const refIdx = tableNames.findIndex(
          (n) => n === refName || n === refName + 's'
        );
        if (refIdx !== -1) {
          rels.push({
            from: table.name,
            fromCol: col.name,
            to: tables[refIdx].name,
            toCol: 'id',
          });
        }
      }
    }
  }
  return rels;
}

export default function ERDView({ tables, onSelectTable }: ERDViewProps) {
  const relationships = detectRelationships(tables);

  if (tables.length === 0) {
    return (
      <div className="erd-view">
        <div className="erd-empty">
          <div style={{ fontSize: 48, opacity: 0.4 }}>🔗</div>
          <div>No tables to display</div>
        </div>
      </div>
    );
  }

  const cardWidth = 200;
  const cardGap = 60;
  const cols = Math.min(tables.length, 3);

  return (
    <div className="erd-view">
      <div className="erd-title">Entity Relationship Diagram</div>
      <div className="erd-canvas">
        <svg className="erd-lines" width="100%" height="100%">
          {relationships.map((rel, i) => {
            const fromIdx = tables.findIndex((t) => t.name === rel.from);
            const toIdx = tables.findIndex((t) => t.name === rel.to);
            if (fromIdx === -1 || toIdx === -1) return null;

            const fromCol = Math.floor(fromIdx % cols);
            const fromRow = Math.floor(fromIdx / cols);
            const toCol = Math.floor(toIdx % cols);
            const toRow = Math.floor(toIdx / cols);

            const x1 = fromCol * (cardWidth + cardGap) + cardWidth / 2;
            const y1 = fromRow * 180 + 80;
            const x2 = toCol * (cardWidth + cardGap) + cardWidth / 2;
            const y2 = toRow * 180 + 80;

            const midY = (y1 + y2) / 2;

            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  opacity={0.6}
                />
                <circle cx={x1} cy={y1} r={4} fill="var(--accent)" />
                <circle cx={x2} cy={y2} r={4} fill="var(--accent)" />
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 6}
                  fill="var(--text-secondary)"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {rel.fromCol} → {rel.toCol}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="erd-tables" style={{ gridTemplateColumns: `repeat(${cols}, ${cardWidth}px)`, gap: `40px ${cardGap}px` }}>
          {tables.map((table) => (
            <div
              key={table.id}
              className="erd-table-card"
              onClick={() => onSelectTable(table.id)}
            >
              <div className="erd-table-header">
                <span>🗃️</span>
                <span>{table.name}</span>
              </div>
              <div className="erd-table-cols">
                {table.columns.map((col) => (
                  <div key={col.name} className="erd-col">
                    <span className="erd-col-name">
                      {col.name === 'id' && '🔑 '}
                      {col.name.endsWith('_id') && col.name !== 'id' && '🔗 '}
                      {col.name}
                    </span>
                    <span className="erd-col-type">{col.type}</span>
                  </div>
                ))}
              </div>
              <div className="erd-table-footer">{table.rows.length} rows</div>
            </div>
          ))}
        </div>
      </div>
      {relationships.length > 0 && (
        <div className="erd-legend">
          <span>Relationships detected: </span>
          {relationships.map((r, i) => (
            <span key={i} className="erd-rel-badge">
              {r.from}.{r.fromCol} → {r.to}.{r.toCol}
              {i < relationships.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
