import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { pickAnnouncement, type Announcement } from "./announcements";

const a = (id: string, kind: Announcement["kind"], created_at: string, active = true): Announcement => ({
  id, kind, title: id, body: null, link_url: null, link_label: null, active, created_at,
});

describe("pickAnnouncement", () => {
  it("keeps showing a notice until the user dismisses it", () => {
    const list = [a("bot", "bot", "2026-10-30T10:00:00Z")];
    expect(pickAnnouncement(list, [])?.id).toBe("bot");
    expect(pickAnnouncement(list, ["bot"])).toBeNull();
  });
  it("never shows a notice the admin turned off", () => {
    expect(pickAnnouncement([a("old", "update", "2026-10-30T10:00:00Z", false)], [])).toBeNull();
  });
  it("shows an issue before a newer update", () => {
    const list = [a("issue", "issue", "2026-10-29T10:00:00Z"), a("upd", "update", "2026-10-30T10:00:00Z")];
    expect(pickAnnouncement(list, [])?.id).toBe("issue");
  });
  it("shows the next notice once the first is dismissed", () => {
    const list = [a("issue", "issue", "2026-10-29T10:00:00Z"), a("upd", "update", "2026-10-30T10:00:00Z")];
    expect(pickAnnouncement(list, ["issue"])?.id).toBe("upd");
  });
});
