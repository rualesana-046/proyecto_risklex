import { createLogger, type Logger } from './common/logger.ts';

export const SERVICE_VERSION = '0.1.0';

export interface AppDependencies {
  readonly logger: Logger;
  readonly serviceVersion: string;
}

export function createDependencies(): AppDependencies {
  return {
    logger: createLogger(),
    serviceVersion: SERVICE_VERSION,
  };
}
