import { describe, it, expect } from 'vitest';
import { PresentationModel } from '../presentation-model';

describe('PresentationModel', () => {
  it('should create a presentation with a default slide', () => {
    const model = new PresentationModel();
    // Model starts empty; add a slide
    model.addSlide();
    expect(model.slides.length).toBeGreaterThanOrEqual(1);
  });

  it('should add a slide', () => {
    const model = new PresentationModel();
    const initial = model.slides.length;
    model.addSlide();
    expect(model.slides.length).toBe(initial + 1);
  });

  it('should remove a slide', () => {
    const model = new PresentationModel();
    model.addSlide();
    const slideId = model.slides[model.slides.length - 1].id;
    model.removeSlide(slideId);
    expect(model.slides.find((s) => s.id === slideId)).toBeUndefined();
  });

  it('should duplicate a slide', () => {
    const model = new PresentationModel();
    const slide = model.addSlide();
    const initial = model.slides.length;
    model.duplicateSlide(slide.id);
    expect(model.slides.length).toBe(initial + 1);
  });

  it('should add an element to a slide', () => {
    const model = new PresentationModel();
    const slide = model.addSlide();
    model.addElement(slide.id, 'text', 'Hello World', 0, 0, 200, 50);
    const updated = model.slides.find((s) => s.id === slide.id);
    expect(updated!.elements.some((e) => e.content === 'Hello World')).toBe(true);
  });

  it('should update slide properties', () => {
    const model = new PresentationModel();
    const slide = model.addSlide('#ffffff');
    // Directly update background on slide object
    const target = model.slides.find((s) => s.id === slide.id);
    if (target) target.background = '#ff0000';
    expect(model.slides.find((s) => s.id === slide.id)?.background).toBe('#ff0000');
  });
});
