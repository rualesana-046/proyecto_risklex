import { writeFileSync } from 'node:fs';
import { buildModelJsonSchema } from '../src/modules/analysis/infrastructure/model-output.schema.ts';

const target = new URL(
  '../src/modules/analysis/infrastructure/model-output.schema.json',
  import.meta.url,
);

writeFileSync(target, `${JSON.stringify(buildModelJsonSchema(), null, 2)}\n`);
console.log('Model output schema written. Run npm run format before committing.');
