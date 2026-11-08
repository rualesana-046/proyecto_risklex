import type { ApiErrorCode } from '@risklex/shared';

export interface LogEntry {
  readonly event: 'request_completed' | 'request_failed';
  readonly route: string;
  readonly status: number;
  readonly errorCode: ApiErrorCode | null;
  readonly durationMs: number;
  readonly textLength: number | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly appVersion: string | null;
}

export interface Logger {
  log(entry: LogEntry): void;
}

export type LogSink = (line: string) => void;

function toMetadataOnly(entry: LogEntry): LogEntry {
  return {
    event: entry.event,
    route: entry.route,
    status: entry.status,
    errorCode: entry.errorCode,
    durationMs: entry.durationMs,
    textLength: entry.textLength,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    appVersion: entry.appVersion,
  };
}

export function createLogger(
  sink: LogSink = (line) => {
    console.log(line);
  },
): Logger {
  return {
    log(entry) {
      sink(JSON.stringify(toMetadataOnly(entry)));
    },
  };
}
