import { useState } from 'react';
import type { FormEvent } from 'react';
import type { FormField } from '../hooks/useFormBuilder';

interface FormPreviewProps {
  title: string;
  fields: FormField[];
  shouldShowField: (field: FormField, values: Record<string, string>) => boolean;
  onSubmit: (values: Record<string, string>) => void;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= value ? 'filled' : ''}`}
          onClick={() => onChange(star)}
        >
          ★
        </span>
      ))}
      <span className="star-rating-label">{value > 0 ? `${value}/5` : ''}</span>
    </div>
  );
}

export default function FormPreview({ title, fields, shouldShowField, onSubmit }: FormPreviewProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setValues({});
  };

  return (
    <div className="form-preview-container">
      <form className="form-preview" onSubmit={handleSubmit}>
        <div className="form-preview-title">{title || 'Untitled Form'}</div>
        <div className="form-preview-desc">Fill out the form below.</div>

        {submitted && (
          <div className="form-submitted-banner">
            ✅ Response submitted successfully!
          </div>
        )}

        {fields.map((field) => {
          if (!shouldShowField(field, values)) return null;

          return (
            <div key={field.id} className="form-preview-field">
              <div className="form-preview-label">
                <span>{field.label}</span>
                {field.required && <span className="required">*</span>}
              </div>

              {field.type === 'textarea' ? (
                <textarea
                  className="form-preview-input form-preview-textarea"
                  placeholder={field.placeholder}
                  required={field.required}
                  value={values[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  className="form-preview-input"
                  required={field.required}
                  value={values[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                >
                  <option value="">{field.placeholder || 'Select...'}</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'radio' ? (
                <div className="form-preview-radio">
                  {field.options.map((opt) => (
                    <label key={opt} className="form-preview-option">
                      <input
                        type="radio"
                        name={field.id}
                        value={opt}
                        required={field.required}
                        checked={values[field.id] === opt}
                        onChange={() => handleChange(field.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="form-preview-option">
                  <input
                    type="checkbox"
                    required={field.required}
                    checked={values[field.id] === 'true'}
                    onChange={(e) => handleChange(field.id, e.target.checked ? 'true' : 'false')}
                  />
                  {field.placeholder || field.label}
                </label>
              ) : field.type === 'rating' ? (
                <StarRating
                  value={parseInt(values[field.id] || '0')}
                  onChange={(v) => handleChange(field.id, String(v))}
                />
              ) : field.type === 'file' ? (
                <div className="form-preview-file-upload">
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleChange(field.id, f.name);
                    }}
                  />
                  {values[field.id] && (
                    <div className="form-preview-file-name">📎 {values[field.id]}</div>
                  )}
                </div>
              ) : (
                <input
                  className="form-preview-input"
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={values[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}
            </div>
          );
        })}

        <button type="submit" className="form-preview-submit">Submit</button>
      </form>
    </div>
  );
}
