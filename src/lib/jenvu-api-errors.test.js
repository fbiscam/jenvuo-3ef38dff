import { afterEach, describe, expect, test } from 'bun:test';
// Query suffix bypasses module mocks registered by other test files in the same process.
const { callChatCompletion, AiGatewayError } = await import('./ai-gateway?real');
import { jenvuServiceError } from './jenvu-api-errors';

const originalFetch = globalThis.fetch;
const originalKey = process.env.CODECRAFT_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.CODECRAFT_API_KEY;
  else process.env.CODECRAFT_API_KEY = originalKey;
});

describe('Jenvu service privacy', () => {
  for (const status of [400, 401, 402, 403, 404, 429, 500, 502, 503, 504]) {
    test(`upstream ${status} preserves status without leaking diagnostics`, async () => {
      process.env.CODECRAFT_API_KEY = 'test-only-credential';
      let requests = 0;
      globalThis.fetch = (async () => {
        requests++;
        return new Response('CodeCraft OmniRoute secret internal credit diagnostic', { status });
      });
      try {
        await callChatCompletion({ models: ['codecraft/gpt-5.5'], messages: [{ role: 'user', content: 'Hello' }], retriesPerModel: 1 });
        throw new Error('Expected upstream failure');
      } catch (error) {
        expect(error).toBeInstanceOf(AiGatewayError);
        if (!(error instanceof AiGatewayError)) throw error;
        expect(error.status).toBe(status);
        expect(error.message).toBe(jenvuServiceError(status));
        expect(error.message).not.toMatch(/codecraft|omniroute|secret|internal|https:/i);
        expect(requests).toBe(1);
      }
    });
  }
  test('credit exhaustion stops instead of trying another model', async () => {
    process.env.CODECRAFT_API_KEY = 'test-only-credential';
    let requests = 0;
    globalThis.fetch = (async () => { requests++; return new Response('', { status: 402 }); });
    await expect(callChatCompletion({ models: ['codecraft/claude-opus-5', 'codecraft/gpt-5.5'], messages: [{ role: 'user', content: 'Hello' }] })).rejects.toMatchObject({ status: 402 });
    expect(requests).toBe(1);
  });
});