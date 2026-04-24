import type { FormField, FormResponse } from '../hooks/useFormBuilder';

interface ResponsesViewProps {
  fields: FormField[];
  responses: FormResponse[];
  onExportCSV: () => string;
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ResponsesView({ fields, responses, onExportCSV }: ResponsesViewProps) {
  const handleExport = () => {
    const csv = onExportCSV();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-responses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate charts for select/radio/rating fields
  const chartFields = fields.filter((f) =>
    f.type === 'select' || f.type === 'radio' || f.type === 'rating'
  );

  const getDistribution = (fieldId: string, field: FormField) => {
    const counts: Record<string, number> = {};
    if (field.type === 'rating') {
      for (let i = 1; i <= 5; i++) counts[`${i} ★`] = 0;
    } else {
      field.options.forEach((o) => { counts[o] = 0; });
    }
    responses.forEach((r) => {
      const val = r.values[fieldId];
      if (val) {
        const key = field.type === 'rating' ? `${val} ★` : val;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  };

  return (
    <div className="responses-view-container">
      <div className="responses-view">
        <div className="responses-header">
          <h3>📊 Responses ({responses.length})</h3>
          <button className="responses-export-btn" onClick={handleExport}>
            📥 Export CSV
          </button>
        </div>

        {responses.length === 0 ? (
          <div className="responses-empty">
            <div style={{ fontSize: 48, opacity: 0.4 }}>📊</div>
            <div>No responses yet</div>
          </div>
        ) : (
          <>
            {/* Charts Section */}
            {chartFields.length > 0 && (
              <div className="responses-charts">
                {chartFields.map((field) => {
                  const dist = getDistribution(field.id, field);
                  const maxCount = Math.max(...Object.values(dist), 1);
                  return (
                    <div key={field.id} className="responses-chart">
                      <div className="responses-chart-title">{field.label}</div>
                      {Object.entries(dist).map(([label, count], i) => (
                        <div key={label} className="responses-chart-bar">
                          <span className="responses-chart-label">{label}</span>
                          <div className="responses-chart-track">
                            <div
                              className="responses-chart-fill"
                              style={{
                                width: `${(count / maxCount) * 100}%`,
                                background: BAR_COLORS[i % BAR_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="responses-chart-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table Section */}
            <div className="responses-table-container">
              <table className="responses-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Submitted</th>
                    {fields.map((f) => (
                      <th key={f.id}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp, i) => (
                    <tr key={resp.id}>
                      <td>{i + 1}</td>
                      <td>{resp.submittedAt}</td>
                      {fields.map((f) => (
                        <td key={f.id}>
                          {f.type === 'rating'
                            ? '★'.repeat(parseInt(resp.values[f.id] || '0'))
                            : resp.values[f.id] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
