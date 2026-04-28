import os from 'os';
import path from 'path';
import fs from 'fs';
import { FileStore } from '../storage/store';

const ANALYTICS_DIR = path.join(os.homedir(), '.eoffice', 'data', 'analytics');

// --- Event Types ---
interface AnalyticsEvent {
  id: string;
  type: 'page_view' | 'feature_use' | 'api_call' | 'error' | 'crash' | 'session_start' | 'session_end';
  userId?: string;
  app: string;
  action: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  ip?: string;
  timestamp: string;
}

interface DailyStats {
  date: string;
  uniqueUsers: Set<string>;
  totalEvents: number;
  pageViews: number;
  featureUses: number;
  apiCalls: number;
  errors: number;
  crashes: number;
  appUsage: Record<string, number>;
  featureUsage: Record<string, number>;
  topActions: Record<string, number>;
}

interface CrashReport {
  id: string;
  userId?: string;
  app: string;
  error: string;
  stack?: string;
  userAgent?: string;
  version?: string;
  timestamp: string;
}

// --- Storage ---
const eventStore = new FileStore<AnalyticsEvent>(path.join(ANALYTICS_DIR, 'events'));
const crashStore = new FileStore<CrashReport>(path.join(ANALYTICS_DIR, 'crashes'));
const statsStore = new FileStore<{ date: string; uniqueUsers: string[]; totalEvents: number; pageViews: number; featureUses: number; apiCalls: number; errors: number; crashes: number; appUsage: Record<string, number>; featureUsage: Record<string, number>; topActions: Record<string, number> }>(path.join(ANALYTICS_DIR, 'daily-stats'));

// --- In-Memory Counters (flushed periodically) ---
let todayStats: DailyStats = createEmptyStats();
let eventBuffer: AnalyticsEvent[] = [];
const FLUSH_INTERVAL = 60000; // 1 minute
const MAX_BUFFER = 100;

function createEmptyStats(): DailyStats {
  return {
    date: new Date().toISOString().slice(0, 10),
    uniqueUsers: new Set(),
    totalEvents: 0,
    pageViews: 0,
    featureUses: 0,
    apiCalls: 0,
    errors: 0,
    crashes: 0,
    appUsage: {},
    featureUsage: {},
    topActions: {},
  };
}

function ensureToday(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (todayStats.date !== today) {
    flushStats();
    todayStats = createEmptyStats();
  }
}

// --- Public API ---
export function trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): void {
  ensureToday();
  const fullEvent: AnalyticsEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  eventBuffer.push(fullEvent);
  todayStats.totalEvents++;

  if (event.userId) todayStats.uniqueUsers.add(event.userId);

  switch (event.type) {
    case 'page_view': todayStats.pageViews++; break;
    case 'feature_use': todayStats.featureUses++; break;
    case 'api_call': todayStats.apiCalls++; break;
    case 'error': todayStats.errors++; break;
    case 'crash': todayStats.crashes++; break;
  }

  // Track per-app usage
  todayStats.appUsage[event.app] = (todayStats.appUsage[event.app] || 0) + 1;

  // Track feature usage
  if (event.type === 'feature_use') {
    const key = `${event.app}:${event.action}`;
    todayStats.featureUsage[key] = (todayStats.featureUsage[key] || 0) + 1;
  }

  // Track top actions
  todayStats.topActions[event.action] = (todayStats.topActions[event.action] || 0) + 1;

  // Flush if buffer is full
  if (eventBuffer.length >= MAX_BUFFER) {
    flushEvents();
  }
}

export function trackCrash(report: Omit<CrashReport, 'id' | 'timestamp'>): void {
  const fullReport: CrashReport = {
    ...report,
    id: `crash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  crashStore.set(fullReport.id, fullReport);
  trackEvent({ type: 'crash', app: report.app, action: 'crash', userId: report.userId, metadata: { error: report.error } });
}

export function getStats(days: number = 7): Array<Record<string, unknown>> {
  ensureToday();
  const allStats = statsStore.list();
  const todaySerialized = {
    date: todayStats.date,
    uniqueUsers: Array.from(todayStats.uniqueUsers),
    totalEvents: todayStats.totalEvents,
    pageViews: todayStats.pageViews,
    featureUses: todayStats.featureUses,
    apiCalls: todayStats.apiCalls,
    errors: todayStats.errors,
    crashes: todayStats.crashes,
    appUsage: todayStats.appUsage,
    featureUsage: todayStats.featureUsage,
    topActions: todayStats.topActions,
  };
  return [...allStats, todaySerialized]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}

export function getCrashes(limit: number = 50): CrashReport[] {
  return crashStore.list()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function getDashboard(): Record<string, unknown> {
  ensureToday();
  const stats7d = getStats(7);
  const total7d = stats7d.reduce((acc, s: any) => ({
    events: acc.events + s.totalEvents,
    users: acc.users + (s.uniqueUsers?.length || 0),
    errors: acc.errors + s.errors,
    crashes: acc.crashes + s.crashes,
  }), { events: 0, users: 0, errors: 0, crashes: 0 });

  // Sort feature usage
  const featureRanking = Object.entries(todayStats.featureUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([feature, count]) => ({ feature, count }));

  // Sort app usage
  const appRanking = Object.entries(todayStats.appUsage)
    .sort((a, b) => b[1] - a[1])
    .map(([app, count]) => ({ app, count }));

  return {
    today: {
      date: todayStats.date,
      uniqueUsers: todayStats.uniqueUsers.size,
      totalEvents: todayStats.totalEvents,
      pageViews: todayStats.pageViews,
      featureUses: todayStats.featureUses,
      errors: todayStats.errors,
      crashes: todayStats.crashes,
    },
    last7Days: total7d,
    appRanking,
    featureRanking,
    recentCrashes: getCrashes(10),
    dailyTrend: stats7d.map((s: any) => ({
      date: s.date,
      events: s.totalEvents,
      users: s.uniqueUsers?.length || 0,
      errors: s.errors,
    })),
  };
}

// --- Flush to disk ---
function flushEvents(): void {
  for (const event of eventBuffer) {
    eventStore.set(event.id, event);
  }
  eventBuffer = [];
}

function flushStats(): void {
  const serialized = {
    date: todayStats.date,
    uniqueUsers: Array.from(todayStats.uniqueUsers),
    totalEvents: todayStats.totalEvents,
    pageViews: todayStats.pageViews,
    featureUses: todayStats.featureUses,
    apiCalls: todayStats.apiCalls,
    errors: todayStats.errors,
    crashes: todayStats.crashes,
    appUsage: todayStats.appUsage,
    featureUsage: todayStats.featureUsage,
    topActions: todayStats.topActions,
  };
  statsStore.set(todayStats.date, serialized as any);
}

// Periodic flush
setInterval(() => {
  if (eventBuffer.length > 0) flushEvents();
  flushStats();
}, FLUSH_INTERVAL);

// Flush on exit
process.on('beforeExit', () => { flushEvents(); flushStats(); });
