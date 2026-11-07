import { describe, it as test } from "node:test";
import { expect } from "./chart/test-expect";
import { addSignedOut, decideSync, parseSignedOut, SIGNED_OUT_KEEP, tokenClaims } from "./session-sync";

function token(sub: string, sid: string): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64({ sub, session_id: sid })}.sig`;
}

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const S1 = "aaaaaaaa-0000-0000-0000-000000000001";
const S2 = "aaaaaaaa-0000-0000-0000-000000000002";

describe("session sync across jenvu.com addresses", () => {
  test("reads user and session id from a token", () => {
    expect(tokenClaims(token(A, S1)).userId).toBe(A);
    expect(tokenClaims(token(A, S1)).sessionId).toBe(S1);
    expect(tokenClaims("garbage").sessionId).toBe(null);
  });

  test("homepage copy of a session signed out on the dashboard is dropped", () => {
    expect(decideSync({ localToken: token(A, S1), sharedToken: null, signedOut: [S1] })).toBe("drop-local");
  });

  test("a signed-out copy is never shared again", () => {
    expect(decideSync({ localToken: token(A, S1), sharedToken: null, signedOut: [S1] }) === "publish-local").toBe(false);
  });

  test("after sign-out then a new sign-in elsewhere, the new sign-in is taken", () => {
    expect(decideSync({ localToken: token(A, S1), sharedToken: token(B, S2), signedOut: [S1] })).toBe("adopt-shared");
  });

  test("an address with no session picks up a live shared sign-in", () => {
    expect(decideSync({ localToken: null, sharedToken: token(A, S1), signedOut: [] })).toBe("adopt-shared");
  });

  test("a shared sign-in that was signed out is not picked up", () => {
    expect(decideSync({ localToken: null, sharedToken: token(A, S1), signedOut: [S1] })).toBe("keep");
  });

  test("a live local sign-in with nothing shared is shared", () => {
    expect(decideSync({ localToken: token(A, S1), sharedToken: null, signedOut: [] })).toBe("publish-local");
  });

  test("same session on both sides stays as is", () => {
    expect(decideSync({ localToken: token(A, S1), sharedToken: token(A, S1), signedOut: [] })).toBe("keep");
  });

  test("marker keeps newest ids first, no repeats, capped", () => {
    const many = Array.from({ length: 20 }, (_, i) => `bbbbbbbb-0000-0000-0000-${String(i).padStart(12, "0")}`);
    const list = addSignedOut(many, S1, S1);
    expect(list[0]).toBe(S1);
    expect(list.length).toBe(SIGNED_OUT_KEEP);
    expect(parseSignedOut(list.join(".")).length).toBe(SIGNED_OUT_KEEP);
  });
});
