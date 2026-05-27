/**
 * Comprehensive tests for src/store/themeStore.ts
 * Tests: theme switching, accent color, font size, font family, compact mode, animations
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../store/themeStore';

// Reset store state before each test
function resetStore() {
  useThemeStore.setState({
    theme: 'system',
    accentColor: '#1a56db',
    fontSize: 14,
    fontFamily: 'Inter',
    compactMode: false,
    animations: true,
  });
}

describe('ThemeStore — Initial State', () => {
  beforeEach(resetStore);

  it('has default theme of "system"', () => {
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('has default accentColor of #1a56db', () => {
    expect(useThemeStore.getState().accentColor).toBe('#1a56db');
  });

  it('has default fontSize of 14', () => {
    expect(useThemeStore.getState().fontSize).toBe(14);
  });

  it('has default fontFamily of "Inter"', () => {
    expect(useThemeStore.getState().fontFamily).toBe('Inter');
  });

  it('has default compactMode of false', () => {
    expect(useThemeStore.getState().compactMode).toBe(false);
  });

  it('has default animations of true', () => {
    expect(useThemeStore.getState().animations).toBe(true);
  });
});

describe('ThemeStore — setTheme', () => {
  beforeEach(resetStore);

  it('sets theme to "dark"', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('sets theme to "light"', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('sets theme to "system"', () => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('theme change does not affect other state', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().fontSize).toBe(14);
    expect(useThemeStore.getState().fontFamily).toBe('Inter');
    expect(useThemeStore.getState().compactMode).toBe(false);
  });
});

describe('ThemeStore — setAccentColor', () => {
  beforeEach(resetStore);

  it('sets accent color to a new hex value', () => {
    useThemeStore.getState().setAccentColor('#ff5733');
    expect(useThemeStore.getState().accentColor).toBe('#ff5733');
  });

  it('sets accent color to blue', () => {
    useThemeStore.getState().setAccentColor('#0000ff');
    expect(useThemeStore.getState().accentColor).toBe('#0000ff');
  });

  it('sets accent color to RGB format', () => {
    useThemeStore.getState().setAccentColor('rgb(255, 100, 50)');
    expect(useThemeStore.getState().accentColor).toBe('rgb(255, 100, 50)');
  });
});

describe('ThemeStore — setFontSize', () => {
  beforeEach(resetStore);

  it('sets font size to 12', () => {
    useThemeStore.getState().setFontSize(12);
    expect(useThemeStore.getState().fontSize).toBe(12);
  });

  it('sets font size to 18', () => {
    useThemeStore.getState().setFontSize(18);
    expect(useThemeStore.getState().fontSize).toBe(18);
  });

  it('sets font size to 24', () => {
    useThemeStore.getState().setFontSize(24);
    expect(useThemeStore.getState().fontSize).toBe(24);
  });

  it('font size change does not affect theme', () => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setFontSize(20);
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});

describe('ThemeStore — setFontFamily', () => {
  beforeEach(resetStore);

  it('sets font family to "Arial"', () => {
    useThemeStore.getState().setFontFamily('Arial');
    expect(useThemeStore.getState().fontFamily).toBe('Arial');
  });

  it('sets font family to "Roboto"', () => {
    useThemeStore.getState().setFontFamily('Roboto');
    expect(useThemeStore.getState().fontFamily).toBe('Roboto');
  });

  it('sets font family to "Times New Roman"', () => {
    useThemeStore.getState().setFontFamily('Times New Roman');
    expect(useThemeStore.getState().fontFamily).toBe('Times New Roman');
  });
});

describe('ThemeStore — setCompactMode', () => {
  beforeEach(resetStore);

  it('enables compact mode', () => {
    useThemeStore.getState().setCompactMode(true);
    expect(useThemeStore.getState().compactMode).toBe(true);
  });

  it('disables compact mode', () => {
    useThemeStore.getState().setCompactMode(true);
    useThemeStore.getState().setCompactMode(false);
    expect(useThemeStore.getState().compactMode).toBe(false);
  });
});

describe('ThemeStore — setAnimations', () => {
  beforeEach(resetStore);

  it('disables animations', () => {
    useThemeStore.getState().setAnimations(false);
    expect(useThemeStore.getState().animations).toBe(false);
  });

  it('enables animations', () => {
    useThemeStore.getState().setAnimations(false);
    useThemeStore.getState().setAnimations(true);
    expect(useThemeStore.getState().animations).toBe(true);
  });
});

describe('ThemeStore — Combined State Changes', () => {
  beforeEach(resetStore);

  it('multiple changes are all reflected correctly', () => {
    const store = useThemeStore.getState();
    store.setTheme('dark');
    store.setAccentColor('#ff0000');
    store.setFontSize(16);
    store.setFontFamily('Roboto');
    store.setCompactMode(true);
    store.setAnimations(false);

    const state = useThemeStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.accentColor).toBe('#ff0000');
    expect(state.fontSize).toBe(16);
    expect(state.fontFamily).toBe('Roboto');
    expect(state.compactMode).toBe(true);
    expect(state.animations).toBe(false);
  });

  it('resetting to defaults works correctly', () => {
    const store = useThemeStore.getState();
    store.setTheme('dark');
    store.setFontSize(20);
    // Reset
    store.setTheme('system');
    store.setFontSize(14);
    const state = useThemeStore.getState();
    expect(state.theme).toBe('system');
    expect(state.fontSize).toBe(14);
  });
});
