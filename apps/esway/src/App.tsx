import { useState, useCallback, useEffect } from 'react';
import TopBar from './components/TopBar';
import SlideList from './components/SlideList';
import InteractiveCanvas from './components/InteractiveCanvas';
import ResponseView from './components/ResponseView';
import TemplateGallery from './components/TemplateGallery';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import { useSway } from './hooks/useSway';
import { useEBot } from './hooks/useEBot';

function PresenterMode({ slides, onExit }: { slides: ReturnType<typeof useSway>['slides']; onExit: () => void }) {
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
        <h1 style={{ fontSize: 48, marginBottom: 24, lineHeight: 1.2 }}>{slide.content || `Slide ${currentIndex + 1}`}</h1>
        {slide.type === 'poll' && slide.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {slide.options.map((opt: string, i: number) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.08)', padding: '16px 24px',
                borderRadius: 8, fontSize: 24, textAlign: 'left',
              }}>
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            ))}
          </div>
        )}
        {slide.type === 'quiz' && slide.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {slide.options.map((opt: string, i: number) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.08)', padding: '16px 24px',
                borderRadius: 8, fontSize: 24, textAlign: 'left',
              }}>
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            ))}
          </div>
        )}
        {slide.type === 'media' && slide.mediaUrl && (
          <div style={{ marginTop: 32 }}>
            {slide.mediaType === 'image' ? (
              <img src={slide.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 }} />
            ) : (
              <iframe src={slide.mediaUrl} title="media" style={{ width: '100%', height: '60vh', border: 'none', borderRadius: 8 }} />
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

export default function App() {
  const [ebotOpen, setEbotOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const sway = useSway();
  const ebot = useEBot();

  const handleAddSlide = () => {
    sway.addSlide('poll', 'New question?', ['Option A', 'Option B', 'Option C']);
  };

  const handlePresent = useCallback(() => {
    if (sway.slides.length === 0) return;
    setPresenting(true);
  }, [sway.slides.length]);

  if (presenting) {
    return <PresenterMode slides={sway.slides} onExit={() => setPresenting(false)} />;
  }

  return (
    <div className="esway-app">
      <TopBar
        onPresent={handlePresent}
        onAddSlide={handleAddSlide}
        onTemplates={() => setShowTemplates(true)}
        onPublish={sway.publishPresentation}
        ebotOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={ebot.connected}
      />
      <div className="esway-body">
        <SlideList
          slides={sway.slides}
          currentSlideId={sway.currentSlideId}
          onSelect={sway.setCurrentSlideId}
          onAdd={handleAddSlide}
          onRemove={sway.removeSlide}
        />
        <div className="esway-main">
          <InteractiveCanvas
            slide={sway.currentSlide}
            onVote={sway.submitResponse}
            timer={sway.timer}
            timerRunning={sway.timerRunning}
            onStartTimer={sway.startTimer}
            score={sway.score}
          />
          <ResponseView slide={sway.currentSlide} />
        </div>
        <EBotSidebar
          open={ebotOpen}
          connected={ebot.connected}
          loading={ebot.loading}
          onClose={() => setEbotOpen(false)}
          onGenerateQuiz={ebot.generateQuiz}
          onSuggestPoll={ebot.suggestPoll}
        />
      </div>

      {showTemplates && (
        <TemplateGallery
          onSelectTemplate={sway.addSlide}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {sway.shareLink && (
        <div className="share-banner">
          🔗 Published: <span className="share-link">{sway.shareLink}</span>
        </div>
      )}

      <StatusBar
        slideCount={sway.slides.length}
        totalResponses={sway.totalResponses}
        connected={ebot.connected}
      />
    </div>
  );
}
