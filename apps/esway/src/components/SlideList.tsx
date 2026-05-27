import type { Slide } from '../hooks/useSway';

interface SlideListProps {
  slides: Slide[];
  currentSlideId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export default function SlideList({ slides, currentSlideId, onSelect, onAdd, onRemove }: SlideListProps) {
  return (
    <div className="slide-list">
      <div className="slide-list-header">
        <span>Slides</span>
        <button className="slide-list-add" onClick={onAdd} title="Add slide">+</button>
      </div>
      <div className="slide-list-items">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`slide-item ${slide.id === currentSlideId ? 'active' : ''}`}
            onClick={() => onSelect(slide.id)}
          >
            <div className="slide-item-number">{i + 1}</div>
            <div className="slide-item-info">
              <div className="slide-item-title">{slide.question}</div>
              {slide.mediaUrl && <div className="slide-item-media">🖼️ Media</div>}
            </div>
            <span className={`slide-type-badge ${slide.type}`}>{slide.type}</span>
            <button
              className="slide-item-delete"
              onClick={(e) => { e.stopPropagation(); onRemove(slide.id); }}
              title="Remove slide"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
