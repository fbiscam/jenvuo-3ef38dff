import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { PLAN_API_KEYS } from "./free-plan";

describe("API keys per plan", () => {
  it("Free gets 1 key", () => expect(PLAN_API_KEYS.free).toBe(1));
  it("Pro gets 3 keys", () => expect(PLAN_API_KEYS.pro).toBe(3));
  it("Elite gets 5 keys", () => expect(PLAN_API_KEYS.elite).toBe(5));
  it("Ultra gets 7 keys", () => expect(PLAN_API_KEYS.ultra).toBe(7));
});
