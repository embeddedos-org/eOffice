import * as Sentry from '@sentry/react';

const SENTRY_DSN = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SENTRY_DSN) || '';
let initialized = false;

/**
 * Initialize Sentry for the current frontend app.
 * Call once in the app's entry point (App.tsx or main.tsx).
 *
 * Requires: VITE_SENTRY_DSN environment variable
 */
export function initFrontendSentry(appName: string): void {
  if (initialized || !SENTRY_DSN) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: (import.meta as any).env?.MODE || 'production',
    release: `eoffice-${appName}@2.0.0`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Strip auth tokens from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.url?.includes('/api/auth')) {
          breadcrumb.data = { ...breadcrumb.data, body: '[REDACTED]' };
        }
      }
      return breadcrumb;
    },
  });

  // Set app context
  Sentry.setTag('app', appName);
}

/**
 * Set current user for Sentry context.
 * Call after login.
 */
export function setSentryUser(user: { id: string; username: string; email: string } | null): void {
  if (!initialized) return;
  if (user) {
    Sentry.setUser({ id: user.id, username: user.username, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture a custom error with additional context.
 */
export function captureError(error: Error | string, context?: Record<string, unknown>): void {
  if (!initialized) return;
  if (context) {
    Sentry.setContext('custom', context);
  }
  if (typeof error === 'string') {
    Sentry.captureMessage(error, 'error');
  } else {
    Sentry.captureException(error);
  }
}

/**
 * React Error Boundary wrapper powered by Sentry.
 */
export const SentryErrorBoundary = SENTRY_DSN
  ? Sentry.ErrorBoundary
  : ({ children }: { children: React.ReactNode; fallback?: React.ReactNode }) => children;

export { Sentry };
