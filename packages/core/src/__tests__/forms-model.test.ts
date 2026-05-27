import { describe, it, expect } from 'vitest';
import { FormsModel } from '../forms-model';

describe('FormsModel', () => {
  it('should create a forms model', () => {
    const model = new FormsModel();
    expect(model).toBeDefined();
  });

  it('should create a form', () => {
    const model = new FormsModel();
    const form = model.addForm('Survey', 'A test survey');
    model.addField(form.id, { type: 'text', label: 'Name', required: true });
    expect(form.title).toBe('Survey');
    const updated = model.forms.find((f) => f.id === form.id);
    expect(updated!.fields.length).toBe(1);
  });

  it('should submit a response', () => {
    const model = new FormsModel();
    const form = model.addForm('Survey', 'A test survey');
    model.addField(form.id, { type: 'text', label: 'Name', required: true });
    model.submitForm(form.id, { Name: 'Alice' });
    const responses = model.getSubmissions(form.id);
    expect(responses.length).toBe(1);
  });

  it('should list forms', () => {
    const model = new FormsModel();
    model.addForm('Form 1', 'First form');
    model.addForm('Form 2', 'Second form');
    expect(model.forms.length).toBeGreaterThanOrEqual(2);
  });
});
