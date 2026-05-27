import { useState } from 'react';
import TopBar from './components/TopBar';
import type { DBView } from './components/TopBar';
import TableList from './components/TableList';
import TableView from './components/TableView';
import QueryEditor from './components/QueryEditor';
import ERDView from './components/ERDView';
import FormEntry from './components/FormEntry';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import InputDialog, { ConfirmDialog } from '../../shared/InputDialog';
import { useDatabase } from './hooks/useDatabase';
import { useEBot } from './hooks/useEBot';
import { LoginScreen } from '../../shared/LoginScreen';

function EdbApp() {
  const [ebotOpen, setEbotOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DBView>('table');
  const [showFormEntry, setShowFormEntry] = useState(false);
  const [showNewTable, setShowNewTable] = useState(false);
  const [showImportAlert, setShowImportAlert] = useState(false);
  const db = useDatabase();
  const ebot = useEBot();

  const handleNewTable = () => {
    setShowNewTable(true);
  };

  const handleCreateTable = (name: string) => {
    db.createTable(name);
    setShowNewTable(false);
  };

  const handleImportCSV = (csv: string) => {
    if (!db.selectedTableId) {
      setShowImportAlert(true);
      return;
    }
    db.importCSV(db.selectedTableId, csv);
  };

  const handleFormInsert = (tableId: string, row: Record<string, string>) => {
    db.insertRow(tableId, row);
  };

  return (
    <div className="edb-app">
      <TopBar
        onNewTable={handleNewTable}
        ebotOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={ebot.connected}
        currentView={currentView}
        onViewChange={setCurrentView}
        onImportCSV={handleImportCSV}
      />
      <div className="edb-body">
        <TableList
          tables={db.tables}
          selectedTableId={db.selectedTableId}
          onSelect={db.setSelectedTableId}
          onCreate={handleNewTable}
          onDrop={db.dropTable}
        />
        <div className="edb-main">
          {currentView === 'erd' ? (
            <ERDView
              tables={db.tables}
              onSelectTable={(id) => { db.setSelectedTableId(id); setCurrentView('table'); }}
            />
          ) : currentView === 'form' ? (
            db.selectedTable ? (
              <div className="form-entry-inline">
                <FormEntry
                  table={db.selectedTable}
                  onInsertRow={handleFormInsert}
                  onClose={() => setCurrentView('table')}
                />
              </div>
            ) : (
              <div className="table-empty">
                <div className="table-empty-icon">📝</div>
                <div>Select a table to use form entry</div>
              </div>
            )
          ) : (
            <>
              <TableView
                table={db.selectedTable}
                onInsertRow={(id) => db.insertRow(id)}
                onUpdateRow={db.updateRow}
                onDeleteRow={db.deleteRow}
                onFormEntry={() => setShowFormEntry(true)}
              />
              <QueryEditor tables={db.tables} />
            </>
          )}
        </div>
        <EBotSidebar
          open={ebotOpen}
          connected={ebot.connected}
          loading={ebot.loading}
          onClose={() => setEbotOpen(false)}
          onGenerateQuery={ebot.generateQuery}
          onExplainQuery={ebot.explainQuery}
        />
      </div>
      {showFormEntry && db.selectedTable && (
        <FormEntry
          table={db.selectedTable}
          onInsertRow={handleFormInsert}
          onClose={() => setShowFormEntry(false)}
        />
      )}

      <InputDialog
        open={showNewTable}
        title="Create Table"
        label="Table Name"
        placeholder="e.g., users"
        onConfirm={handleCreateTable}
        onCancel={() => setShowNewTable(false)}
      />

      <ConfirmDialog
        open={showImportAlert}
        title="Import CSV"
        message="Select a table first to import CSV data into."
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setShowImportAlert(false)}
        onCancel={() => setShowImportAlert(false)}
      />

      <StatusBar
        tableCount={db.tables.length}
        rowCount={db.totalRows}
        connected={ebot.connected}
      />
    </div>
  );
}


export default function App() {
  return (
    <LoginScreen appName="eDB" appIcon="🗄️">
      <EdbApp />
    </LoginScreen>
  );
}
