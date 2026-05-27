import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '@store/documentStore';
import ImpressToolbar from '@components/presentation/ImpressToolbar';
import ImpressSlidePanel from '@components/presentation/ImpressSlidePanel';
import ImpressCanvas from '@components/presentation/ImpressCanvas';
import ImpressProperties from '@components/presentation/ImpressProperties';
import AIPanel from '@components/ai/AIPanel';
import toast from 'react-hot-toast';

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart' | 'video' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  style: ElementStyle;
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface ElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  padding?: number;
  shadow?: string;
  gradient?: string;
}

export interface Slide {
  id: string;
  title: string;
  background: string;
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundImage?: string;
  elements: SlideElement[];
  notes: string;
  transition: SlideTransition;
  duration: number;
  hidden: boolean;
  thumbnail?: string;
  layout: string;
}

export interface SlideTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'flip' | 'cube' | 'push';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

export interface PresentationState {
  slides: Slide[];
  currentSlideIndex: number;
  selectedElementIds: string[];
  zoom: number;
  isPresenting: boolean;
  theme: PresentationTheme;
}

export interface PresentationTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
}

const DEFAULT_THEMES: PresentationTheme[] = [
  { name: 'Professional', primaryColor: '#1a56db', secondaryColor: '#1e40af', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', headingFont: 'Inter', bodyFont: 'Inter' },
  { name: 'Dark', primaryColor: '#8b5cf6', secondaryColor: '#7c3aed', accentColor: '#a78bfa', backgroundColor: '#0f172a', textColor: '#f1f5f9', headingFont: 'Inter', bodyFont: 'Inter' },
  { name: 'Minimal', primaryColor: '#374151', secondaryColor: '#6b7280', accentColor: '#9ca3af', backgroundColor: '#f9fafb', textColor: '#111827', headingFont: 'Georgia', bodyFont: 'Inter' },
  { name: 'Vibrant', primaryColor: '#ef4444', secondaryColor: '#dc2626', accentColor: '#f97316', backgroundColor: '#fff7ed', textColor: '#1c1917', headingFont: 'Inter', bodyFont: 'Inter' },
  { name: 'Nature', primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#34d399', backgroundColor: '#f0fdf4', textColor: '#14532d', headingFont: 'Georgia', bodyFont: 'Inter' },
];

const createDefaultSlide = (index: number): Slide => ({
  id: `slide_${Date.now()}_${index}`,
  title: index === 0 ? 'Title Slide' : `Slide ${index + 1}`,
  background: '#ffffff',
  backgroundType: 'color',
  elements: index === 0 ? [
    {
      id: `el_${Date.now()}_1`,
      type: 'text',
      x: 80, y: 200, width: 760, height: 120,
      rotation: 0,
      content: 'Click to add title',
      style: { fontSize: 48, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', fontFamily: 'Inter' },
      locked: false, visible: true, zIndex: 1
    },
    {
      id: `el_${Date.now()}_2`,
      type: 'text',
      x: 80, y: 340, width: 760, height: 60,
      rotation: 0,
      content: 'Click to add subtitle',
      style: { fontSize: 24, color: '#64748b', textAlign: 'center', fontFamily: 'Inter' },
      locked: false, visible: true, zIndex: 2
    }
  ] : [
    {
      id: `el_${Date.now()}_1`,
      type: 'text',
      x: 40, y: 40, width: 840, height: 80,
      rotation: 0,
      content: 'Slide Title',
      style: { fontSize: 36, fontWeight: 'bold', color: '#1e293b', textAlign: 'left', fontFamily: 'Inter' },
      locked: false, visible: true, zIndex: 1
    },
    {
      id: `el_${Date.now()}_2`,
      type: 'text',
      x: 40, y: 140, width: 840, height: 300,
      rotation: 0,
      content: 'Click to add content',
      style: { fontSize: 18, color: '#475569', textAlign: 'left', fontFamily: 'Inter', lineHeight: 1.6 },
      locked: false, visible: true, zIndex: 2
    }
  ],
  notes: '',
  transition: { type: 'fade', duration: 500, easing: 'ease-in-out' },
  duration: 5,
  hidden: false,
  layout: index === 0 ? 'title' : 'content'
});

export default function ImpressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { documents, currentDocument, createDocument, openDocument, saveDocument } = useDocumentStore();

  const [presentation, setPresentation] = useState<PresentationState>({
    slides: [createDefaultSlide(0), createDefaultSlide(1), createDefaultSlide(2)],
    currentSlideIndex: 0,
    selectedElementIds: [],
    zoom: 75,
    isPresenting: false,
    theme: DEFAULT_THEMES[0]
  });

  const [showAI, setShowAI] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (id) {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        openDocument(id);
        try {
          const parsed = JSON.parse(doc.content);
          if (parsed.slides) setPresentation(prev => ({ ...prev, slides: parsed.slides }));
        } catch {}
      } else {
        navigate('/impress');
      }
    } else {
      const newDoc = createDocument('impress');
      navigate(`/impress/${newDoc.id}`, { replace: true });
    }
  }, [id]);

  const currentSlide = presentation.slides[presentation.currentSlideIndex];

  const updateSlide = useCallback((slideId: string, updates: Partial<Slide>) => {
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === slideId ? { ...s, ...updates } : s)
    }));
    // Auto-save
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (currentDocument) {
        saveDocument(currentDocument.id, JSON.stringify({ slides: presentation.slides }));
      }
    }, 2000);
  }, [currentDocument, saveDocument, presentation.slides]);

  const updateElement = useCallback((slideId: string, elementId: string, updates: Partial<SlideElement>) => {
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id !== slideId ? s : {
        ...s,
        elements: s.elements.map(el => el.id !== elementId ? el : { ...el, ...updates })
      })
    }));
  }, []);

  const addSlide = useCallback((afterIndex?: number) => {
    const newSlide = createDefaultSlide(presentation.slides.length);
    setPresentation(prev => {
      const newSlides = [...prev.slides];
      const insertAt = afterIndex !== undefined ? afterIndex + 1 : prev.slides.length;
      newSlides.splice(insertAt, 0, newSlide);
      return { ...prev, slides: newSlides, currentSlideIndex: insertAt };
    });
  }, [presentation.slides.length]);

  const deleteSlide = useCallback((index: number) => {
    if (presentation.slides.length <= 1) return;
    setPresentation(prev => {
      const newSlides = prev.slides.filter((_, i) => i !== index);
      return { ...prev, slides: newSlides, currentSlideIndex: Math.min(prev.currentSlideIndex, newSlides.length - 1) };
    });
  }, [presentation.slides.length]);

  const duplicateSlide = useCallback((index: number) => {
    const slide = presentation.slides[index];
    const newSlide = { ...slide, id: `slide_${Date.now()}`, elements: slide.elements.map(el => ({ ...el, id: `el_${Date.now()}_${Math.random()}` })) };
    setPresentation(prev => {
      const newSlides = [...prev.slides];
      newSlides.splice(index + 1, 0, newSlide);
      return { ...prev, slides: newSlides, currentSlideIndex: index + 1 };
    });
  }, [presentation.slides]);

  const startPresentation = () => {
    setPresentation(prev => ({ ...prev, isPresenting: true, currentSlideIndex: 0 }));
  };

  const stopPresentation = () => {
    setPresentation(prev => ({ ...prev, isPresenting: false }));
  };

  // Presentation mode
  if (presentation.isPresenting) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => {
        if (presentation.currentSlideIndex < presentation.slides.length - 1) {
          setPresentation(prev => ({ ...prev, currentSlideIndex: prev.currentSlideIndex + 1 }));
        } else {
          stopPresentation();
        }
      }}>
        <div className="w-full h-full flex items-center justify-center">
          <ImpressCanvas
            slide={currentSlide}
            selectedElementIds={[]}
            onElementSelect={() => {}}
            onElementUpdate={() => {}}
            zoom={100}
            isPresenting={true}
            theme={presentation.theme}
          />
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-3 text-white/60 text-sm">
          <span>{presentation.currentSlideIndex + 1} / {presentation.slides.length}</span>
          <button onClick={(e) => { e.stopPropagation(); stopPresentation(); }} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs">
            Exit (Esc)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-100 dark:bg-surface-900">
      {/* Toolbar */}
      <ImpressToolbar
        presentation={presentation}
        currentSlide={currentSlide}
        onAddSlide={() => addSlide(presentation.currentSlideIndex)}
        onStartPresentation={startPresentation}
        onToggleAI={() => setShowAI(!showAI)}
        onToggleProperties={() => setShowProperties(!showProperties)}
        onToggleNotes={() => setShowNotes(!showNotes)}
        onThemeChange={(theme) => setPresentation(prev => ({ ...prev, theme }))}
        themes={DEFAULT_THEMES}
        zoom={presentation.zoom}
        onZoomChange={(zoom) => setPresentation(prev => ({ ...prev, zoom }))}
        document={currentDocument}
        onSave={() => {
          if (currentDocument) {
            saveDocument(currentDocument.id, JSON.stringify({ slides: presentation.slides }));
            toast.success('Saved!');
          }
        }}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slide panel */}
        <ImpressSlidePanel
          slides={presentation.slides}
          currentIndex={presentation.currentSlideIndex}
          theme={presentation.theme}
          onSlideSelect={(index) => setPresentation(prev => ({ ...prev, currentSlideIndex: index, selectedElementIds: [] }))}
          onAddSlide={addSlide}
          onDeleteSlide={deleteSlide}
          onDuplicateSlide={duplicateSlide}
          onMoveSlide={(from, to) => {
            setPresentation(prev => {
              const newSlides = [...prev.slides];
              const [removed] = newSlides.splice(from, 1);
              newSlides.splice(to, 0, removed);
              return { ...prev, slides: newSlides, currentSlideIndex: to };
            });
          }}
        />

        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto bg-surface-300 dark:bg-surface-700 p-6 flex items-start justify-center">
            <ImpressCanvas
              slide={currentSlide}
              selectedElementIds={presentation.selectedElementIds}
              onElementSelect={(ids) => setPresentation(prev => ({ ...prev, selectedElementIds: ids }))}
              onElementUpdate={(elementId, updates) => updateElement(currentSlide.id, elementId, updates)}
              zoom={presentation.zoom}
              isPresenting={false}
              theme={presentation.theme}
            />
          </div>

          {/* Notes panel */}
          {showNotes && (
            <div className="h-32 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3">
              <p className="text-xs font-medium text-surface-500 mb-1">Speaker Notes</p>
              <textarea
                value={currentSlide?.notes || ''}
                onChange={e => updateSlide(currentSlide.id, { notes: e.target.value })}
                placeholder="Add speaker notes for this slide..."
                className="w-full h-20 text-xs resize-none bg-transparent text-surface-700 dark:text-surface-300 placeholder-surface-400 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Properties panel */}
        {showProperties && (
          <ImpressProperties
            slide={currentSlide}
            selectedElementIds={presentation.selectedElementIds}
            onSlideUpdate={(updates) => updateSlide(currentSlide.id, updates)}
            onElementUpdate={(elementId, updates) => updateElement(currentSlide.id, elementId, updates)}
            onClose={() => setShowProperties(false)}
          />
        )}

        {/* AI Panel */}
        {showAI && (
          <AIPanel document={currentDocument} onClose={() => setShowAI(false)} />
        )}
      </div>
    </div>
  );
}
