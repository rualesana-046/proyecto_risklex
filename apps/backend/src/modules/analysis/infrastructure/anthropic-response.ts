import { z } from 'zod';
import { AnalysisError } from '../domain/analysis-error.ts';
import type { ModelAnalysis } from '../domain/language-model.port.ts';
import { modelOutputSchema } from './model-output.schema.ts';

const tokenCount = z.number().int().nonnegative();

const messagesResponseSchema = z.object({
  model: z.string().min(1),
  stop_reason: z.string().nullable(),
  content: z.array(z.object({ type: z.string() }).loose()),
  usage: z.object({ input_tokens: tokenCount, output_tokens: tokenCount }),
});

const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() });

function firstTextBlock(blocks: readonly unknown[]): string {
  for (const block of blocks) {
    const parsed = textBlockSchema.safeParse(block);
    if (parsed.success) {
      return parsed.data.text;
    }
  }
  throw new AnalysisError('provider_error');
}

function checkStopReason(stopReason: string | null): void {
  if (stopReason === 'refusal') {
    throw new AnalysisError('provider_refusal');
  }
  if (stopReason === 'max_tokens') {
    throw new AnalysisError('output_truncated');
  }
  if (stopReason !== 'end_turn') {
    throw new AnalysisError('provider_error');
  }
}

function parseModelOutput(text: string): z.infer<typeof modelOutputSchema> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AnalysisError('provider_error');
  }
  const output = modelOutputSchema.safeParse(json);
  if (!output.success) {
    throw new AnalysisError('provider_error');
  }
  return output.data;
}

export function parseMessagesResponse(json: unknown): ModelAnalysis {
  const envelope = messagesResponseSchema.safeParse(json);
  if (!envelope.success) {
    throw new AnalysisError('provider_error');
  }
  checkStopReason(envelope.data.stop_reason);
  const output = parseModelOutput(firstTextBlock(envelope.data.content));
  return {
    model: envelope.data.model,
    clauses: output.clauses,
    glossary: output.glossary,
    moreClausesLikely: output.moreClausesLikely,
    usage: {
      inputTokens: envelope.data.usage.input_tokens,
      outputTokens: envelope.data.usage.output_tokens,
    },
  };
}
