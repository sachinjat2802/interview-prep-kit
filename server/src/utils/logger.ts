/**
 * @file logger.ts
 * @description Structured Logging Utility — Provides consistent timestamped logs with severity levels and context tags.
 * @module Utils/Logger
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private levelOrder: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  private currentLevel: LogLevel = LogLevel.INFO;

  constructor() {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      this.currentLevel = LogLevel.DEBUG;
    }
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.currentLevel];
  }

  private formatMessage(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}] ${message}`;
  }

  public debug(context: string, message: string, ...meta: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.formatMessage(LogLevel.DEBUG, context, message);
    if (meta.length > 0) {
      console.debug(formatted, ...meta);
    } else {
      console.debug(formatted);
    }
  }

  public info(context: string, message: string, ...meta: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.formatMessage(LogLevel.INFO, context, message);
    if (meta.length > 0) {
      console.log(formatted, ...meta);
    } else {
      console.log(formatted);
    }
  }

  public warn(context: string, message: string, ...meta: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.formatMessage(LogLevel.WARN, context, message);
    if (meta.length > 0) {
      console.warn(formatted, ...meta);
    } else {
      console.warn(formatted);
    }
  }

  public error(context: string, message: string, ...meta: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.formatMessage(LogLevel.ERROR, context, message);
    if (meta.length > 0) {
      console.error(formatted, ...meta);
    } else {
      console.error(formatted);
    }
  }
}

export const logger = new Logger();
