import os from 'os';
import path from 'path';
import fs from 'fs';
import { FileStore } from '../storage/store';

interface UserPreferences {
  writingStyle?: string;
  defaultFontSize?: number;
  defaultFontFamily?: string;
  preferredLanguage?: string;
  commonRecipients?: string[];
  recentSearches?: string[];
  favoriteTemplates?: string[];
  themePreference?: 'light' | 'dark' | 'system';
  lastUsedApps?: string[];
}

interface UserAction {
  timestamp: number;
  app: string;
  action: string;
  details?: string;
}

interface UserMemory {
  userId: string;
  preferences: UserPreferences;
  recentActions: UserAction[];
  writingPatterns: {
    averageDocLength: number;
    commonWords: Record<string, number>;
    formality: 'formal' | 'casual' | 'mixed';
    docCount: number;
  };
  updatedAt: number;
}

const MEMORY_DIR = path.join(os.homedir(), '.eoffice', 'data', 'user-memory');
const store = new FileStore<UserMemory>(MEMORY_DIR);

export class UserMemoryService {
  constructor() {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }

  getMemory(userId: string): UserMemory {
    const existing = store.get(userId);
    if (existing) return existing;

    const defaultMemory: UserMemory = {
      userId,
      preferences: {
        themePreference: 'system',
        commonRecipients: [],
        recentSearches: [],
        favoriteTemplates: [],
        lastUsedApps: [],
      },
      recentActions: [],
      writingPatterns: {
        averageDocLength: 0,
        commonWords: {},
        formality: 'mixed',
        docCount: 0,
      },
      updatedAt: Date.now(),
    };
    store.set(userId, defaultMemory);
    return defaultMemory;
  }

  updatePreferences(userId: string, preferences: Partial<UserPreferences>): UserMemory {
    const memory = this.getMemory(userId);
    memory.preferences = { ...memory.preferences, ...preferences };
    memory.updatedAt = Date.now();
    store.set(userId, memory);
    return memory;
  }

  recordAction(userId: string, app: string, action: string, details?: string): void {
    const memory = this.getMemory(userId);
    memory.recentActions.push({
      timestamp: Date.now(),
      app,
      action,
      details,
    });

    // Keep only last 100 actions
    if (memory.recentActions.length > 100) {
      memory.recentActions = memory.recentActions.slice(-100);
    }

    // Update last used apps
    if (!memory.preferences.lastUsedApps) {
      memory.preferences.lastUsedApps = [];
    }
    memory.preferences.lastUsedApps = [
      app,
      ...memory.preferences.lastUsedApps.filter(a => a !== app),
    ].slice(0, 5);

    memory.updatedAt = Date.now();
    store.set(userId, memory);
  }

  analyzeWritingStyle(userId: string, text: string): void {
    const memory = this.getMemory(userId);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    for (const word of words) {
      memory.writingPatterns.commonWords[word] = (memory.writingPatterns.commonWords[word] || 0) + 1;
    }

    // Keep only top 200 words
    const entries = Object.entries(memory.writingPatterns.commonWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200);
    memory.writingPatterns.commonWords = Object.fromEntries(entries);

    memory.writingPatterns.docCount++;
    const prevTotal = memory.writingPatterns.averageDocLength * (memory.writingPatterns.docCount - 1);
    memory.writingPatterns.averageDocLength = Math.round((prevTotal + words.length) / memory.writingPatterns.docCount);

    // Detect formality
    const formalWords = ['therefore', 'furthermore', 'consequently', 'regarding', 'hereby', 'pursuant'];
    const casualWords = ['hey', 'cool', 'gonna', 'wanna', 'yeah', 'btw', 'lol'];
    const formalCount = words.filter(w => formalWords.includes(w)).length;
    const casualCount = words.filter(w => casualWords.includes(w)).length;

    if (formalCount > casualCount) memory.writingPatterns.formality = 'formal';
    else if (casualCount > formalCount) memory.writingPatterns.formality = 'casual';
    else memory.writingPatterns.formality = 'mixed';

    memory.updatedAt = Date.now();
    store.set(userId, memory);
  }

  addRecipient(userId: string, email: string): void {
    const memory = this.getMemory(userId);
    if (!memory.preferences.commonRecipients) {
      memory.preferences.commonRecipients = [];
    }
    if (!memory.preferences.commonRecipients.includes(email)) {
      memory.preferences.commonRecipients.push(email);
      if (memory.preferences.commonRecipients.length > 50) {
        memory.preferences.commonRecipients = memory.preferences.commonRecipients.slice(-50);
      }
    }
    memory.updatedAt = Date.now();
    store.set(userId, memory);
  }

  addSearch(userId: string, query: string): void {
    const memory = this.getMemory(userId);
    if (!memory.preferences.recentSearches) {
      memory.preferences.recentSearches = [];
    }
    memory.preferences.recentSearches = [
      query,
      ...memory.preferences.recentSearches.filter(s => s !== query),
    ].slice(0, 20);
    memory.updatedAt = Date.now();
    store.set(userId, memory);
  }

  getSuggestions(userId: string): {
    recipients: string[];
    searches: string[];
    templates: string[];
    writingStyle: string;
  } {
    const memory = this.getMemory(userId);
    return {
      recipients: memory.preferences.commonRecipients || [],
      searches: memory.preferences.recentSearches || [],
      templates: memory.preferences.favoriteTemplates || [],
      writingStyle: memory.writingPatterns.formality,
    };
  }
}

export const userMemoryService = new UserMemoryService();
