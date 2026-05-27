interface StatusBarProps {
  cellCount: number;
  sheetCount: number;
  connected: boolean;
  selectionStats: { sum: number; avg: number; count: number } | null;
  selectionRange: string;
}

export default function StatusBar({
  cellCount,
  sheetCount,
  connected,
  selectionStats,
  selectionRange,
}: StatusBarProps) {
  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item">
          Cells: {cellCount}
        </span>
        <span className="statusbar-item">
          Sheets: {sheetCount}
        </span>
        {selectionRange && (
          <span className="statusbar-item statusbar-range">
            {selectionRange}
          </span>
        )}
      </div>
      <div className="statusbar-right">
        {selectionStats && (
          <>
            <span className="statusbar-item statusbar-stat">
              Sum: {selectionStats.sum.toLocaleString()}
            </span>
            <span className="statusbar-item statusbar-stat">
              Avg: {selectionStats.avg.toLocaleString()}
            </span>
            <span className="statusbar-item statusbar-stat">
              Count: {selectionStats.count}
            </span>
          </>
        )}
        <span className={`statusbar-connection ${connected ? 'connected' : 'disconnected'}`}>
          <span className="statusbar-dot" />
          <span>eBot</span>
        </span>
      </div>
    </div>
  );
}
