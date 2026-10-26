import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

// Exercise the real handler without making provider requests or requiring a session.
mock.module("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (validate) => ({
      handler: (handler) =>
        (input) => handler({ data: validate(input.data) }),
    }),
  }),
}));
const optionalUser = mock(async () => null);
const limit = mock((_key) => ({ allowed: true, retryInSec: 0 }));
const completion = mock(async (_input) => ({
  content: "Available plans.\n<<FOLLOWUPS>> Plans | Trial | Founding\n<<AGENT>> no\n<<SALES>> yes",
}));
mock.module("@/lib/optional-auth.server", () => ({ getOptionalUserId: optionalUser }));
mock.module("@tanstack/react-start/server", () => ({
  getRequestHeader: (name) => name === "cf-connecting-ip" ? "192.0.2.10" : undefined,
}));
mock.module("@/lib/ask-jenvu-knowledge.server", () => ({ getRelevantJenvuKnowledge: () => "Public Jenvu knowledge" }));
mock.module("@/lib/ai-gateway", () => ({
  checkAnalyzeRateLimit: limit,
  callChatCompletion: completion,
  ASK_JENVU_CHAIN: ["configured-model"],
  AiGatewayError: class extends Error {},
}));
const { askJenvu } = await import("./ask-jenvu.functions");

// Module mocks leak into other test files in the same process; restore them.
afterAll(() => mock.restore());
const question = { data: { messages: [{ role: "user", content: "What are the plans?" }] } };

beforeEach(() => {
  optionalUser.mockClear();
  optionalUser.mockResolvedValue(null);
  limit.mockClear();
  limit.mockReturnValue({ allowed: true, retryInSec: 0 });
  completion.mockClear();
});

describe("Ask Jenvu public access", () => {
  test("asks visitors without a session to sign in before chatting", async () => {
    const result = await askJenvu(question);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Please sign in to chat with Ask Jenvu.");
    expect(completion).not.toHaveBeenCalled();
  });
  test("retains the signed-in user's existing bucket", async () => {
    optionalUser.mockResolvedValue("user-123");
    expect((await askJenvu(question)).ok).toBe(true);
    expect(limit).toHaveBeenCalledWith("ask-jenvu:user-123:192.0.2.10");
  });
  test("blocks AI requests when the existing visitor limiter denies access", async () => {
    limit.mockReturnValue({ allowed: false, retryInSec: 60 });
    expect((await askJenvu(question)).ok).toBe(false);
    expect(completion).not.toHaveBeenCalled();
  });
});