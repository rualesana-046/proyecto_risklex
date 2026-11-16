import * as z from 'zod';

export const PDF_WORKER_FILE = 'pdf-text.worker.js';

export const pdfWorkerRequestSchema = z.strictObject({
  bytes: z.instanceof(Uint8Array),
  maxPages: z.number().int().positive(),
});

export const pdfWorkerResponseSchema = z.union([
  z.strictObject({ ok: z.literal(true), text: z.string(), pages: z.number().int().nonnegative() }),
  z.strictObject({
    ok: z.literal(false),
    code: z.enum([
      'pdf_not_pdf',
      'pdf_too_many_pages',
      'pdf_encrypted',
      'pdf_damaged',
      'pdf_no_text',
    ]),
  }),
]);

export type PdfWorkerRequest = z.infer<typeof pdfWorkerRequestSchema>;
export type PdfWorkerResponse = z.infer<typeof pdfWorkerResponseSchema>;
