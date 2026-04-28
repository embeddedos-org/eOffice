const Sentry = require('@sentry/electron');

function initDesktopSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.EOFFICE_SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] No DSN configured — desktop crash monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    release: `eoffice-desktop@${require('./package.json').version}`,
    environment: process.env.NODE_ENV || 'production',

    // Main process options
    beforeSend(event) {
      // Strip any tokens from event data
      if (event.extra) {
        delete event.extra.token;
        delete event.extra.jwt;
      }
      return event;
    },
  });

  console.log('[Sentry] Desktop crash monitoring initialized');
}

module.exports = { initDesktopSentry };
