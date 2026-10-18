import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { apexRedirectTarget, rewriteInput } from "./url-rewrite";

describe("section hosts never swallow global pages", () => {
  it("support.jenvu.com/docs goes to jenvu.com/docs instead of a help 404", () => {
    expect(apexRedirectTarget(new URL("https://support.jenvu.com/docs"))).toBe("https://jenvu.com/docs");
  });

  it("support.jenvu.com/docs is not rewritten into the help section", () => {
    expect(rewriteInput(new URL("https://support.jenvu.com/docs"))).toBeUndefined();
  });

  it("blogs.jenvu.com/search goes to jenvu.com/search", () => {
    expect(apexRedirectTarget(new URL("https://blogs.jenvu.com/search"))).toBe("https://jenvu.com/search");
  });

  it("help articles still resolve on support.jenvu.com", () => {
    expect(rewriteInput(new URL("https://support.jenvu.com/getting-started"))?.pathname).toBe("/help/getting-started");
  });
});
