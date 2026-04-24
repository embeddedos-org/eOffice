import { useState, useCallback, useRef, type ChangeEvent } from 'react';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import FormulaBar from './components/FormulaBar';
import SpreadsheetGrid from './components/SpreadsheetGrid';
import SheetTabs from './components/SheetTabs';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import Chart, { chartFromSelection } from './components/Chart';
import type { ChartType } from './components/Chart';
import { useSpreadsheet } from './hooks/useSpreadsheet';
import { useEBot } from './hooks/useEBot';
import type { CellFormat } from '@eoffice/core';

interface ChartInstance {
  id: string;
  type: ChartType;
  title: string;
  labels: string[];
  datasets: Array<{ label: string; data: number[]; color: string }>;
  x: number;
  y: number;
}

export default function App() {
  const [title, setTitle] = useState('Untitled Spreadsheet');
  const [ebotSidebarOpen, setEbotSidebarOpen] = useState(false);
  const [ebotResponse, setEbotResponse] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chart state
  const [charts, setCharts] = useState<ChartInstance[]>([]);
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [chartDialogType, setChartDialogType] = useState<ChartType>('bar');
  const [chartDialogTitle, setChartDialogTitle] = useState('Chart');
  const dragChart = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const spreadsheet = useSpreadsheet();
  const { connected: ebotConnected, loading: ebotLoading, suggestFormula, explainFormula, analyzeData } = useEBot();

  const handleFormatChange = useCallback(
    (format: Partial<CellFormat>) => {
      if (!spreadsheet.activeCell) return;
      const currentFormat = spreadsheet.activeCellFormat;
      spreadsheet.setCellFormat(
        spreadsheet.activeCell.row,
        spreadsheet.activeCell.col,
        { ...currentFormat, ...format },
      );
    },
    [spreadsheet],
  );

  const handleFormulaSubmit = useCallback(() => {
    if (!spreadsheet.activeCell) return;
    spreadsheet.setCell(
      spreadsheet.activeCell.row,
      spreadsheet.activeCell.col,
      spreadsheet.editValue,
    );
  }, [spreadsheet]);

  const handleExportCSV = useCallback(() => {
    const csv = spreadsheet.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'spreadsheet'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [spreadsheet, title]);

  const handleImportCSV = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const csv = ev.target?.result as string;
        if (csv) {
          spreadsheet.importCSV(csv);
          setTitle(file.name.replace(/\.csv$/i, ''));
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [spreadsheet],
  );

  const handleNewSheet = useCallback(() => {
    spreadsheet.newSpreadsheet();
    setTitle('Untitled Spreadsheet');
    setCharts([]);
  }, [spreadsheet]);

  const handleAddSheet = useCallback(() => {
    const name = `Sheet ${spreadsheet.sheets.length + 1}`;
    spreadsheet.addSheet(name);
  }, [spreadsheet]);

  // Chart insertion
  const handleInsertChart = useCallback(() => {
    if (!spreadsheet.selection) return;
    setShowChartDialog(true);
  }, [spreadsheet.selection]);

  const handleCreateChart = useCallback(() => {
    if (!spreadsheet.selection) return;
    const { startRow, startCol, endRow, endCol } = spreadsheet.selection;
    const data = spreadsheet.getCellsInRange(startRow, startCol, endRow, endCol);
    if (data.length === 0) return;

    const headers = data[0];
    const rows = data.slice(1);
    const chartData = chartFromSelection(chartDialogTitle, headers, rows, chartDialogType);

    const newChart: ChartInstance = {
      id: `chart-${Date.now()}`,
      ...chartData,
      x: 100,
      y: 80,
    };

    setCharts((prev) => [...prev, newChart]);
    setShowChartDialog(false);
    setChartDialogTitle('Chart');
  }, [spreadsheet, chartDialogType, chartDialogTitle]);

  const handleRemoveChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleChartDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const chart = charts.find((c) => c.id === id);
    if (!chart) return;
    dragChart.current = { id, offsetX: e.clientX - chart.x, offsetY: e.clientY - chart.y };

    const handleMove = (ev: MouseEvent) => {
      if (!dragChart.current) return;
      setCharts((prev) =>
        prev.map((c) =>
          c.id === dragChart.current!.id
            ? { ...c, x: ev.clientX - dragChart.current!.offsetX, y: ev.clientY - dragChart.current!.offsetY }
            : c,
        ),
      );
    };

    const handleUp = () => {
      dragChart.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [charts]);

  const handleEBotAction = useCallback(
    async (action: string, input?: string) => {
      if (!ebotConnected) return;
      setEbotResponse('');

      try {
        let response = '';

        switch (action) {
          case 'suggest-formula':
            if (input) {
              response = await suggestFormula(input);
              response = `💡 **Formula Suggestion**\n\n${response}`;
            }
            break;

          case 'explain-formula':
            if (input) {
              response = await explainFormula(input);
              response = `📖 **Formula Explanation**\n\n${response}`;
            }
            break;

          case 'analyze-data': {
            const csv = spreadsheet.exportCSV();
            if (!csv.trim()) {
              response = '⚠️ No data to analyze. Add some data to the spreadsheet first.';
            } else {
              response = await analyzeData(csv);
              response = `📊 **Data Analysis**\n\n${response}`;
            }
            break;
          }

          case 'summarize': {
            const csvData = spreadsheet.exportCSV();
            if (!csvData.trim()) {
              response = '⚠️ No data to summarize.';
            } else {
              response = await analyzeData(
                `Provide a brief summary of this spreadsheet data:\n\n${csvData}`,
              );
              response = `📋 **Data Summary**\n\n${response}`;
            }
            break;
          }

          default:
            response = `eBot processed "${action}".`;
        }

        setEbotResponse(response);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setEbotResponse(`❌ **eBot Error**\n\n${msg}`);
      }
    },
    [ebotConnected, suggestFormula, explainFormula, analyzeData, spreadsheet],
  );

  return (
    <div className="esheets-app">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <TopBar
        title={title}
        onTitleChange={setTitle}
        ebotSidebarOpen={ebotSidebarOpen}
        onToggleEBot={() => setEbotSidebarOpen((prev) => !prev)}
        connected={ebotConnected}
        onNewSheet={handleNewSheet}
        onExportCSV={handleExportCSV}
        onImportCSV={handleImportCSV}
      />
      <Toolbar
        cellFormat={spreadsheet.activeCellFormat}
        onFormatChange={handleFormatChange}
        onInsertChart={handleInsertChart}
        onMergeCells={spreadsheet.mergeCells}
        onUnmergeCells={spreadsheet.unmergeCells}
        onToggleFreezeRows={spreadsheet.toggleFreezeRows}
        onToggleFreezeCols={spreadsheet.toggleFreezeCols}
        frozenRows={spreadsheet.frozenRows}
        frozenCols={spreadsheet.frozenCols}
        hasSelection={!!spreadsheet.selection && (spreadsheet.selection.startRow !== spreadsheet.selection.endRow || spreadsheet.selection.startCol !== spreadsheet.selection.endCol)}
      />
      <FormulaBar
        cellAddress={spreadsheet.cellAddress}
        formulaValue={spreadsheet.editValue}
        onFormulaChange={spreadsheet.setEditValue}
        onFormulaSubmit={handleFormulaSubmit}
      />
      <div className="esheets-body">
        <SpreadsheetGrid
          activeCell={spreadsheet.activeCell}
          editingCell={spreadsheet.editingCell}
          editValue={spreadsheet.editValue}
          revision={spreadsheet.revision}
          selection={spreadsheet.selection}
          frozenRows={spreadsheet.frozenRows}
          frozenCols={spreadsheet.frozenCols}
          mergedCells={spreadsheet.mergedCells}
          getCell={spreadsheet.getCell}
          getCellAddress={spreadsheet.getCellAddress}
          onSelectCell={spreadsheet.selectCell}
          onSetSelection={spreadsheet.setSelection}
          onStartEditing={spreadsheet.startEditing}
          onEditValueChange={spreadsheet.setEditValue}
          onCommitEdit={spreadsheet.commitEdit}
          onCancelEdit={spreadsheet.cancelEdit}
          onCopy={spreadsheet.copySelection}
          onPaste={spreadsheet.pasteSelection}
        />

        {/* Floating charts */}
        {charts.map((chart) => (
          <div
            key={chart.id}
            className="chart-overlay"
            style={{ left: chart.x, top: chart.y }}
            onMouseDown={(e) => handleChartDragStart(chart.id, e)}
          >
            <Chart
              type={chart.type}
              title={chart.title}
              labels={chart.labels}
              datasets={chart.datasets}
              onClose={() => handleRemoveChart(chart.id)}
            />
          </div>
        ))}

        <EBotSidebar
          open={ebotSidebarOpen}
          connected={ebotConnected}
          response={ebotResponse}
          isLoading={ebotLoading}
          onAction={handleEBotAction}
          onClose={() => setEbotSidebarOpen(false)}
        />
      </div>

      {/* Chart insertion dialog */}
      {showChartDialog && (
        <div className="chart-dialog-overlay" onClick={() => setShowChartDialog(false)}>
          <div className="chart-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="chart-dialog-header">
              <span>Insert Chart</span>
              <button className="chart-dialog-close" onClick={() => setShowChartDialog(false)}>✕</button>
            </div>
            <div className="chart-dialog-body">
              <label className="chart-dialog-label">
                Chart Title
                <input
                  className="chart-dialog-input"
                  value={chartDialogTitle}
                  onChange={(e) => setChartDialogTitle(e.target.value)}
                  placeholder="Chart title"
                />
              </label>
              <label className="chart-dialog-label">
                Chart Type
                <div className="chart-type-selector">
                  {(['bar', 'line', 'area', 'pie'] as ChartType[]).map((t) => (
                    <button
                      key={t}
                      className={`chart-type-btn ${chartDialogType === t ? 'active' : ''}`}
                      onClick={() => setChartDialogType(t)}
                    >
                      {t === 'bar' && '📊'}
                      {t === 'line' && '📈'}
                      {t === 'area' && '📉'}
                      {t === 'pie' && '🥧'}
                      <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </label>
              <div className="chart-dialog-range">
                Data Range: {spreadsheet.selectionRange || 'Select cells first'}
              </div>
            </div>
            <div className="chart-dialog-footer">
              <button className="chart-dialog-cancel" onClick={() => setShowChartDialog(false)}>Cancel</button>
              <button
                className="chart-dialog-create"
                onClick={handleCreateChart}
                disabled={!spreadsheet.selection}
              >
                Create Chart
              </button>
            </div>
          </div>
        </div>
      )}

      <SheetTabs
        sheets={spreadsheet.sheets}
        activeSheetId={spreadsheet.activeSheetId}
        onSwitchSheet={spreadsheet.switchSheet}
        onAddSheet={handleAddSheet}
        onRemoveSheet={spreadsheet.removeSheet}
        onRenameSheet={spreadsheet.renameSheet}
      />
      <StatusBar
        cellCount={spreadsheet.model.getCellCount()}
        sheetCount={spreadsheet.model.getSheetCount()}
        connected={ebotConnected}
        selectionStats={spreadsheet.selectionStats}
        selectionRange={spreadsheet.selectionRange}
      />
    </div>
  );
}
