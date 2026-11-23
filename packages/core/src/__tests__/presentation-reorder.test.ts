import { describe, it, expect } from 'vitest';
import { PresentationModel } from '../presentation-model';

function threeSlides() {
  const model = new PresentationModel();
  const a = model.addSlide('#a');
  const b = model.addSlide('#b');
  const c = model.addSlide('#c');
  return { model, a, b, c };
}

describe('PresentationModel.reorderSlides', () => {
  it('reorders when every slide id is given once', () => {
    const { model, a, b, c } = threeSlides();
    expect(model.reorderSlides([c.id, a.id, b.id])).toBe(true);
    expect(model.slides.map((s) => s.id)).toEqual([c.id, a.id, b.id]);
  });

  it('rejects a list that repeats an id and leaves the slides unchanged', () => {
    const { model, a, b, c } = threeSlides();
    expect(model.reorderSlides([a.id, a.id, c.id])).toBe(false);
    expect(model.slides.map((s) => s.id)).toEqual([a.id, b.id, c.id]);
    expect(model.getSlideCount()).toBe(3);
  });

  it('never drops a slide or holds the same slide twice', () => {
    const { model, a, b } = threeSlides();
    model.reorderSlides([b.id, b.id, b.id]);
    const ids = model.slides.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(a.id);
  });

  it('still rejects an unknown id or a wrong length', () => {
    const { model, a, b, c } = threeSlides();
    expect(model.reorderSlides([a.id, b.id, 'missing'])).toBe(false);
    expect(model.reorderSlides([a.id, b.id])).toBe(false);
    expect(model.reorderSlides([a.id, b.id, c.id, a.id])).toBe(false);
    expect(model.slides.map((s) => s.id)).toEqual([a.id, b.id, c.id]);
  });
});
