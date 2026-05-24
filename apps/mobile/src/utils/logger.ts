// LogLevel enum values are used for type checking and comparisons
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  static getInstance(level?: LogLevel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(level);
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const levelName = LogLevel[level];
    const timestamp = entry.timestamp.toISOString();
    const contextStr = context ? `[${context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';

    console.log(`[${timestamp}] ${levelName} ${contextStr} ${message}${dataStr}`);
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  importLogs(logs: string): void {
    try {
      const parsedLogs = JSON.parse(logs);
      this.logs = Array.isArray(parsedLogs) ? parsedLogs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      })) : [];
    } catch (error) {
      this.error('Failed to import logs', 'Logger', error);
    }
  }

  getStats(): {
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
  } {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    for (const log of this.logs) {
      switch (log.level) {
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
      }
    }

    return stats;
  }
}

export const logger = Logger.getInstance();

export const createLogger = (context: string) => ({
  debug: (message: string, data?: any) => logger.debug(message, context, data),
  info: (message: string, data?: any) => logger.info(message, context, data),
  warn: (message: string, data?: any) => logger.warn(message, context, data),
  error: (message: string, data?: any) => logger.error(message, context, data),
});

export const logError = (error: any, context?: string): void => {
  logger.error(error.message || 'Unknown error', context, error);
};

export const logInfo = (message: string, context?: string, data?: any): void => {
  logger.info(message, context, data);
};

export const logWarning = (message: string, context?: string, data?: any): void => {
  logger.warn(message, context, data);
};

export const logDebug = (message: string, context?: string, data?: any): void => {
  logger.debug(message, context, data);
};