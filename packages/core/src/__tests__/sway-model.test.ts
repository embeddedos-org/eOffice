import { describe, it, expect } from 'vitest';
import { SwayModel } from '../sway-model';

describe('SwayModel', () => {
  it('should create a sway model', () => {
    const model = new SwayModel();
    expect(model).toBeDefined();
  });

  it('should create a presentation', () => {
    const model = new SwayModel();
    const pres = model.createPresentation('Interactive Demo');
    expect(pres.title).toBe('Interactive Demo');
  });

  it('should add a slide', () => {
    const model = new SwayModel();
    const pres = model.createPresentation('Demo');
    model.addSlide(pres.id, { type: 'content', content: 'Hello' });
    const updated = model.getPresentation(pres.id);
    expect(updated?.slides.length).toBeGreaterThan(0);
  });
});
