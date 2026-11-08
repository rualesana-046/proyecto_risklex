import { describe, expect, it } from 'vitest';
import generatedSchema from './model-output.schema.json';
import { buildModelJsonSchema, modelOutputSchema } from './model-output.schema.ts';

type JsonNode = Record<string, unknown>;

const UNSUPPORTED_KEYWORDS = [
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'maxItems',
  'pattern',
  '$schema',
];

function isNode(value: unknown): value is JsonNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectNodes(node: unknown, found: JsonNode[] = []): JsonNode[] {
  if (Array.isArray(node)) {
    node.forEach((item) => collectNodes(item, found));
  } else if (isNode(node)) {
    found.push(node);
    Object.values(node).forEach((value) => collectNodes(value, found));
  }
  return found;
}

const nodes = collectNodes(generatedSchema);
const objectNodes = nodes.filter((node) => node.type === 'object');

describe('model output JSON schema', () => {
  it('is up to date with the Zod definition', () => {
    expect(generatedSchema).toEqual(buildModelJsonSchema());
  });

  it('closes every object with additionalProperties false', () => {
    expect(objectNodes.length).toBeGreaterThan(0);
    for (const node of objectNodes) {
      expect(node.additionalProperties).toBe(false);
    }
  });

  it('has no optional properties', () => {
    for (const node of objectNodes) {
      const properties = Object.keys(isNode(node.properties) ? node.properties : {});
      expect(node.required).toEqual(properties);
    }
  });

  it('stays within the union limit of the structured output API', () => {
    const unions = nodes.filter(
      (node) => 'anyOf' in node || 'oneOf' in node || Array.isArray(node.type),
    );
    expect(unions.length).toBeLessThanOrEqual(16);
  });

  it('uses no keyword that the structured output API rejects', () => {
    for (const node of nodes) {
      for (const keyword of UNSUPPORTED_KEYWORDS) {
        expect(node).not.toHaveProperty(keyword);
      }
    }
  });

  it('asks the model for the moreClausesLikely flag', () => {
    expect(modelOutputSchema.shape.moreClausesLikely).toBeDefined();
    expect(generatedSchema.required).toContain('moreClausesLikely');
  });
});
