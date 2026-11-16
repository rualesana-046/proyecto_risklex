import { extractPdfText } from '../modules/ingestion/infrastructure/pdf-text-extractor.ts';
import {
  pdfWorkerRequestSchema,
  type PdfWorkerResponse,
} from '../modules/ingestion/infrastructure/pdf-worker-protocol.ts';

const DAMAGED: PdfWorkerResponse = { ok: false, code: 'pdf_damaged' };

process.parentPort.once('message', (event) => {
  const request = pdfWorkerRequestSchema.safeParse(event.data);
  if (!request.success) {
    process.parentPort.postMessage(DAMAGED);
    return;
  }
  extractPdfText(request.data.bytes, request.data.maxPages).then(
    (response) => {
      process.parentPort.postMessage(response);
    },
    () => {
      process.parentPort.postMessage(DAMAGED);
    },
  );
});
