import { describe, expect, it } from "vitest";
import { isFoundingMember, jxBotAction } from "./founding-bot";

describe("JX Bot page button", () => {
  it("asks non-members to apply for the Founding Program", () => {
    expect(jxBotAction({ state: "none", allowed: false, viaFounding: false })).toEqual({ label: "Apply for Founding Program", to: "/founding" });
  });
  it("shows Upgrade to members on their free Founding month", () => {
    expect(jxBotAction({ state: "active", allowed: true, viaFounding: true })?.label).toBe("Upgrade");
  });
  it("shows Buy now to members whose Founding month ended", () => {
    expect(jxBotAction({ state: "locked", allowed: false, viaFounding: false })?.label).toBe("Buy now");
  });
  it("sends members without a verified ID to upload it", () => {
    expect(jxBotAction({ state: "awaiting_id", allowed: false, viaFounding: false })?.to).toBe("/dashboard/documents");
  });
  it("treats only approved applicants as members", () => {
    expect(isFoundingMember("none")).toBe(false);
    expect(isFoundingMember(null)).toBe(false);
    expect(isFoundingMember("locked")).toBe(true);
  });
});
