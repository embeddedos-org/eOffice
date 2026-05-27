import React, { useState } from 'react';
import { Slide, PresentationTheme } from '@pages/ImpressPage';
import { Plus, Copy, Trash2, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { cn } from '@utils/cn';

interface Props {
  slides: Slide[];
  currentIndex: number;
  theme: PresentationTheme;
  onSlideSelect: (index: number) => void;
  onAddSlide: (afterIndex: number) => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (from: number, to: number) => void;
}

export default function ImpressSlidePanel({ slides, currentIndex, theme, onSlideSelect, onAddSlide, onDeleteSlide, onDuplicateSlide, onMoveSlide }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  };

  return (
    <div className="w-48 flex-shrink-0 bg-surface-100 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 overflow-y-auto flex flex-col">
      <div className="p-2 space-y-1.5">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              'relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
              index === currentIndex
                ? 'border-primary-500 shadow-medium'
                : 'border-transparent hover:border-surface-300 dark:hover:border-surface-600'
            )}
            onClick={() => onSlideSelect(index)}
            onContextMenu={e => handleContextMenu(e, index)}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragIndex !== null && dragIndex !== index) { onMoveSlide(dragIndex, index); setDragIndex(null); } }}
          >
            {/* Slide thumbnail */}
            <div
              className="w-full aspect-video flex items-center justify-center text-xs overflow-hidden"
              style={{ backgroundColor: slide.background || theme.backgroundColor }}
            >
              {slide.elements.slice(0, 2).map(el => (
                <div
                  key={el.id}
                  className="absolute overflow-hidden"
                  style={{
                    left: `${(el.x / 920) * 100}%`,
                    top: `${(el.y / 540) * 100}%`,
                    width: `${(el.width / 920) * 100}%`,
                    fontSize: `${(el.style.fontSize || 16) * 0.15}px`,
                    color: el.style.color || theme.textColor,
                    fontWeight: el.style.fontWeight,
                    textAlign: el.style.textAlign as any
                  }}
                >
                  {el.content}
                </div>
              ))}
              {slide.elements.length === 0 && (
                <span className="text-surface-300 dark:text-surface-600 text-xs">Empty slide</span>
              )}
            </div>

            {/* Slide number */}
            <div className="absolute bottom-1 left-1 text-xs text-surface-400 bg-black/30 rounded px-1">{index + 1}</div>

            {/* Actions on hover */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
              <button onClick={e => { e.stopPropagation(); onDuplicateSlide(index); }} className="p-0.5 rounded bg-white/80 hover:bg-white text-surface-600 hover:text-surface-900" title="Duplicate">
                <Copy size={10} />
              </button>
              {slides.length > 1 && (
                <button onClick={e => { e.stopPropagation(); onDeleteSlide(index); }} className="p-0.5 rounded bg-white/80 hover:bg-red-100 text-surface-600 hover:text-red-600" title="Delete">
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add slide button */}
        <button
          onClick={() => onAddSlide(slides.length - 1)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg text-xs text-surface-400 hover:text-primary-600 hover:border-primary-400 dark:hover:border-primary-600 transition-colors"
        >
          <Plus size={13} /> Add Slide
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong overflow-hidden min-w-36" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => { onAddSlide(contextMenu.index); setContextMenu(null); }} className="menu-item w-full"><Plus size={13} />Add After</button>
            <button onClick={() => { onDuplicateSlide(contextMenu.index); setContextMenu(null); }} className="menu-item w-full"><Copy size={13} />Duplicate</button>
            {slides.length > 1 && <button onClick={() => { onDeleteSlide(contextMenu.index); setContextMenu(null); }} className="menu-item w-full text-red-600 hover:bg-red-50"><Trash2 size={13} />Delete</button>}
          </div>
        </>
      )}
    </div>
  );
}
