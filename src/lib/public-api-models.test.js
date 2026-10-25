import { describe, expect, test } from 'bun:test';
import { PUBLIC_API_MODEL_IDS, gatewayChainFor, resolvePublicModel } from './public-api-models';

describe('Jenvu API model routing', () => {
  test('every advertised model routes only to the same CodeCraft model', () => {
    for (const id of PUBLIC_API_MODEL_IDS) {
      expect(resolvePublicModel(id)).toBe(id);
      expect(gatewayChainFor(id)).toEqual([`codecraft/${id}`]);
    }
    expect(PUBLIC_API_MODEL_IDS).toContain('claude-opus-5.5');
    expect(PUBLIC_API_MODEL_IDS).toContain('gpt-5.6-terra');
  });
  test('unknown models cannot inject an arbitrary upstream route', () => {
    expect(resolvePublicModel('codecraft/private-model')).toBeNull();
    expect(resolvePublicModel('https://example.com')).toBeNull();
    expect(resolvePublicModel('jenvu-pro')).toBe('claude-opus-5');
  });
});