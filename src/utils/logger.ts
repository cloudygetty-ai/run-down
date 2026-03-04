// Centralized logger. Use this instead of console.log everywhere.
// In production, this can be wired to a remote error reporting service.

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV !== "production";

function log(
  level: LogLevel,
  scope: string,
  message: string,
  data?: unknown
): void {
  if (!isDev && level === "debug") {
    return;
  }

  const prefix = `[${level.toUpperCase()}][${scope}]`;
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](`${prefix} ${message}`, data);
  } else {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (scope: string, message: string, data?: unknown) =>
    log("debug", scope, message, data),
  info: (scope: string, message: string, data?: unknown) =>
    log("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) =>
    log("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) =>
    log("error", scope, message, data),
};
