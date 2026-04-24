import React, { useState, useRef, useCallback } from 'react';
import type { Slide, SlideElement } from '../hooks/usePresentation';

interface SlideCanvasProps {
  slide: Slide;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<SlideElement>) => void;
  onAddElement: (type: 'text' | 'shape' | 'image', content: string, extra?: Partial<SlideElement>) => void;
  onUpdateSlideProps: (updates: Partial<Pick<Slide, 'background' | 'transition' | 'notes'>>) => void;
}

export default function SlideCanvas({
  slide,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onAddElement,
  onUpdateSlideProps,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onSelectElement(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onAddElement('text', 'Click to edit');
    }
  };

  // ── Drag-and-Drop ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, el: SlideElement) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectElement(el.id);
      setDragState({
        id: el.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
      });
    },
    [onSelectElement],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragState.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragState.startY) / rect.height) * 100;
      onUpdateElement(dragState.id, {
        x: Math.max(0, Math.min(90, dragState.origX + dx)),
        y: Math.max(0, Math.min(90, dragState.origY + dy)),
      });
    },
    [dragState, onUpdateElement],
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // ── Shape rendering ──
  const renderShape = (el: SlideElement) => {
    const fill = el.color || '#ea580c';
    switch (el.shapeType) {
      case 'circle':
        return (
          <div
            className="slide-element-shape"
            style={{ background: fill, borderRadius: '50%', width: '100%', height: '100%' }}
          />
        );
      case 'arrow':
        return (
          <svg viewBox="0 0 100 60" className="slide-element-shape" style={{ width: '100%', height: '100%' }}>
            <polygon points="0,20 70,20 70,0 100,30 70,60 70,40 0,40" fill={fill} />
          </svg>
        );
      default: // rectangle
        return (
          <div
            className="slide-element-shape"
            style={{ background: fill, borderRadius: '4px', width: '100%', height: '100%' }}
          />
        );
    }
  };

  // ── Background style ──
  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.includes('gradient')) {
      bgStyle.background = slide.background;
    } else {
      bgStyle.backgroundColor = slide.background;
    }
  }

  return (
    <div className="canvas-area">
      <div
        ref={canvasRef}
        className="slide-canvas"
        style={bgStyle}
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {slide.elements.length === 0 ? (
          <div className="canvas-placeholder">
            <div className="canvas-placeholder-icon">📽️</div>
            <div className="canvas-placeholder-text">Double-click to add text</div>
          </div>
        ) : (
          slide.elements.map((el) => (
            <div
              key={el.id}
              className={`slide-element ${el.id === selectedElementId ? 'selected' : ''} ${dragState?.id === el.id ? 'dragging' : ''}`}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(el.id);
              }}
              onMouseDown={(e) => handleMouseDown(e, el)}
            >
              {el.type === 'text' ? (
                <div
                  className="slide-element-text"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateElement(el.id, { content: e.currentTarget.textContent || '' })
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ fontSize: '14px' }}
                >
                  {el.content}
                </div>
              ) : el.type === 'image' ? (
                <img
                  src={el.src}
                  alt={el.content || 'Slide image'}
                  className="slide-element-image"
                  draggable={false}
                />
              ) : (
                renderShape(el)
              )}
              {el.id === selectedElementId && (
                <div className="element-drag-handle" title="Drag to move" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Speaker Notes */}
      <div className="speaker-notes-area">
        <label className="speaker-notes-label">Speaker Notes</label>
        <textarea
          className="speaker-notes-input"
          placeholder="Add speaker notes for this slide…"
          value={slide.notes || ''}
          onChange={(e) => onUpdateSlideProps({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
