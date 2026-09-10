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

/**
 * Client-side diagnostic logger.
 *
 * There is deliberately no hard dependency on an undocumented `/api/logs`
 * route or on database writes. A future backend/observability endpoint can be
 * enabled with VITE_LOGGING_API_ENDPOINT without coupling the browser app to
 * a deployment-specific API shape.
 */
class CentralizedLoggingService {
  private readonly apiEndpoint: string | null;
  private readonly maxBufferSize: number;
  private readonly enableConsoleOutput: boolean;
  private logBuffer: LogPayload[] = [];

  constructor(options: LoggerOptions = {}) {
    const configuredEndpoint = options.apiEndpoint || import.meta.env.VITE_LOGGING_API_ENDPOINT;
    this.apiEndpoint = configuredEndpoint?.trim() || null;
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
    return {
      id: this.generateId(),
      level,
      message: message || 'Unknown log message',
      name: isError ? errorOrMessage.name : undefined,
      stack: isError && errorOrMessage.stack ? errorOrMessage.stack.slice(0, 3000) : undefined,
      componentStack: details?.componentStack?.slice(0, 3000),
      context: details?.context || {},
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      environment: import.meta.env.MODE || 'production',
    };
  }

  private addToBuffer(payload: LogPayload): void {
    this.logBuffer.unshift(payload);
    if (this.logBuffer.length > this.maxBufferSize) this.logBuffer.pop();
  }

  private printConsole(payload: LogPayload): void {
    if (!this.enableConsoleOutput) return;
    const prefix = `[ToplineLogger][${payload.level.toUpperCase()}]`;
    if (payload.level === 'error') console.error(prefix, payload.message, payload);
    else if (payload.level === 'warn') console.warn(prefix, payload.message, payload);
    else if (payload.level === 'info') console.info(prefix, payload.message, payload);
    else console.debug(prefix, payload.message, payload);
  }

  private async dispatch(payload: LogPayload): Promise<void> {
    if (!this.apiEndpoint) return;
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Log-Level': payload.level },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Diagnostics must never create a second application failure.
    }
  }

  async log(
    level: LogLevel,
    errorOrMessage: Error | string,
    details?: { componentStack?: string; context?: Record<string, unknown> }
  ): Promise<LogPayload> {
    const payload = this.buildPayload(level, errorOrMessage, details);
    this.addToBuffer(payload);
    this.printConsole(payload);
    await this.dispatch(payload);
    return payload;
  }

  logError(errorOrMessage: Error | string, details?: { componentStack?: string; context?: Record<string, unknown> }) {
    return this.log('error', errorOrMessage, details);
  }

  logWarning(message: string, context?: Record<string, unknown>) {
    return this.log('warn', message, { context });
  }

  logInfo(message: string, context?: Record<string, unknown>) {
    return this.log('info', message, { context });
  }

  sendBeacon(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.apiEndpoint || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const payload = this.buildPayload(level, message, { context });
    try {
      navigator.sendBeacon(this.apiEndpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } catch {
      // Diagnostics must never create a second application failure.
    }
  }

  getRecentLogs(): LogPayload[] { return [...this.logBuffer]; }
  clearLogs(): void { this.logBuffer = []; }
}

export const loggingService = new CentralizedLoggingService();
export const logError = loggingService.logError.bind(loggingService);
export const logWarning = loggingService.logWarning.bind(loggingService);
export const logInfo = loggingService.logInfo.bind(loggingService);
