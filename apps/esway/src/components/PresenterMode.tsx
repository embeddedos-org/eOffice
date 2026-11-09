import { useState, useEffect } from 'react';
import type { Slide } from '../hooks/useSway';

export default function PresenterMode({ slides, onExit }: { slides: Slide[]; onExit: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight' || e.key === ' ') setCurrentIndex((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setCurrentIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [slides.length, onExit]);

  const slide = slides[currentIndex];
  if (!slide) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1a1a2e', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ opacity: 0.6, fontSize: 14 }}>{currentIndex + 1} / {slides.length}</span>
        <button onClick={onExit} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
          padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
        }}>✕ Exit</button>
      </div>
      <div style={{ maxWidth: 900, width: '90%', textAlign: 'center', padding: 40 }}>
        <h1 style={{ fontSize: 48, marginBottom: 24, lineHeight: 1.2 }}>{slide.question || `Slide ${currentIndex + 1}`}</h1>
        {slide.options.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {slide.options.map((opt, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.08)', padding: '16px 24px',
                borderRadius: 8, fontSize: 24, textAlign: 'left',
              }}>
                {String.fromCharCode(65 + i)}. {opt.text}
              </div>
            ))}
          </div>
        )}
        {slide.mediaUrl && (
          <div style={{ marginTop: 32 }}>
            {slide.mediaType === 'image' ? (
              <img src={slide.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 }} />
            ) : (
              <video src={slide.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 }} />
            )}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 24, display: 'flex', gap: 16 }}>
        <button onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))} disabled={currentIndex === 0}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 16, opacity: currentIndex === 0 ? 0.3 : 1 }}>
          ← Previous
        </button>
        <button onClick={() => setCurrentIndex((i) => Math.min(i + 1, slides.length - 1))} disabled={currentIndex === slides.length - 1}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 16, opacity: currentIndex === slides.length - 1 ? 0.3 : 1 }}>
          Next →
        </button>
      </div>
    </div>
  );
}
