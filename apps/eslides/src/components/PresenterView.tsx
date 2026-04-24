import { useState, useEffect, useRef, useCallback } from 'react';
import type { Slide } from '../hooks/usePresentation';

interface PresenterViewProps {
  slides: Slide[];
  startIndex?: number;
  onExit: () => void;
}

export default function PresenterView({ slides, startIndex = 0, onExit }: PresenterViewProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());
  const prevIndex = useRef(startIndex);

  const slide = slides[currentIndex];
  const transitionClass = slide?.transition && slide.transition !== 'none'
    ? `presenter-transition-${slide.transition}`
    : '';

  // Fullscreen on mount
  useEffect(() => {
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Exit on fullscreen change
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onExit]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => {
      prevIndex.current = i;
      return Math.min(i + 1, slides.length - 1);
    });
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => {
      prevIndex.current = i;
      return Math.max(i - 1, 0);
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onExit]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!slide) return null;

  // Background style
  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.includes('gradient')) {
      bgStyle.background = slide.background;
    } else {
      bgStyle.backgroundColor = slide.background;
    }
  }

  const renderShape = (el: typeof slide.elements[0]) => {
    const fill = el.color || '#ea580c';
    switch (el.shapeType) {
      case 'circle':
        return <div style={{ background: fill, borderRadius: '50%', width: '100%', height: '100%' }} />;
      case 'arrow':
        return (
          <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
            <polygon points="0,20 70,20 70,0 100,30 70,60 70,40 0,40" fill={fill} />
          </svg>
        );
      default:
        return <div style={{ background: fill, borderRadius: '4px', width: '100%', height: '100%' }} />;
    }
  };

  return (
    <div ref={containerRef} className="presenter-view" onClick={goNext}>
      <div className={`presenter-slide ${transitionClass}`} key={currentIndex} style={bgStyle}>
        {slide.elements.map((el) => (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              height: `${el.height}%`,
            }}
          >
            {el.type === 'text' ? (
              <div style={{ fontSize: '2vw', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {el.content}
              </div>
            ) : el.type === 'image' ? (
              <img
                src={el.src}
                alt={el.content}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                draggable={false}
              />
            ) : (
              renderShape(el)
            )}
          </div>
        ))}
      </div>

      {/* Presenter controls bar */}
      <div className="presenter-controls" onClick={(e) => e.stopPropagation()}>
        <div className="presenter-controls-left">
          <button className="presenter-btn" onClick={goPrev} disabled={currentIndex === 0}>
            ◀
          </button>
          <span className="presenter-slide-indicator">
            {currentIndex + 1} / {slides.length}
          </span>
          <button className="presenter-btn" onClick={goNext} disabled={currentIndex === slides.length - 1}>
            ▶
          </button>
        </div>
        <div className="presenter-controls-center">
          {slide.notes && (
            <div className="presenter-notes">
              <strong>Notes:</strong> {slide.notes}
            </div>
          )}
        </div>
        <div className="presenter-controls-right">
          <span className="presenter-timer">⏱ {formatTime(elapsed)}</span>
          <button className="presenter-btn presenter-btn-end" onClick={onExit}>
            End Presentation
          </button>
        </div>
      </div>
    </div>
  );
}
