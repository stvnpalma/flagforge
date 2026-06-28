const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

interface LogEntry {
  readonly level: LogLevel;
  readonly requestId: string;
  readonly message: string;
  readonly path?: string;
  readonly method?: string;
  readonly statusCode?: number;
  readonly durationMs?: number;
  readonly error?: string;
  readonly [key: string]: unknown;
}

function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}

export interface LoggerInstance {
  readonly info: (message: string, extra?: Partial<LogEntry>) => void;
  readonly warn: (message: string, extra?: Partial<LogEntry>) => void;
  readonly error: (message: string, extra?: Partial<LogEntry>) => void;
}

export function createLogger(requestId: string): LoggerInstance {
  return {
    info: (message: string, extra?: Partial<LogEntry>): void => {
      log({ level: LOG_LEVELS.INFO, requestId, message, ...extra });
    },
    warn: (message: string, extra?: Partial<LogEntry>): void => {
      log({ level: LOG_LEVELS.WARN, requestId, message, ...extra });
    },
    error: (message: string, extra?: Partial<LogEntry>): void => {
      log({ level: LOG_LEVELS.ERROR, requestId, message, ...extra });
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
