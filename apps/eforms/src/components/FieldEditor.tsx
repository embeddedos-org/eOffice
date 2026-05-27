import type { FormField, FieldType } from '../hooks/useFormBuilder';

interface FieldEditorProps {
  field: FormField;
  fields: FormField[];
  onUpdate: (id: string, updates: Partial<FormField>) => void;
}

const FIELD_TYPES: FieldType[] = ['text', 'email', 'number', 'textarea', 'select', 'radio', 'checkbox', 'date', 'rating', 'file'];

export default function FieldEditor({ field, fields, onUpdate }: FieldEditorProps) {
  const hasOptions = field.type === 'select' || field.type === 'radio';
  const otherFields = fields.filter((f) => f.id !== field.id);

  return (
    <div className="field-editor">
      <div className="field-editor-title">Field Properties</div>

      <label>
        Type
        <select
          value={field.type}
          onChange={(e) => onUpdate(field.id, { type: e.target.value as FieldType })}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label>
        Label
        <input
          value={field.label}
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
        />
      </label>

      {field.type !== 'rating' && field.type !== 'file' && (
        <label>
          Placeholder
          <input
            value={field.placeholder}
            onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
          />
        </label>
      )}

      <label className="field-editor-check">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
        />
        Required
      </label>

      {hasOptions && (
        <label>
          Options (one per line)
          <textarea
            value={field.options.join('\n')}
            onChange={(e) =>
              onUpdate(field.id, {
                options: e.target.value.split('\n').filter(Boolean),
              })
            }
          />
        </label>
      )}

      {/* Conditional Logic */}
      <div className="field-editor-section">
        <div className="field-editor-section-title">Conditional Logic</div>
        <label className="field-editor-check">
          <input
            type="checkbox"
            checked={field.conditional?.enabled ?? false}
            onChange={(e) => onUpdate(field.id, {
              conditional: {
                enabled: e.target.checked,
                dependsOn: field.conditional?.dependsOn ?? '',
                operator: field.conditional?.operator ?? 'equals',
                value: field.conditional?.value ?? '',
              },
            })}
          />
          Show conditionally
        </label>

        {field.conditional?.enabled && (
          <>
            <label>
              Show when field:
              <select
                value={field.conditional.dependsOn}
                onChange={(e) => onUpdate(field.id, {
                  conditional: { ...field.conditional!, dependsOn: e.target.value },
                })}
              >
                <option value="">Select field...</option>
                {otherFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
            <label>
              Operator
              <select
                value={field.conditional.operator}
                onChange={(e) => onUpdate(field.id, {
                  conditional: { ...field.conditional!, operator: e.target.value as 'equals' | 'not_equals' | 'contains' },
                })}
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not equals</option>
                <option value="contains">Contains</option>
              </select>
            </label>
            <label>
              Value
              <input
                value={field.conditional.value}
                onChange={(e) => onUpdate(field.id, {
                  conditional: { ...field.conditional!, value: e.target.value },
                })}
                placeholder="Match value..."
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
