import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  animations: boolean;
  setAnimations: (enabled: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      accentColor: '#1a56db',
      setAccentColor: (color) => set({ accentColor: color }),
      fontSize: 14,
      setFontSize: (size) => set({ fontSize: size }),
      fontFamily: 'Inter',
      setFontFamily: (font) => set({ fontFamily: font }),
      compactMode: false,
      setCompactMode: (compact) => set({ compactMode: compact }),
      animations: true,
      setAnimations: (enabled) => set({ animations: enabled })
    }),
    { name: 'eoffice-theme' }
  )
);
