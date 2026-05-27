import { IncomingMessage } from 'http';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60,
};

const configuredLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
const minLevel = LEVEL_VALUES[configuredLevel] || 30;

let requestCounter = 0;

function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % 1000000;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

function formatLog(level: LogLevel, msg: string, data?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg,
    ...data,
  };
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  // Pretty format for development
  const color = { trace: '[90m', debug: '[36m', info: '[32m', warn: '[33m', error: '[31m', fatal: '[35m' }[level];
  const extra = data ? ` ${JSON.stringify(data)}` : '';
  return `${color}[${level.toUpperCase()}][0m ${entry.time} ${msg}${extra}`;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_VALUES[level] >= minLevel;
}

export const logger = {
  trace(msg: string, data?: Record<string, unknown>) { if (shouldLog('trace')) console.log(formatLog('trace', msg, data)); },
  debug(msg: string, data?: Record<string, unknown>) { if (shouldLog('debug')) console.log(formatLog('debug', msg, data)); },
  info(msg: string, data?: Record<string, unknown>) { if (shouldLog('info')) console.log(formatLog('info', msg, data)); },
  warn(msg: string, data?: Record<string, unknown>) { if (shouldLog('warn')) console.warn(formatLog('warn', msg, data)); },
  error(msg: string, data?: Record<string, unknown>) { if (shouldLog('error')) console.error(formatLog('error', msg, data)); },
  fatal(msg: string, data?: Record<string, unknown>) { if (shouldLog('fatal')) console.error(formatLog('fatal', msg, data)); },

  child(bindings: Record<string, unknown>) {
    const parent = this;
    return {
      trace(msg: string, data?: Record<string, unknown>) { parent.trace(msg, { ...bindings, ...data }); },
      debug(msg: string, data?: Record<string, unknown>) { parent.debug(msg, { ...bindings, ...data }); },
      info(msg: string, data?: Record<string, unknown>) { parent.info(msg, { ...bindings, ...data }); },
      warn(msg: string, data?: Record<string, unknown>) { parent.warn(msg, { ...bindings, ...data }); },
      error(msg: string, data?: Record<string, unknown>) { parent.error(msg, { ...bindings, ...data }); },
      fatal(msg: string, data?: Record<string, unknown>) { parent.fatal(msg, { ...bindings, ...data }); },
      child(childBindings: Record<string, unknown>) { return parent.child({ ...bindings, ...childBindings }); },
    };
  },

  generateRequestId,
};

export type { LogLevel };
