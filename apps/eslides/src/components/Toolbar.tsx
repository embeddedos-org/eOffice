import React, { useRef } from 'react';
import type { TransitionType } from '../hooks/usePresentation';

interface ToolbarProps {
  onInsertText: () => void;
  onInsertShape: (shapeType: 'rectangle' | 'circle' | 'arrow') => void;
  onInsertImage: (src: string) => void;
  onDeleteElement: () => void;
  hasSelection: boolean;
  theme: string;
  onThemeChange: (theme: string) => void;
  background: string;
  onBackgroundChange: (bg: string) => void;
  transition: TransitionType;
  onTransitionChange: (t: TransitionType) => void;
}

const THEMES = ['Default', 'Dark', 'Ocean', 'Sunset', 'Forest'];

const BACKGROUNDS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Light Gray', value: '#f3f4f6' },
  { label: 'Dark', value: '#1e293b' },
  { label: 'Blue Gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: 'Sunset Gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { label: 'Ocean Gradient', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
];

const TRANSITIONS: { label: string; value: TransitionType }[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade', value: 'fade' },
  { label: 'Slide', value: 'slide' },
  { label: 'Zoom', value: 'zoom' },
];

export default function Toolbar({
  onInsertText,
  onInsertShape,
  onInsertImage,
  onDeleteElement,
  hasSelection,
  theme,
  onThemeChange,
  background,
  onBackgroundChange,
  transition,
  onTransitionChange,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onInsertImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onInsertText} title="Insert Text">
          T Text
        </button>
        <div className="toolbar-dropdown-wrap">
          <button className="toolbar-btn" title="Insert Shape">
            ■ Shape ▾
          </button>
          <div className="toolbar-dropdown">
            <button onClick={() => onInsertShape('rectangle')}>▬ Rectangle</button>
            <button onClick={() => onInsertShape('circle')}>● Circle</button>
            <button onClick={() => onInsertShape('arrow')}>→ Arrow</button>
          </div>
        </div>
        <button className="toolbar-btn" onClick={handleImageClick} title="Insert Image">
          🖼 Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onDeleteElement}
          disabled={!hasSelection}
          title="Delete Element"
        >
          🗑 Delete
        </button>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <select
          className="toolbar-select"
          value={background}
          onChange={(e) => onBackgroundChange(e.target.value)}
          title="Slide Background"
        >
          {BACKGROUNDS.map((bg) => (
            <option key={bg.value} value={bg.value}>
              {bg.label}
            </option>
          ))}
        </select>
        <select
          className="toolbar-select"
          value={transition}
          onChange={(e) => onTransitionChange(e.target.value as TransitionType)}
          title="Slide Transition"
        >
          {TRANSITIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <select
          className="toolbar-select"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>{t} Theme</option>
          ))}
        </select>
      </div>
    </div>
  );
}
