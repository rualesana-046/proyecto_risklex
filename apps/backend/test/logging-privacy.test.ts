import { INSTALL_ID_HEADER } from '@risklex/shared';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createApp } from '../src/app.ts';
import { createDependencies } from '../src/composition-root.ts';

const DOCUMENT_MARKER = 'DOCUMENT-CONTENT-MARKER-7f3a';
const KEY_MARKER = 'KEY-MARKER-9b1c-not-a-real-key';
const PROVIDER_MARKER = 'PROVIDER-BODY-MARKER-2e8d';
const FORBIDDEN = [DOCUMENT_MARKER, KEY_MARKER, PROVIDER_MARKER, 'x-api-key', 'anthropic-version'];

const QUOTE = `The company may share ${DOCUMENT_MARKER} with partners.`;
const DOCUMENT = `Terms of service. ${QUOTE} End of terms.`;

const assessment = { severity: 'warning', meaning: 'Meaning.', consequence: 'Consequence.' };
const modelText = JSON.stringify({
  clauses: [
    {
      category: 'privacy',
      title: 'Shares data',
      quote: QUOTE,
      evidenceStatus: 'supported',
      isAmbiguous: false,
      ambiguityReason: '',
      confidence: 'high',
      entities: [],
      profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
    },
  ],
  glossary: [],
  moreClausesLikely: false,
});

function providerResponse(stopReason: string): Response {
  const body = {
    model: 'claude-sonnet-5-5',
    stop_reason: stopReason,
    content: [{ type: 'text', text: modelText }],
    usage: { input_tokens: 900, output_tokens: 400 },
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;
let consoleSpies: MockInstance[] = [];

function printedText(): string {
  return consoleSpies
    .flatMap((spy) => spy.mock.calls.map((call) => JSON.stringify(call)))
    .join('\n');
}

async function analyze(env: object): Promise<{ status: number; body: string }> {
  const app = createApp(createDependencies());
  const text = JSON.stringify({ text: DOCUMENT, language: 'en' });
  const response = await app.request(
    '/v1/analyses',
    {
      method: 'POST',
      body: text,
      headers: {
        'content-type': 'application/json',
        'content-length': String(new TextEncoder().encode(text).byteLength),
        [INSTALL_ID_HEADER]: crypto.randomUUID(),
      },
    },
    env,
  );
  return { status: response.status, body: await response.text() };
}

function expectNothingLeaked(printed: string, responseBody = ''): void {
  for (const marker of FORBIDDEN) {
    expect(printed).not.toContain(marker);
  }
  for (const marker of [KEY_MARKER, PROVIDER_MARKER, 'x-api-key']) {
    expect(responseBody).not.toContain(marker);
  }
}

beforeEach(() => {
  consoleSpies = CONSOLE_METHODS.map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('logs never contain document content, keys, headers or provider bodies', () => {
  it('on a successful analysis', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(providerResponse('end_turn')));
    const result = await analyze({ ANTHROPIC_API_KEY: KEY_MARKER });
    expect(result.status).toBe(200);
    expect(printedText()).toContain('request_completed');
    expectNothingLeaked(printedText());
  });

  it('on a provider error whose body echoes secrets', async () => {
    const body = `${PROVIDER_MARKER} x-api-key: ${KEY_MARKER} ${DOCUMENT_MARKER}`;
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status: 500 })));
    const result = await analyze({ ANTHROPIC_API_KEY: KEY_MARKER });
    expect(result.status).toBe(502);
    expect(printedText()).toContain('provider_error');
    expectNothingLeaked(printedText(), result.body);
  });

  it('on a provider refusal', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(providerResponse('refusal')));
    const result = await analyze({ ANTHROPIC_API_KEY: KEY_MARKER });
    expect(result.status).toBe(422);
    expectNothingLeaked(printedText(), result.body);
  });

  it('on a network failure whose message contains secrets', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error(`${PROVIDER_MARKER} ${KEY_MARKER}`)));
    const result = await analyze({ ANTHROPIC_API_KEY: KEY_MARKER });
    expect(result.status).toBe(502);
    expectNothingLeaked(printedText(), result.body);
  });

  it('on an unexpected failure handled by the global error handler', async () => {
    const hostileEnv = new Proxy(
      { ANTHROPIC_API_KEY: KEY_MARKER },
      {
        get: () => {
          throw new Error(`${KEY_MARKER} ${DOCUMENT_MARKER}`);
        },
      },
    );
    const result = await analyze(hostileEnv);
    expect(result.status).toBe(502);
    expect(printedText()).toContain('request_failed');
    expectNothingLeaked(printedText(), result.body);
  });
});
