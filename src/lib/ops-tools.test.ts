import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { opsToolHref } from "./ops-tools";

describe("Ops Console tool addresses", () => {
  it("opens tools on the main site when on the dashboard address", () => {
    expect(opsToolHref("founding", "", "dash.jenvu.com")).toBe("https://jenvu.com/ops-x9k2-7m4n/founding");
  });
  it("keeps the Email box reply details", () => {
    expect(opsToolHref("emails", "?to=a%40b.com", "dash.jenvu.com")).toBe("https://jenvu.com/ops-x9k2-7m4n/emails?to=a%40b.com");
  });
  it("stays on the same address on the main site and in preview", () => {
    expect(opsToolHref("documents", "", "jenvu.com")).toBe("/ops-x9k2-7m4n/documents");
    expect(opsToolHref("documents", "", "id-preview--x.lovable.app")).toBe("/ops-x9k2-7m4n/documents");
  });
});
