import React, { useState, useRef, useCallback } from 'react';
import { Slide, SlideElement, PresentationTheme } from '@pages/ImpressPage';
import { cn } from '@utils/cn';

interface Props {
  slide: Slide | undefined;
  selectedElementIds: string[];
  onElementSelect: (ids: string[]) => void;
  onElementUpdate: (elementId: string, updates: Partial<SlideElement>) => void;
  zoom: number;
  isPresenting: boolean;
  theme: PresentationTheme;
}

const SLIDE_WIDTH = 920;
const SLIDE_HEIGHT = 540;

export default function ImpressCanvas({ slide, selectedElementIds, onElementSelect, onElementUpdate, zoom, isPresenting, theme }: Props) {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ elementId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const scaleFactor = zoom / 100;

  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (!isPresenting) {
      onElementSelect([elementId]);
    }
  };

  const handleElementDoubleClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (!isPresenting) {
      setEditingElementId(elementId);
    }
  };

  const handleCanvasClick = () => {
    if (!isPresenting) {
      onElementSelect([]);
      setEditingElementId(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    if (isPresenting || editingElementId === element.id) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / scaleFactor;
    const dy = (e.clientY - dragging.startY) / scaleFactor;
    onElementUpdate(dragging.elementId, {
      x: Math.max(0, Math.min(SLIDE_WIDTH - 100, dragging.origX + dx)),
      y: Math.max(0, Math.min(SLIDE_HEIGHT - 50, dragging.origY + dy))
    });
  }, [dragging, scaleFactor, onElementUpdate]);

  const handleMouseUp = () => setDragging(null);

  if (!slide) {
    return (
      <div className="flex items-center justify-center text-surface-400 text-sm">
        No slide selected
      </div>
    );
  }

  const slideStyle: React.CSSProperties = {
    width: SLIDE_WIDTH * scaleFactor,
    height: SLIDE_HEIGHT * scaleFactor,
    backgroundColor: slide.background || theme.backgroundColor,
    backgroundImage: slide.backgroundType === 'gradient' ? slide.background : undefined,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0
  };

  if (slide.backgroundType === 'image' && slide.backgroundImage) {
    slideStyle.backgroundImage = `url(${slide.backgroundImage})`;
    slideStyle.backgroundSize = 'cover';
    slideStyle.backgroundPosition = 'center';
  }

  return (
    <div
      ref={canvasRef}
      style={slideStyle}
      className={cn('shadow-strong', !isPresenting && 'cursor-default')}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {slide.elements
        .filter(el => el.visible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(element => {
          const isSelected = selectedElementIds.includes(element.id);
          const isEditing = editingElementId === element.id;

          return (
            <div
              key={element.id}
              style={{
                position: 'absolute',
                left: element.x * scaleFactor,
                top: element.y * scaleFactor,
                width: element.width * scaleFactor,
                height: element.height * scaleFactor,
                transform: `rotate(${element.rotation}deg)`,
                cursor: isPresenting ? 'default' : (isEditing ? 'text' : 'move'),
                zIndex: element.zIndex,
                opacity: element.style.opacity ?? 1,
                userSelect: isEditing ? 'text' : 'none'
              }}
              className={cn(isSelected && !isPresenting && 'outline outline-2 outline-primary-500 outline-offset-1')}
              onClick={e => handleElementClick(e, element.id)}
              onDoubleClick={e => handleElementDoubleClick(e, element.id)}
              onMouseDown={e => handleMouseDown(e, element)}
            >
              {element.type === 'text' && (
                isEditing ? (
                  <textarea
                    autoFocus
                    value={element.content}
                    onChange={e => onElementUpdate(element.id, { content: e.target.value })}
                    onBlur={() => setEditingElementId(null)}
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      fontSize: (element.style.fontSize || 16) * scaleFactor,
                      fontFamily: element.style.fontFamily || theme.bodyFont,
                      fontWeight: element.style.fontWeight,
                      fontStyle: element.style.fontStyle,
                      color: element.style.color || theme.textColor,
                      textAlign: element.style.textAlign as any,
                      lineHeight: element.style.lineHeight,
                      padding: (element.style.padding || 0) * scaleFactor,
                      backgroundColor: element.style.backgroundColor || 'transparent'
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      fontSize: (element.style.fontSize || 16) * scaleFactor,
                      fontFamily: element.style.fontFamily || theme.bodyFont,
                      fontWeight: element.style.fontWeight,
                      fontStyle: element.style.fontStyle,
                      color: element.style.color || theme.textColor,
                      textAlign: element.style.textAlign as any,
                      lineHeight: element.style.lineHeight,
                      padding: (element.style.padding || 0) * scaleFactor,
                      backgroundColor: element.style.backgroundColor || 'transparent',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: element.style.textAlign === 'center' ? 'center' : element.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {element.content || <span style={{ opacity: 0.4 }}>Click to edit</span>}
                  </div>
                )
              )}

              {element.type === 'shape' && (
                <div style={{
                  width: '100%', height: '100%',
                  backgroundColor: element.style.backgroundColor || theme.primaryColor,
                  borderRadius: element.style.borderRadius,
                  border: element.style.borderWidth ? `${element.style.borderWidth}px solid ${element.style.borderColor}` : undefined,
                  boxShadow: element.style.shadow
                }} />
              )}

              {element.type === 'image' && (
                <img src={element.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: element.style.borderRadius }} />
              )}

              {/* Selection handles */}
              {isSelected && !isPresenting && (
                <>
                  {['nw', 'ne', 'sw', 'se'].map(corner => (
                    <div
                      key={corner}
                      className="absolute w-2.5 h-2.5 bg-white border-2 border-primary-500 rounded-sm"
                      style={{
                        top: corner.includes('n') ? -5 : undefined,
                        bottom: corner.includes('s') ? -5 : undefined,
                        left: corner.includes('w') ? -5 : undefined,
                        right: corner.includes('e') ? -5 : undefined,
                        cursor: `${corner}-resize`
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
