import { describe, it, expect } from 'vitest';
import { FormsModel } from '../forms-model';

describe('FormsModel', () => {
  it('should create a forms model', () => {
    const model = new FormsModel();
    expect(model).toBeDefined();
  });

  it('should create a form', () => {
    const model = new FormsModel();
    const form = model.createForm('Survey', [
      { id: '1', type: 'text', label: 'Name', required: true },
    ]);
    expect(form.title).toBe('Survey');
    expect(form.fields.length).toBe(1);
  });

  it('should submit a response', () => {
    const model = new FormsModel();
    const form = model.createForm('Survey', [
      { id: '1', type: 'text', label: 'Name', required: true },
    ]);
    model.submitResponse(form.id, { '1': 'Alice' });
    const responses = model.getResponses(form.id);
    expect(responses.length).toBe(1);
  });

  it('should list forms', () => {
    const model = new FormsModel();
    model.createForm('Form 1', []);
    model.createForm('Form 2', []);
    const forms = model.getForms();
    expect(forms.length).toBeGreaterThanOrEqual(2);
  });
});
