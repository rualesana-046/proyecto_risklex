import { join } from 'node:path';

export const PACKAGED_DATA_FOLDER = 'RiskLex';
export const DEVELOPMENT_DATA_FOLDER = 'RiskLex Dev';

export function userDataPath(appDataPath: string, isPackaged: boolean): string {
  return join(appDataPath, isPackaged ? PACKAGED_DATA_FOLDER : DEVELOPMENT_DATA_FOLDER);
}
