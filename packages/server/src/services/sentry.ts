import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.log('[Sentry] SENTRY_DSN not set — crash monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `eoffice-server@${process.env.npm_package_version || '2.0.0'}`,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_RATE || '0.1'),

    // Filter sensitive data
    beforeSend(event) {
      // Strip authorization headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },

    // Ignore noisy errors
    ignoreErrors: [
      'ECONNRESET',
      'ECONNREFUSED',
      'EPIPE',
      'socket hang up',
    ],

    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });

  console.log(`[Sentry] Initialized (env: ${process.env.NODE_ENV}, traces: ${process.env.SENTRY_TRACES_RATE || '0.1'})`);
}

export function sentryErrorHandler() {
  if (!SENTRY_DSN) {
    // Return a no-op middleware if Sentry is not configured
    return (_err: Error, _req: any, _res: any, next: any) => next(_err);
  }
  return Sentry.expressErrorHandler();
}

export { Sentry };
