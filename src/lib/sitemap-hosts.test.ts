import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { entriesForOrigin, robotsTxtForHost, sitemapOriginForHost } from "./sitemap-hosts";

describe("per-host sitemaps", () => {
  it("blog, help and status hosts list only their own pages", () => {
    expect(sitemapOriginForHost("blogs.jenvu.com")).toBe("https://blogs.jenvu.com");
    expect(sitemapOriginForHost("support.jenvu.com:443")).toBe("https://support.jenvu.com");
    expect(sitemapOriginForHost("status.jenvu.com")).toBe("https://status.jenvu.com");
  });

  it("jenvu.com and any other host use the main site", () => {
    expect(sitemapOriginForHost("jenvu.com")).toBe("https://jenvu.com");
    expect(sitemapOriginForHost("jenvuo.lovable.app")).toBe("https://jenvu.com");
  });

  it("filters entries to the host's origin", () => {
    const entries = [{ path: "/" }, { path: "/a", origin: "https://blogs.jenvu.com" }, { path: "/b", origin: "https://support.jenvu.com" }];
    expect(entriesForOrigin(entries, "https://jenvu.com").map((e) => e.path)).toEqual(["/"]);
    expect(entriesForOrigin(entries, "https://blogs.jenvu.com").map((e) => e.path)).toEqual(["/a"]);
  });

  it("robots.txt points each host at its own sitemap", () => {
    expect(robotsTxtForHost("blogs.jenvu.com")).toContain("Sitemap: https://blogs.jenvu.com/sitemap.xml");
    expect(robotsTxtForHost("jenvu.com")).toContain("Sitemap: https://jenvu.com/sitemap.xml");
    expect(robotsTxtForHost("jenvu.com")).toContain("Disallow: /jenvu-ops-x9k2");
  });
});
