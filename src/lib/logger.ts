import { supabase } from './supabase';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogPayload {
  id: string;
  level: LogLevel;
  message: string;
  name?: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent: string;
  environment: string;
}

export interface LoggerOptions {
  apiEndpoint?: string;
  maxBufferSize?: number;
  enableConsoleOutput?: boolean;
}

class CentralizedLoggingService {
  private apiEndpoint: string;
  private maxBufferSize: number;
  private enableConsoleOutput: boolean;
  private logBuffer: LogPayload[] = [];

  constructor(options: LoggerOptions = {}) {
    this.apiEndpoint = options.apiEndpoint || (import.meta.env.VITE_LOGGING_API_ENDPOINT as string) || '/api/logs';
    this.maxBufferSize = options.maxBufferSize || 100;
    this.enableConsoleOutput = options.enableConsoleOutput !== false;
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private buildPayload(
    level: LogLevel,
    errorOrMessage: Error | string,
    details?: { componentStack?: string; context?: Record<string, unknown> }
  ): LogPayload {
    const isError = errorOrMessage instanceof Error;
    const message = isError ? errorOrMessage.message : String(errorOrMessage);
    const name = isError ? errorOrMessage.name : undefined;
    const stack = isError ? errorOrMessage.stack : undefined;

    return {
      id: this.generateId(),
      level,
      message: message || 'Unknown log message',
      name,
      stack: stack ? stack.slice(0, 3000) : undefined,
      componentStack: details?.componentStack ? details.componentStack.slice(0, 3000) : undefined,
      context: details?.context || {},
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      environment: (import.meta.env.MODE as string) || 'production',
    };
  }

  private addToBuffer(payload: LogPayload): void {
    this.logBuffer.unshift(payload);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.pop();
    }
  }

  private printConsole(payload: LogPayload): void {
    if (!this.enableConsoleOutput) return;

    const prefix = `[CentralizedLogger][${payload.level.toUpperCase()}][${payload.timestamp}]`;
    switch (payload.level) {
      case 'error':
        console.error(prefix, payload.message, payload);
        break;
      case 'warn':
        console.warn(prefix, payload.message, payload);
        break;
      case 'info':
        console.info(prefix, payload.message, payload);
        break;
      case 'debug':
      default:
        console.log(prefix, payload.message, payload);
        break;
    }
  }

  private async dispatchToApi(payload: LogPayload): Promise<boolean> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Log-Level': payload.level,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Endpoint may not be serving dynamic routes if mock mode or static fallback
    }

    // Fallback: report to Supabase activity_logs table for analysis
    try {
      const { error } = await supabase.from('activity_logs').insert({
        action: `system_log_${payload.level}`,
        entity_type: 'centralized_logger',
        details: {
          id: payload.id,
          level: payload.level,
          message: payload.message,
          name: payload.name,
          stack: payload.stack,
          componentStack: payload.componentStack,
          context: payload.context,
          url: payload.url,
          environment: payload.environment,
          timestamp: payload.timestamp,
        },
        user_agent: payload.userAgent,
      });

      return !error;
    } catch {
      return false;
    }
  }

  public async log(
    level: LogLevel,
    errorOrMessage: Error | string,
    details?: { componentStack?: string; context?: Record<string, unknown> }
  ): Promise<LogPayload> {
    const payload = this.buildPayload(level, errorOrMessage, details);
    this.addToBuffer(payload);
    this.printConsole(payload);

    await this.dispatchToApi(payload);
    return payload;
  }

  public async logError(
    errorOrMessage: Error | string,
    details?: { componentStack?: string; context?: Record<string, unknown> }
  ): Promise<LogPayload> {
    return this.log('error', errorOrMessage, details);
  }

  public async logWarning(
    message: string,
    context?: Record<string, unknown>
  ): Promise<LogPayload> {
    return this.log('warn', message, { context });
  }

  public async logInfo(
    message: string,
    context?: Record<string, unknown>
  ): Promise<LogPayload> {
    return this.log('info', message, { context });
  }

  public sendBeacon(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const payload = this.buildPayload(level, message, { context });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.apiEndpoint, blob);
      } catch {
        // Fallback silently
      }
    }
  }

  public getRecentLogs(): LogPayload[] {
    return [...this.logBuffer];
  }

  public clearLogs(): void {
    this.logBuffer = [];
  }
}

export const loggingService = new CentralizedLoggingService();
export const logError = loggingService.logError.bind(loggingService);
export const logWarning = loggingService.logWarning.bind(loggingService);
export const logInfo = loggingService.logInfo.bind(loggingService);
