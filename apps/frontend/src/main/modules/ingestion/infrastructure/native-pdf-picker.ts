import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type { PickedFile } from '../application/read-pdf.use-case.ts';

export async function pickPdfFile(): Promise<PickedFile | null> {
  const owner = BrowserWindow.getFocusedWindow();
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  };
  const choice =
    owner === null
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(owner, options);
  const path = choice.filePaths[0];
  if (choice.canceled || path === undefined) {
    return null;
  }
  const info = await stat(path);
  if (!info.isFile()) {
    return null;
  }
  return {
    name: basename(path),
    sizeBytes: info.size,
    read: async () => new Uint8Array(await readFile(path)),
  };
}
