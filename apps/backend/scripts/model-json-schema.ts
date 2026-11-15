import { z } from 'zod';
import { modelOutputSchema } from '../src/modules/analysis/infrastructure/model-output.schema.ts';

export function buildModelJsonSchema(): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    ...z.toJSONSchema(modelOutputSchema, { target: 'draft-2020-12' }),
  };
  delete schema.$schema;
  return schema;
}
