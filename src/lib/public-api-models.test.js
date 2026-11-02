import { describe, expect, test } from 'bun:test';
import { AWS_MODEL_MAP, PUBLIC_API_MODEL_IDS, gatewayChainFor, resolvePublicModel } from './public-api-models';

describe('Jenvu API model routing', () => {
  test('every advertised model routes to exactly one upstream model', () => {
    for (const id of PUBLIC_API_MODEL_IDS) {
      expect(resolvePublicModel(id)).toBe(id);
      const aws = AWS_MODEL_MAP[id];
      expect(gatewayChainFor(id)).toEqual([aws ? `aws/${aws}` : `codecraft/${id}`]);
    }
    expect(PUBLIC_API_MODEL_IDS).toContain('claude-opus-5.5');
    expect(PUBLIC_API_MODEL_IDS).toContain('gpt-5.6-terra');
  });
  test('AWS models route to their AWS id', () => {
    expect(gatewayChainFor('deepseek-v3.2')).toEqual(['aws/deepseek.v3.2']);
    expect(gatewayChainFor('qwen3-coder-480b')).toEqual(['aws/qwen.qwen3-coder-480b-a35b-instruct']);
  });
  test('a request with no model uses DeepSeek V3.2', () => {
    expect(resolvePublicModel('')).toBe('deepseek-v3.2');
  });
  test('unknown models cannot inject an arbitrary upstream route', () => {
    expect(resolvePublicModel('codecraft/private-model')).toBeNull();
    expect(resolvePublicModel('https://example.com')).toBeNull();
    expect(resolvePublicModel('jenvu-pro')).toBe('claude-opus-5');
  });
});
