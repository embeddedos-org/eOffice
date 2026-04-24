import { useState, useCallback, useRef, useEffect } from 'react';

export type SlideType = 'quiz' | 'poll' | 'qa';
export interface SlideOption { text: string; votes: number; correct?: boolean; }
export interface Slide {
  id: string;
  type: SlideType;
  question: string;
  options: SlideOption[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timeLimit?: number;
}

let nextId = 1;
const uid = () => `s${nextId++}`;

const SEED: Slide[] = [
  {
    id: uid(), type: 'quiz', question: 'What does HTML stand for?',
    options: [
      { text: 'Hyper Text Markup Language', votes: 15, correct: true },
      { text: 'High Tech Modern Language', votes: 3 },
      { text: 'Hyper Transfer Markup Language', votes: 2 },
      { text: 'Home Tool Markup Language', votes: 1 },
    ],
    timeLimit: 30,
  },
  {
    id: uid(), type: 'poll', question: 'What is your preferred code editor?',
    options: [
      { text: 'VS Code', votes: 24 },
      { text: 'IntelliJ', votes: 8 },
      { text: 'Vim/Neovim', votes: 6 },
      { text: 'Other', votes: 3 },
    ],
  },
  {
    id: uid(), type: 'qa', question: 'Any questions about the new API?',
    options: [
      { text: 'How does auth work?', votes: 5 },
      { text: 'What about rate limits?', votes: 3 },
    ],
  },
];

export interface QuizScore {
  correct: number;
  total: number;
  answers: Record<string, number>;
}

export function useSway() {
  const [slides, setSlides] = useState<Slide[]>(SEED);
  const [currentSlideId, setCurrentSlideId] = useState<string>(SEED[0].id);
  const [score, setScore] = useState<QuizScore>({ correct: 0, total: 0, answers: {} });
  const [timer, setTimer] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSlide = slides.find((s) => s.id === currentSlideId) ?? null;
  const totalResponses = slides.reduce((sum: number, s: Slide) => sum + s.options.reduce((os: number, o: SlideOption) => os + o.votes, 0), 0);

  // Timer effect
  useEffect(() => {
    if (timerRunning && currentSlide?.timeLimit) {
      setTimer(currentSlide.timeLimit);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, currentSlideId]);

  const addSlide = useCallback((type: SlideType, question: string, options: string[], correctIdx?: number) => {
    const id = uid();
    setSlides((prev: Slide[]) => [...prev, {
      id, type, question,
      options: options.map((text: string, i: number) => ({
        text, votes: 0,
        ...(type === 'quiz' && correctIdx !== undefined ? { correct: i === correctIdx } : {}),
      })),
      timeLimit: type === 'quiz' ? 30 : undefined,
    }]);
    setCurrentSlideId(id);
  }, []);

  const removeSlide = useCallback((id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
    setCurrentSlideId((prev) => {
      if (prev === id) {
        const remaining = slides.filter((s) => s.id !== id);
        return remaining[0]?.id ?? '';
      }
      return prev;
    });
  }, [slides]);

  const updateSlide = useCallback((id: string, updates: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const submitResponse = useCallback((slideId: string, optionIdx: number) => {
    const slide = slides.find((s) => s.id === slideId);
    if (!slide) return;

    setSlides((prev: Slide[]) => prev.map((s: Slide) => {
      if (s.id !== slideId) return s;
      const options = s.options.map((o: SlideOption, i: number) => (i === optionIdx ? { ...o, votes: o.votes + 1 } : o));
      return { ...s, options };
    }));

    // Track quiz scoring
    if (slide.type === 'quiz') {
      const isCorrect = slide.options[optionIdx]?.correct === true;
      setScore((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        answers: { ...prev.answers, [slideId]: optionIdx },
      }));
    }

    // Stop timer after answering
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [slides]);

  const startTimer = useCallback(() => {
    setTimerRunning(true);
  }, []);

  const publishPresentation = useCallback(() => {
    const link = `https://esway.eoffice.dev/present/${Date.now().toString(36)}`;
    setShareLink(link);
    return link;
  }, []);

  return {
    slides, currentSlideId, currentSlide, totalResponses, score, timer, timerRunning, shareLink,
    setCurrentSlideId, addSlide, removeSlide, updateSlide, submitResponse,
    startTimer, publishPresentation,
  };
}
