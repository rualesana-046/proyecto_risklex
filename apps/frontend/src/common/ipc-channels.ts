export const IPC_CHANNELS = {
  analyze: 'analysis:run',
  cancel: 'analysis:cancel',
  progress: 'analysis:progress',
  pickPdf: 'document:pick-pdf',
  readLink: 'document:read-link',
  cancelDocument: 'document:cancel',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
} as const;
