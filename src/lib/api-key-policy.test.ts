import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { apiKeyAllowsModel, apiKeyExpired, apiKeyTokensExhausted, validateApiKeyOptions } from "./api-key-policy";

describe("API key model selection and expiry", () => {
  test("only ticked models are allowed", () => {
    const options = validateApiKeyOptions({ allowedModels: ["gpt-5.5", "claude-opus-5"] });
    assert.equal(apiKeyAllowsModel(options.allowedModels, "gpt-5.5"), true);
    assert.equal(apiKeyAllowsModel(options.allowedModels, "claude-opus-5"), true);
    assert.equal(apiKeyAllowsModel(options.allowedModels, "deepseek-v3.2"), false);
  });
  test("all models and no expiry remain the default", () => {
    assert.deepEqual(validateApiKeyOptions({}), { allowedModels: null, expiresAt: null, rpmLimit: null, tokenLimit: null });
    assert.equal(apiKeyAllowsModel(null, "deepseek-v3.2"), true);
    assert.equal(apiKeyExpired(null), false);
  });
  test("key stops exactly at the selected expiry", () => {
    const expiry = "2026-11-27T14:17:00.000Z";
    assert.equal(apiKeyExpired(expiry, Date.parse(expiry) - 1), false);
    assert.equal(apiKeyExpired(expiry, Date.parse(expiry)), true);
  });
  test("empty or unknown model selections cannot bypass restrictions", () => {
    assert.throws(() => validateApiKeyOptions({ allowedModels: [] }));
    assert.throws(() => validateApiKeyOptions({ allowedModels: ["private-model"] }));
  });
  test("past expiry cannot create a usable key", () => {
    assert.throws(() => validateApiKeyOptions({ expiresAt: "2026-11-26T14:17:00Z" }, Date.parse("2026-11-26T14:17:00Z")));
  });
});
test("token limit reached once usage meets the limit", () => {
  assert.equal(apiKeyTokensExhausted(1000, 999), false);
  assert.equal(apiKeyTokensExhausted(1000, 1000), true);
  assert.equal(apiKeyTokensExhausted(null, 5_000_000), false);
});

test("rpm and token limits validated", () => {
  assert.equal(validateApiKeyOptions({ rpmLimit: 30, tokenLimit: 500000 }).rpmLimit, 30);
  assert.throws(() => validateApiKeyOptions({ rpmLimit: 0 }));
  assert.throws(() => validateApiKeyOptions({ tokenLimit: 1.5 }));
});
