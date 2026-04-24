import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import SlideList from './components/SlideList';
import SlideCanvas from './components/SlideCanvas';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import PresenterView from './components/PresenterView';
import { usePresentation } from './hooks/usePresentation';
import { useEBot } from './hooks/useEBot';
import { exportToPptx } from '../../../packages/core/src/file-export';

export default function App() {
  const [title, setTitle] = useState('Untitled Presentation');
  const [ebotOpen, setEbotOpen] = useState(false);
  const [ebotResponse, setEbotResponse] = useState('');
  const [theme, setTheme] = useState('Default');
  const [presenting, setPresenting] = useState(false);

  const pres = usePresentation();
  const { connected, loading, suggestContent, generateTalkingPoints } = useEBot();

  const handlePresent = useCallback(() => {
    setPresenting(true);
  }, []);

  const handleExport = useCallback(() => {
    const slideData = pres.slides.map((s, i) => ({
      title: s.elements.find((e) => e.type === 'text')?.content || `Slide ${i + 1}`,
      content: s.elements
        .filter((e) => e.type === 'text')
        .map((e) => e.content)
        .join('\n'),
    }));
    exportToPptx(title, slideData);
  }, [title, pres.slides]);

  const handleDeleteElement = useCallback(() => {
    if (pres.selectedElementId) pres.removeElement(pres.selectedElementId);
  }, [pres]);

  const handleEBotAction = useCallback(
    async (action: string, input?: string) => {
      if (!connected) return;
      setEbotResponse('');
      try {
        let response = '';
        switch (action) {
          case 'generate-slides': {
            const [topic, count] = (input || '').split('|||');
            response = await suggestContent(topic, parseInt(count) || 5);
            response = `✨ **Generated Slides**\n\n${response}`;
            break;
          }
          case 'talking-points': {
            const content = pres.currentSlide.elements
              .map((el) => el.content)
              .join('\n');
            if (!content.trim()) {
              response = '⚠️ Add content to the current slide first.';
            } else {
              response = await generateTalkingPoints(content);
              response = `🎤 **Talking Points**\n\n${response}`;
            }
            break;
          }
          case 'improve-slide': {
            const slideContent = pres.currentSlide.elements
              .map((el) => el.content)
              .join('\n');
            if (!slideContent.trim()) {
              response = '⚠️ Add content to the current slide first.';
            } else {
              response = `💡 **Improvement Suggestions**\n\nConsider:\n- Adding a visual element\n- Making bullet points more concise\n- Adding a relevant statistic`;
            }
            break;
          }
          default:
            response = `eBot processed "${action}".`;
        }
        setEbotResponse(response);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setEbotResponse(`❌ **eBot Error**\n\n${msg}`);
      }
    },
    [connected, suggestContent, generateTalkingPoints, pres.currentSlide],
  );

  if (presenting) {
    return (
      <PresenterView
        slides={pres.slides}
        startIndex={pres.currentIndex}
        onExit={() => setPresenting(false)}
      />
    );
  }

  return (
    <div className="eslides-app">
      <TopBar
        title={title}
        onTitleChange={setTitle}
        ebotSidebarOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={connected}
        onPresent={handlePresent}
        onExport={handleExport}
      />
      <Toolbar
        onInsertText={() => pres.addElement('text', 'Click to edit')}
        onInsertShape={(shapeType) => pres.addElement('shape', '', { shapeType })}
        onInsertImage={(src) => pres.addElement('image', 'Image', { src })}
        onDeleteElement={handleDeleteElement}
        hasSelection={!!pres.selectedElementId}
        theme={theme}
        onThemeChange={setTheme}
        background={pres.currentSlide.background || '#ffffff'}
        onBackgroundChange={(bg) => pres.updateSlideProps({ background: bg })}
        transition={pres.currentSlide.transition || 'none'}
        onTransitionChange={(t) => pres.updateSlideProps({ transition: t })}
      />
      <div className="eslides-body">
        <SlideList
          slides={pres.slides}
          currentIndex={pres.currentIndex}
          onSelect={pres.setCurrentIndex}
          onAdd={pres.addSlide}
          onDuplicate={pres.duplicateSlide}
          onRemove={pres.removeSlide}
        />
        <SlideCanvas
          slide={pres.currentSlide}
          selectedElementId={pres.selectedElementId}
          onSelectElement={pres.setSelectedElementId}
          onUpdateElement={pres.updateElement}
          onAddElement={pres.addElement}
          onUpdateSlideProps={pres.updateSlideProps}
        />
        <EBotSidebar
          open={ebotOpen}
          connected={connected}
          response={ebotResponse}
          isLoading={loading}
          onAction={handleEBotAction}
          onClose={() => setEbotOpen(false)}
        />
      </div>
      <StatusBar
        slideCount={pres.slides.length}
        currentSlide={pres.currentIndex + 1}
        connected={connected}
      />
    </div>
  );
}
