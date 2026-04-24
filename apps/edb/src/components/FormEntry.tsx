import { useState } from 'react';
import type { TableDef } from '../hooks/useDatabase';

interface FormEntryProps {
  table: TableDef;
  onInsertRow: (tableId: string, row: Record<string, string>) => void;
  onClose: () => void;
}

export default function FormEntry({ table, onInsertRow, onClose }: FormEntryProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    table.columns.forEach((c) => { init[c.name] = ''; });
    return init;
  });

  const handleSubmit = () => {
    onInsertRow(table.id, { ...values });
    // Reset form
    const reset: Record<string, string> = {};
    table.columns.forEach((c) => { reset[c.name] = ''; });
    setValues(reset);
  };

  const handleChange = (col: string, value: string) => {
    setValues((prev) => ({ ...prev, [col]: value }));
  };

  const getInputType = (colType: string) => {
    switch (colType.toUpperCase()) {
      case 'INT': case 'INTEGER': case 'FLOAT': case 'REAL': return 'number';
      case 'DATE': return 'date';
      case 'BOOLEAN': case 'BOOL': return 'checkbox';
      default: return 'text';
    }
  };

  return (
    <div className="form-entry-overlay" onClick={onClose}>
      <div className="form-entry" onClick={(e) => e.stopPropagation()}>
        <div className="form-entry-header">
          <h3>📝 Add Record — {table.name}</h3>
          <button className="form-entry-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-entry-fields">
          {table.columns.map((col) => (
            <label key={col.name} className="form-entry-label">
              <span className="form-entry-col-name">
                {col.name}
                <span className="form-entry-col-type">{col.type}</span>
              </span>
              <input
                type={getInputType(col.type)}
                value={values[col.name]}
                onChange={(e) => handleChange(col.name, e.target.value)}
                placeholder={`Enter ${col.name}...`}
              />
            </label>
          ))}
        </div>
        <div className="form-entry-actions">
          <button className="form-entry-btn" onClick={onClose}>Cancel</button>
          <button className="form-entry-btn primary" onClick={handleSubmit}>
            ➕ Insert Row
          </button>
        </div>
      </div>
    </div>
  );
}
