import { apiClient } from './config';

const APP_NAME = typeof document !== 'undefined'
  ? document.title.split(' ')[0]?.toLowerCase() || 'unknown'
  : 'unknown';

let sessionTracked = false;

export function useAnalytics() {
  // Track session start once
  if (!sessionTracked) {
    sessionTracked = true;
    track('session_start', 'session', 'start');
  }

  return { trackPageView, trackFeature, trackError, trackCrash: reportCrash };
}

function track(type: string, app: string, action: string, metadata?: Record<string, unknown>) {
  apiClient('/api/analytics/event', {
    method: 'POST',
    body: JSON.stringify({ type, app: app || APP_NAME, action, metadata }),
  }).catch(() => {}); // Fire and forget
}

export function trackPageView(page: string) {
  track('page_view', APP_NAME, page);
}

export function trackFeature(feature: string, metadata?: Record<string, unknown>) {
  track('feature_use', APP_NAME, feature, metadata);
}

export function trackError(error: string, metadata?: Record<string, unknown>) {
  track('error', APP_NAME, error, metadata);
}

export function reportCrash(error: Error | string, stack?: string) {
  const errorMsg = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : stack;
  apiClient('/api/analytics/crash', {
    method: 'POST',
    body: JSON.stringify({
      app: APP_NAME,
      error: errorMsg,
      stack: errorStack,
      version: '2.0.0',
    }),
  }).catch(() => {});
}

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    reportCrash(event.error || event.message, event.error?.stack);
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportCrash(String(event.reason), (event.reason as Error)?.stack);
  });
}
