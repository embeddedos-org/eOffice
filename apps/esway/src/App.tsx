import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import SlideList from './components/SlideList';
import InteractiveCanvas from './components/InteractiveCanvas';
import ResponseView from './components/ResponseView';
import TemplateGallery from './components/TemplateGallery';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import PresenterMode from './components/PresenterMode';
import { useSway } from './hooks/useSway';
import { useEBot } from './hooks/useEBot';
import { LoginScreen } from '../../shared/LoginScreen';

function EswayApp() {
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


export default function App() {
  return (
    <LoginScreen appName="eSway" appIcon="🎯">
      <EswayApp />
    </LoginScreen>
  );
}
