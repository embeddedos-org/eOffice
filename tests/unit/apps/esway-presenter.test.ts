import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PresenterMode from '../../../apps/esway/src/components/PresenterMode';
import type { Slide } from '../../../apps/esway/src/hooks/useSway';

// Text-node separators differ between React versions, so drop them.
const present = (slides: Slide[]) =>
  renderToStaticMarkup(createElement(PresenterMode, { slides, onExit: () => {} })).replace(/<!-- -->/g, '');

describe('eSway presenter mode', () => {
  it('shows a quiz slide question and its option text', () => {
    const html = present([
      {
        id: 'q1', type: 'quiz', question: 'What does HTML stand for?',
        options: [
          { text: 'Hyper Text Markup Language', votes: 15, correct: true },
          { text: 'High Tech Modern Language', votes: 3 },
        ],
        timeLimit: 30,
      },
    ]);
    expect(html).toContain('What does HTML stand for?');
    expect(html).toContain('A. Hyper Text Markup Language');
    expect(html).toContain('B. High Tech Modern Language');
    expect(html).not.toContain('Slide 1');
  });

  it('shows poll and Q&A options', () => {
    const poll = present([
      { id: 'p1', type: 'poll', question: 'Preferred editor?', options: [{ text: 'VS Code', votes: 0 }] },
    ]);
    expect(poll).toContain('Preferred editor?');
    expect(poll).toContain('VS Code');

    const qa = present([
      { id: 'a1', type: 'qa', question: 'Any questions?', options: [{ text: 'How does auth work?', votes: 5 }] },
    ]);
    expect(qa).toContain('Any questions?');
    expect(qa).toContain('How does auth work?');
  });

  it('shows the media attached to a slide', () => {
    const html = present([
      {
        id: 'm1', type: 'poll', question: 'Which chart?', options: [],
        mediaUrl: 'https://example.com/chart.png', mediaType: 'image',
      },
    ]);
    expect(html).toContain('<img src="https://example.com/chart.png"');
  });
});
