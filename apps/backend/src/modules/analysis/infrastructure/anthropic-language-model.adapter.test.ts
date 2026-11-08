import { describe, expect, it } from 'vitest';
import { AI_PROVIDER_CONFIG } from '../../../config/ai-provider.config.ts';
import { AnalysisError } from '../domain/analysis-error.ts';
import {
  createAnthropicLanguageModel,
  type FetchFunction,
} from './anthropic-language-model.adapter.ts';

const FAKE_KEY = 'fake-key-for-tests-0000';
const PROVIDER_BODY_MARKER = 'PROVIDER-BODY-MARKER';

const assessment = { severity: 'warning', meaning: 'Meaning.', consequence: 'Consequence.' };
const modelOutput = {
  clauses: [
    {
      category: 'privacy',
      title: 'Shares data',
      quote: 'We may share personal information with partners.',
      evidenceStatus: 'supported',
      isAmbiguous: false,
      ambiguityReason: '',
      confidence: 'high',
      entities: [{ type: 'party', text: 'We' }],
      profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
    },
  ],
  glossary: [],
  moreClausesLikely: false,
};

function messagesBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    model: 'claude-sonnet-5-5',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(modelOutput) }],
    usage: { input_tokens: 1500, output_tokens: 700 },
    ...overrides,
  };
}

interface FakeCall {
  readonly url: string;
  readonly init: RequestInit;
}

function fakeFetch(response: Response | Error, calls: FakeCall[] = []): FetchFunction {
  return (url, init) => {
    calls.push({ url, init });
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

async function analyzeWith(fetchFunction: FetchFunction): Promise<unknown> {
  const model = createAnthropicLanguageModel({ apiKey: FAKE_KEY, fetchFunction });
  return model.analyze({ text: 'Terms of service.', language: 'es' });
}

async function errorOf(fetchFunction: FetchFunction): Promise<AnalysisError> {
  try {
    await analyzeWith(fetchFunction);
  } catch (error) {
    if (error instanceof AnalysisError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected an AnalysisError');
}

describe('anthropic language model adapter (simulated fetch)', () => {
  it('sends the configured request to the messages endpoint', async () => {
    const calls: FakeCall[] = [];
    await analyzeWith(fakeFetch(jsonResponse(messagesBody()), calls));
    const [call] = calls;
    const headers = new Headers(call?.init.headers);
    const rawBody = call?.init.body;
    expect(typeof rawBody).toBe('string');
    const body = JSON.parse(typeof rawBody === 'string' ? rawBody : '{}') as Record<
      string,
      unknown
    >;
    expect(call?.url).toBe(AI_PROVIDER_CONFIG.messagesUrl);
    expect(call?.init.method).toBe('POST');
    expect(headers.get('x-api-key')).toBe(FAKE_KEY);
    expect(headers.get('anthropic-version')).toBe('2026-10-21');
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(body).toMatchObject({
      model: 'claude-sonnet-5-5',
      max_tokens: AI_PROVIDER_CONFIG.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema' } },
    });
    expect(body).not.toHaveProperty('temperature');
  });

  it('returns the parsed analysis with token usage', async () => {
    const analysis = await analyzeWith(fakeFetch(jsonResponse(messagesBody())));
    expect(analysis).toMatchObject({
      model: 'claude-sonnet-5-5',
      moreClausesLikely: false,
      usage: { inputTokens: 1500, outputTokens: 700 },
    });
  });

  it('reads the text block and ignores a thinking block before it', async () => {
    const body = messagesBody({
      content: [
        { type: 'thinking', thinking: '', signature: 'abc' },
        { type: 'text', text: JSON.stringify(modelOutput) },
      ],
    });
    const analysis = await analyzeWith(fakeFetch(jsonResponse(body)));
    expect(analysis).toMatchObject({ clauses: [{ category: 'privacy' }] });
  });

  it.each([
    ['a refusal', messagesBody({ stop_reason: 'refusal' }), 'provider_refusal'],
    [
      'a max_tokens stop even with valid JSON',
      messagesBody({ stop_reason: 'max_tokens' }),
      'output_truncated',
    ],
    ['an unexpected stop reason', messagesBody({ stop_reason: 'pause_turn' }), 'provider_error'],
    [
      'no text block',
      messagesBody({ content: [{ type: 'thinking', thinking: '' }] }),
      'provider_error',
    ],
    [
      'text that is not JSON',
      messagesBody({ content: [{ type: 'text', text: 'Sure! {' }] }),
      'provider_error',
    ],
    [
      'output outside the schema',
      messagesBody({ content: [{ type: 'text', text: '{"clauses":[]}' }] }),
      'provider_error',
    ],
    ['an invalid envelope', { unexpected: true }, 'provider_error'],
  ])('maps %s to %s', async (_label, body, code) => {
    expect((await errorOf(fakeFetch(jsonResponse(body)))).code).toBe(code);
  });

  it.each([429, 500, 529, 400])(
    'maps HTTP %i from the provider to provider_error',
    async (status) => {
      const response = new Response(`${PROVIDER_BODY_MARKER} ${FAKE_KEY}`, { status });
      expect((await errorOf(fakeFetch(response))).code).toBe('provider_error');
    },
  );

  it('maps a timeout to provider_error', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError');
    expect((await errorOf(fakeFetch(timeout))).code).toBe('provider_error');
  });

  it('maps a network failure to provider_error', async () => {
    expect((await errorOf(fakeFetch(new TypeError('fetch failed')))).code).toBe('provider_error');
  });

  it('never includes the key, headers or provider body in errors', async () => {
    const response = new Response(`${PROVIDER_BODY_MARKER} x-api-key ${FAKE_KEY}`, { status: 500 });
    const error = await errorOf(fakeFetch(response));
    const serialized = `${error.message} ${String(error.stack)} ${JSON.stringify(error)}`;
    expect(serialized).not.toContain(FAKE_KEY);
    expect(serialized).not.toContain(PROVIDER_BODY_MARKER);
    expect(serialized).not.toContain('x-api-key');
  });
});
