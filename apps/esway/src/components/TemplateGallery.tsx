import type { SlideType } from '../hooks/useSway';

interface Template {
  name: string;
  description: string;
  icon: string;
  type: SlideType;
  question: string;
  options: string[];
  correctIdx?: number;
}

const TEMPLATES: Template[] = [
  {
    name: 'True/False Quiz',
    description: 'Simple true/false question',
    icon: '✅',
    type: 'quiz',
    question: 'Is this statement true or false?',
    options: ['True', 'False'],
    correctIdx: 0,
  },
  {
    name: 'Multiple Choice (4)',
    description: 'Standard 4-option quiz',
    icon: '🅰️',
    type: 'quiz',
    question: 'What is the correct answer?',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIdx: 0,
  },
  {
    name: 'Quick Poll',
    description: 'Get instant audience feedback',
    icon: '📊',
    type: 'poll',
    question: 'What do you think?',
    options: ['Agree', 'Disagree', 'Not sure'],
  },
  {
    name: 'Rating Poll',
    description: 'Rate on a scale',
    icon: '⭐',
    type: 'poll',
    question: 'How would you rate this?',
    options: ['Excellent', 'Good', 'Average', 'Poor'],
  },
  {
    name: 'Open Q&A',
    description: 'Collect audience questions',
    icon: '❓',
    type: 'qa',
    question: 'What questions do you have?',
    options: ['Type your question here'],
  },
  {
    name: 'This or That',
    description: 'Binary choice poll',
    icon: '🔄',
    type: 'poll',
    question: 'Which do you prefer?',
    options: ['Option A', 'Option B'],
  },
  {
    name: 'Ice Breaker',
    description: 'Fun team question',
    icon: '🧊',
    type: 'poll',
    question: 'If you could have any superpower, what would it be?',
    options: ['Flying', 'Invisibility', 'Time Travel', 'Teleportation'],
  },
  {
    name: 'Knowledge Check',
    description: 'Test understanding',
    icon: '🧠',
    type: 'quiz',
    question: 'Which of these is correct?',
    options: ['Answer 1', 'Answer 2', 'Answer 3'],
    correctIdx: 0,
  },
];

interface TemplateGalleryProps {
  onSelectTemplate: (type: SlideType, question: string, options: string[], correctIdx?: number) => void;
  onClose: () => void;
}

export default function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  return (
    <div className="template-overlay" onClick={onClose}>
      <div className="template-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="template-gallery-header">
          <h3>📚 Template Gallery</h3>
          <button className="template-close" onClick={onClose}>✕</button>
        </div>
        <div className="template-grid">
          {TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.name}
              className="template-card"
              onClick={() => {
                onSelectTemplate(tmpl.type, tmpl.question, tmpl.options, tmpl.correctIdx);
                onClose();
              }}
            >
              <div className="template-card-icon">{tmpl.icon}</div>
              <div className="template-card-name">{tmpl.name}</div>
              <div className="template-card-desc">{tmpl.description}</div>
              <span className={`template-type-badge ${tmpl.type}`}>{tmpl.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
