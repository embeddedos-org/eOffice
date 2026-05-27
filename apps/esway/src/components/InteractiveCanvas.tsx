import { useState } from 'react';
import type { Slide } from '../hooks/useSway';

interface InteractiveCanvasProps {
  slide: Slide | null;
  onVote: (slideId: string, optionIdx: number) => void;
  timer: number;
  timerRunning: boolean;
  onStartTimer: () => void;
  score: { correct: number; total: number; answers: Record<string, number> };
}

export default function InteractiveCanvas({ slide, onVote, timer, timerRunning, onStartTimer, score }: InteractiveCanvasProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  if (!slide) {
    return (
      <div className="canvas">
        <div className="canvas-empty">
          <div className="canvas-empty-icon">🎯</div>
          <div>Select a slide or create a new one</div>
        </div>
      </div>
    );
  }

  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const answered = score.answers[slide.id] !== undefined;

  const handleVote = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    onVote(slide.id, idx);
  };

  return (
    <div className="canvas">
      <div className="canvas-card">
        <div className="canvas-card-top">
          <span className={`canvas-type ${slide.type}`}>{slide.type}</span>
          {slide.type === 'quiz' && slide.timeLimit && (
            <div className="canvas-timer-section">
              {timerRunning ? (
                <span className={`canvas-timer ${timer <= 5 ? 'urgent' : ''}`}>
                  ⏱️ {timer}s
                </span>
              ) : !answered ? (
                <button className="canvas-timer-btn" onClick={onStartTimer}>
                  ⏱️ Start Timer ({slide.timeLimit}s)
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Media embed */}
        {slide.mediaUrl && (
          <div className="canvas-media">
            {slide.mediaType === 'video' ? (
              <div className="canvas-media-placeholder">
                🎬 Video: {slide.mediaUrl}
              </div>
            ) : (
              <div className="canvas-media-placeholder">
                🖼️ Image: {slide.mediaUrl}
              </div>
            )}
          </div>
        )}

        <div className="canvas-question">{slide.question}</div>

        <div className="canvas-options">
          {slide.options.map((opt, i) => {
            let optionClass = 'canvas-option';
            if (answered) {
              if (slide.type === 'quiz') {
                if (opt.correct) optionClass += ' correct';
                else if (score.answers[slide.id] === i) optionClass += ' incorrect';
              } else if (selectedOption === i) {
                optionClass += ' selected';
              }
            }
            return (
              <div
                key={i}
                className={optionClass}
                onClick={() => handleVote(i)}
                style={{ cursor: answered ? 'default' : 'pointer' }}
              >
                <span className="canvas-option-label">{labels[i]}</span>
                {opt.text}
                {answered && slide.type === 'quiz' && opt.correct && (
                  <span className="canvas-correct-mark">✓</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Quiz score display */}
        {slide.type === 'quiz' && score.total > 0 && (
          <div className="canvas-score">
            Score: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
          </div>
        )}
      </div>
    </div>
  );
}
