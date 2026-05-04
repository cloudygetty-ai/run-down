// Centralized logger. Use this instead of console.log everywhere.
// In production, this can be wired to a remote error reporting service.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// WHY: __DEV__ is React Native's built-in flag — avoids requiring @types/node for process.env
declare const __DEV__: boolean;
const isDev = __DEV__;

function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  if (!isDev && level === 'debug') {
    return;
  }

  const prefix = `[${level.toUpperCase()}][${scope}]`;
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, data);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (scope: string, message: string, data?: unknown) => log('debug', scope, message, data),
  info: (scope: string, message: string, data?: unknown) => log('info', scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => log('warn', scope, message, data),
  error: (scope: string, message: string, data?: unknown) => log('error', scope, message, data),
};
