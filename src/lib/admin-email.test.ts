import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { adminEmailInput, boxSender } from "./admin-email";

const base = { box: "support", subject: "Hi", body: "Hello" };

describe("admin email box", () => {
  it("support replies go to support@jenvu.com", () => {
    expect(boxSender("support").replyTo).toBe("support@jenvu.com");
  });
  it("sales replies go to sales@jenvu.com", () => {
    expect(boxSender("sales").replyTo).toBe("sales@jenvu.com");
  });
  it("accepts one address", () => {
    expect(adminEmailInput.safeParse({ ...base, to: "A@Example.com" }).success).toBe(true);
  });
  it("rejects several addresses in one send", () => {
    expect(adminEmailInput.safeParse({ ...base, to: "a@x.com, b@y.com" }).success).toBe(false);
  });
  it("rejects an unknown box", () => {
    expect(adminEmailInput.safeParse({ ...base, box: "billing", to: "a@x.com" }).success).toBe(false);
  });
});
