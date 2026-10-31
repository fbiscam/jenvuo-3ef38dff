import { describe, expect, it } from "vitest";
import { checkTurnstile, TURNSTILE_FAILED, TURNSTILE_MISSING } from "./turnstile";

const fakeFetch = (success: boolean) =>
  (async () => new Response(JSON.stringify({ success }))) as unknown as typeof fetch;

describe("checkTurnstile", () => {
  it("rejects a missing token when the check is on", async () => {
    expect(await checkTurnstile({ secret: "s", token: "", fetchImpl: fakeFetch(true) })).toEqual({ ok: false, error: TURNSTILE_MISSING });
  });
  it("rejects a token Cloudflare says is invalid", async () => {
    expect(await checkTurnstile({ secret: "s", token: "t", fetchImpl: fakeFetch(false) })).toEqual({ ok: false, error: TURNSTILE_FAILED });
  });
  it("accepts a token Cloudflare confirms", async () => {
    expect(await checkTurnstile({ secret: "s", token: "t", fetchImpl: fakeFetch(true) })).toEqual({ ok: true });
  });
  it("is off until a secret is configured", async () => {
    expect(await checkTurnstile({ secret: undefined, token: null })).toEqual({ ok: true });
  });
});
