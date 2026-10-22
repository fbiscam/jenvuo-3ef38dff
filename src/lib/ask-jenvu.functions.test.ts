import { beforeEach, describe, expect, mock, test } from "bun:test";

// Exercise the real handler without making provider requests or requiring a session.
mock.module("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (validate: (data: unknown) => unknown) => ({
      handler: (handler: (input: { data: unknown }) => unknown) =>
        (input: { data: unknown }) => handler({ data: validate(input.data) }),
    }),
  }),
}));
const optionalUser = mock(async (): Promise<string | null> => null);
const limit = mock((_key: string) => ({ allowed: true, retryInSec: 0 }));
const completion = mock(async (_input: unknown) => ({
  content: "Available plans.\n<<FOLLOWUPS>> Plans | Trial | Founding\n<<AGENT>> no\n<<SALES>> yes",
}));
mock.module("@/lib/optional-auth.server", () => ({ getOptionalUserId: optionalUser }));
mock.module("@tanstack/react-start/server", () => ({
  getRequestHeader: (name: string) => name === "cf-connecting-ip" ? "192.0.2.10" : undefined,
}));
mock.module("@/lib/ask-jenvu-knowledge.server", () => ({ getRelevantJenvuKnowledge: () => "Public Jenvu knowledge" }));
mock.module("@/lib/ai-gateway", () => ({
  checkAnalyzeRateLimit: limit,
  callChatCompletion: completion,
  ASK_JENVU_CHAIN: ["configured-model"],
  AiGatewayError: class extends Error {},
}));
const { askJenvu } = await import("./ask-jenvu.functions");
const question = { data: { messages: [{ role: "user" as const, content: "What are the plans?" }] } };

beforeEach(() => {
  optionalUser.mockClear();
  optionalUser.mockResolvedValue(null);
  limit.mockClear();
  limit.mockReturnValue({ allowed: true, retryInSec: 0 });
  completion.mockClear();
});

describe("Ask Jenvu public access", () => {
  test("answers visitors without a session using the anonymous IP bucket", async () => {
    const result = await askJenvu(question);
    expect(result.ok).toBe(true);
    expect(completion).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith("ask-jenvu:anon:192.0.2.10");
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