import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { apexRedirectTarget, rewriteInput, rewriteOutput } from "./url-rewrite";

describe("section hosts never swallow global pages", () => {
  it("support.jenvu.com/docs goes to jenvu.com/docs instead of a help 404", () => {
    expect(apexRedirectTarget(new URL("https://support.jenvu.com/docs"))).toBe("https://jenvu.com/docs");
  });

  it("support.jenvu.com/docs is not rewritten into the help section", () => {
    expect(rewriteInput(new URL("https://support.jenvu.com/docs"))).toBe(undefined);
  });

  it("blogs.jenvu.com/search goes to jenvu.com/search", () => {
    expect(apexRedirectTarget(new URL("https://blogs.jenvu.com/search"))).toBe("https://jenvu.com/search");
  });

  it("help articles still resolve on support.jenvu.com", () => {
    expect(rewriteInput(new URL("https://support.jenvu.com/getting-started"))?.pathname).toBe("/help/getting-started");
  });
});

describe("models page addresses", () => {
  it("jenvu.com/models stays on the public host without redirecting", () => {
    expect(apexRedirectTarget(new URL("https://jenvu.com/models"))).toBe(null);
    expect(rewriteInput(new URL("https://jenvu.com/models"))).toBe(undefined);
  });
  it("dash.jenvu.com/models stays on the dashboard host without redirecting", () => {
    expect(apexRedirectTarget(new URL("https://dash.jenvu.com/models"))).toBe(null);
  });
  it("support.jenvu.com/models goes to the public jenvu.com/models page", () => {
    expect(apexRedirectTarget(new URL("https://support.jenvu.com/models"))).toBe("https://jenvu.com/models");
  });
  it("dash.jenvu.com/models opens the dashboard Models page", () => {
    expect(rewriteInput(new URL("https://dash.jenvu.com/models"))?.pathname).toBe("/dashboard/models");
  });
  it("dashboard Models links and direct visits converge without a loop", () => {
    const source = new URL("https://jenvu.com/dashboard/models?view=all");
    const canonical = "https://dash.jenvu.com/models?view=all";
    expect(apexRedirectTarget(source)).toBe(canonical);
    expect(rewriteOutput(source)?.href).toBe(canonical);
    expect(apexRedirectTarget(new URL(canonical))).toBe(null);
    expect(rewriteInput(new URL(canonical))?.href).toBe("https://dash.jenvu.com/dashboard/models?view=all");
  });
  it("dashboard-host navigation exposes Models at the clean dashboard address", () => {
    expect(rewriteOutput(new URL("https://dash.jenvu.com/dashboard/models"))?.href).toBe("https://dash.jenvu.com/models");
  });
  it("other dashboard children and public pages keep their existing hosts", () => {
    expect(apexRedirectTarget(new URL("https://jenvu.com/billing"))).toBe("https://dash.jenvu.com/billing");
    expect(apexRedirectTarget(new URL("https://dash.jenvu.com/pricing"))).toBe("https://jenvu.com/pricing");
  });
});
