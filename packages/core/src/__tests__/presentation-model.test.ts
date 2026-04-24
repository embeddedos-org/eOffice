import { describe, it, expect } from 'vitest';
import { PresentationModel } from '../presentation-model';

describe('PresentationModel', () => {
  it('should create a presentation with a default slide', () => {
    const model = new PresentationModel();
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
    const initial = model.slides.length;
    model.duplicateSlide(0);
    expect(model.slides.length).toBe(initial + 1);
  });

  it('should add an element to a slide', () => {
    const model = new PresentationModel();
    model.addElement('text', 'Hello World');
    const slide = model.slides[model.currentIndex];
    expect(slide.elements.some((e) => e.content === 'Hello World')).toBe(true);
  });

  it('should update slide properties', () => {
    const model = new PresentationModel();
    model.updateSlideProps({ background: '#ff0000' });
    expect(model.slides[model.currentIndex].background).toBe('#ff0000');
  });
});
