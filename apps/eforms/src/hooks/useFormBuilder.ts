import { useState, useCallback } from 'react';

export type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'rating' | 'file';

export interface ConditionalLogic {
  enabled: boolean;
  dependsOn: string;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  conditional?: ConditionalLogic;
}

export interface FormResponse {
  id: string;
  submittedAt: string;
  values: Record<string, string>;
}

let nextId = 1;
const uid = () => `field-${nextId++}`;
let respId = 1;
const respUid = () => `resp-${respId++}`;

const SAMPLE_FIELDS: FormField[] = [
  { id: uid(), type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true, options: [] },
  { id: uid(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true, options: [] },
  { id: uid(), type: 'select', label: 'Department', placeholder: 'Select department', required: false, options: ['Engineering', 'Design', 'Marketing', 'Sales'] },
  { id: uid(), type: 'rating', label: 'Overall Satisfaction', placeholder: '', required: false, options: [] },
];

const SAMPLE_RESPONSES: FormResponse[] = [
  { id: respUid(), submittedAt: '2026-04-20 09:15', values: { 'field-1': 'Alice Johnson', 'field-2': 'alice@example.com', 'field-3': 'Engineering', 'field-4': '5' } },
  { id: respUid(), submittedAt: '2026-04-20 10:30', values: { 'field-1': 'Bob Smith', 'field-2': 'bob@example.com', 'field-3': 'Design', 'field-4': '4' } },
  { id: respUid(), submittedAt: '2026-04-21 14:20', values: { 'field-1': 'Carol Davis', 'field-2': 'carol@example.com', 'field-3': 'Engineering', 'field-4': '3' } },
];

export function useFormBuilder() {
  const [fields, setFields] = useState<FormField[]>(SAMPLE_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [responses, setResponses] = useState<FormResponse[]>(SAMPLE_RESPONSES);

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  const addField = useCallback((type: FieldType = 'text') => {
    const field: FormField = {
      id: uid(),
      type,
      label: `New ${type} field`,
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : [],
    };
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
    return field;
  }, []);

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  }, []);

  const reorderFields = useCallback((fromIndex: number, toIndex: number) => {
    setFields((prev) => {
      const newFields = [...prev];
      const [moved] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, moved);
      return newFields;
    });
  }, []);

  const submitResponse = useCallback((values: Record<string, string>) => {
    const resp: FormResponse = {
      id: respUid(),
      submittedAt: new Date().toLocaleString(),
      values,
    };
    setResponses((prev) => [...prev, resp]);
  }, []);

  const exportResponsesCSV = useCallback(() => {
    if (responses.length === 0) return '';
    const headers = ['Submitted At', ...fields.map((f) => f.label)];
    const rows = responses.map((r) => [
      r.submittedAt,
      ...fields.map((f) => r.values[f.id] || ''),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    return csv;
  }, [responses, fields]);

  const shouldShowField = useCallback((field: FormField, currentValues: Record<string, string>) => {
    if (!field.conditional?.enabled) return true;
    const depValue = currentValues[field.conditional.dependsOn] || '';
    switch (field.conditional.operator) {
      case 'equals': return depValue === field.conditional.value;
      case 'not_equals': return depValue !== field.conditional.value;
      case 'contains': return depValue.includes(field.conditional.value);
      default: return true;
    }
  }, []);

  return {
    fields,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    previewMode,
    setPreviewMode,
    responses,
    addField,
    updateField,
    removeField,
    reorderFields,
    submitResponse,
    exportResponsesCSV,
    shouldShowField,
  };
}
