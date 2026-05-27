import React from 'react';
import { Slide, SlideElement } from '@pages/ImpressPage';
import { X, Palette, Layout, Layers, Type, Move } from 'lucide-react';

interface Props {
  slide: Slide | undefined;
  selectedElementIds: string[];
  onSlideUpdate: (updates: Partial<Slide>) => void;
  onElementUpdate: (elementId: string, updates: Partial<SlideElement>) => void;
  onClose: () => void;
}

const BACKGROUND_COLORS = ['#ffffff', '#f8fafc', '#0f172a', '#1e293b', '#1a56db', '#7c3aed', '#059669', '#dc2626', '#f97316', '#eab308'];
const TRANSITIONS = ['none', 'fade', 'slide', 'zoom', 'flip', 'cube', 'push'];

export default function ImpressProperties({ slide, selectedElementIds, onSlideUpdate, onElementUpdate, onClose }: Props) {
  if (!slide) return null;

  const selectedElement = slide.elements.find(el => selectedElementIds.includes(el.id));

  return (
    <div className="w-64 flex-shrink-0 bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-700 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">
          {selectedElement ? 'Element Properties' : 'Slide Properties'}
        </span>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>

      <div className="p-4 space-y-5">
        {selectedElement ? (
          /* Element properties */
          <>
            <div>
              <p className="label">Position</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-surface-400">X</label>
                  <input type="number" value={Math.round(selectedElement.x)} onChange={e => onElementUpdate(selectedElement.id, { x: Number(e.target.value) })} className="input text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-surface-400">Y</label>
                  <input type="number" value={Math.round(selectedElement.y)} onChange={e => onElementUpdate(selectedElement.id, { y: Number(e.target.value) })} className="input text-xs mt-0.5" />
                </div>
              </div>
            </div>
            <div>
              <p className="label">Size</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-surface-400">Width</label>
                  <input type="number" value={Math.round(selectedElement.width)} onChange={e => onElementUpdate(selectedElement.id, { width: Number(e.target.value) })} className="input text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-surface-400">Height</label>
                  <input type="number" value={Math.round(selectedElement.height)} onChange={e => onElementUpdate(selectedElement.id, { height: Number(e.target.value) })} className="input text-xs mt-0.5" />
                </div>
              </div>
            </div>
            <div>
              <label className="label">Rotation</label>
              <input type="range" min={-180} max={180} value={selectedElement.rotation} onChange={e => onElementUpdate(selectedElement.id, { rotation: Number(e.target.value) })} className="w-full" />
              <span className="text-xs text-surface-400">{selectedElement.rotation}°</span>
            </div>
            {selectedElement.type === 'text' && (
              <>
                <div>
                  <label className="label">Font Size</label>
                  <input type="number" value={selectedElement.style.fontSize || 16} onChange={e => onElementUpdate(selectedElement.id, { style: { ...selectedElement.style, fontSize: Number(e.target.value) } })} className="input text-xs" />
                </div>
                <div>
                  <label className="label">Text Color</label>
                  <input type="color" value={selectedElement.style.color || '#000000'} onChange={e => onElementUpdate(selectedElement.id, { style: { ...selectedElement.style, color: e.target.value } })} className="w-full h-8 rounded border border-surface-200 cursor-pointer" />
                </div>
                <div>
                  <label className="label">Background</label>
                  <input type="color" value={selectedElement.style.backgroundColor || '#ffffff'} onChange={e => onElementUpdate(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: e.target.value } })} className="w-full h-8 rounded border border-surface-200 cursor-pointer" />
                </div>
              </>
            )}
            <div>
              <label className="label">Opacity</label>
              <input type="range" min={0} max={1} step={0.05} value={selectedElement.style.opacity ?? 1} onChange={e => onElementUpdate(selectedElement.id, { style: { ...selectedElement.style, opacity: Number(e.target.value) } })} className="w-full" />
              <span className="text-xs text-surface-400">{Math.round((selectedElement.style.opacity ?? 1) * 100)}%</span>
            </div>
          </>
        ) : (
          /* Slide properties */
          <>
            <div>
              <p className="label">Background Color</p>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {BACKGROUND_COLORS.map(color => (
                  <button key={color} onClick={() => onSlideUpdate({ background: color, backgroundType: 'color' })} className="w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform" style={{ backgroundColor: color, borderColor: slide.background === color ? '#1a56db' : 'transparent' }} />
                ))}
              </div>
              <input type="color" value={slide.background} onChange={e => onSlideUpdate({ background: e.target.value, backgroundType: 'color' })} className="w-full h-8 rounded border border-surface-200 cursor-pointer" />
            </div>

            <div>
              <label className="label">Transition</label>
              <select value={slide.transition.type} onChange={e => onSlideUpdate({ transition: { ...slide.transition, type: e.target.value as any } })} className="input text-xs">
                {TRANSITIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Transition Duration</label>
              <input type="range" min={100} max={2000} step={100} value={slide.transition.duration} onChange={e => onSlideUpdate({ transition: { ...slide.transition, duration: Number(e.target.value) } })} className="w-full" />
              <span className="text-xs text-surface-400">{slide.transition.duration}ms</span>
            </div>

            <div>
              <label className="label">Auto-advance (seconds)</label>
              <input type="number" min={0} max={60} value={slide.duration} onChange={e => onSlideUpdate({ duration: Number(e.target.value) })} className="input text-xs" />
              <p className="text-xs text-surface-400 mt-1">0 = manual advance</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
