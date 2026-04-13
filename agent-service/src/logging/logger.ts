export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

/**
 * Simple structured logger for the Patricon agent runtime.
 */
export class StructuredLogger {
  constructor(private readonly component: string) {}

  debug(message: string, context: LogContext = {}): void {
    this.write("debug", message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.write("info", message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.write("warn", message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.write("error", message, context);
  }

  child(childComponent: string): StructuredLogger {
    return new StructuredLogger(`${this.component}.${childComponent}`);
  }

  private write(level: LogLevel, message: string, context: LogContext): void {
    const entry = {
      ts: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...context
    };

    const serialized = JSON.stringify(entry);
    if (level === "error") {
      console.error(serialized);
      return;
    }
    if (level === "warn") {
      console.warn(serialized);
      return;
    }
    console.log(serialized);
  }
}