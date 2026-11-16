export const IPC_CHANNELS = {
  analyze: 'analysis:run',
  cancel: 'analysis:cancel',
  progress: 'analysis:progress',
  pickPdf: 'document:pick-pdf',
  readLink: 'document:read-link',
  cancelDocument: 'document:cancel',
} as const;
