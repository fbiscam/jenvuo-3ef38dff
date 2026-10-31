import { describe, expect, it } from "vitest";
import { themeSkipsHtml } from "./site-theme";

describe("site theme", () => {
  it("leaves dashboard pages to their own black/white switch", () => {
    expect(themeSkipsHtml("/dashboard/usage")).toBe(true);
  });
  it("applies the black theme to public pages", () => {
    expect(themeSkipsHtml("/pricing")).toBe(false);
  });
});
