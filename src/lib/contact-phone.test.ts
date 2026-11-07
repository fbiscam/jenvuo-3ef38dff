import { describe, it } from "bun:test";
import { expect } from "./chart/test-expect";
import { isValidWhatsApp } from "./contact-phone";

describe("isValidWhatsApp", () => {
  it("rejects an empty number (field is required)", () => {
    expect(isValidWhatsApp("")).toBe(false);
  });
  it("accepts an international number", () => {
    expect(isValidWhatsApp("+92 300 1234567")).toBe(true);
  });
  it("rejects letters", () => {
    expect(isValidWhatsApp("call me")).toBe(false);
  });
  it("rejects too few digits", () => {
    expect(isValidWhatsApp("12345")).toBe(false);
  });
});
