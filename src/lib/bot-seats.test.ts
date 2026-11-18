import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { botOffer, holdsBotSeat, priceFor } from "./bot-seats";

describe("JX Bot in every paid plan", () => {
  it("prices Pro $69, Elite $139, Ultra $239", () => {
    expect([priceFor("pro"), priceFor("elite"), priceFor("ultra")]).toEqual([69, 139, 239]);
  });

  it("charges the same price with or without the bot flag", () => {
    expect(priceFor("pro", false)).toBe(69);
  });

  it("includes JX Bot with every plan purchase, with no seat limit", () => {
    expect(botOffer({ holder: false })).toEqual({ withBot: true, newSeat: false });
    expect(botOffer({ holder: true })).toEqual({ withBot: true, newSeat: false });
  });

  it("treats only active paid plans as bot holders", () => {
    const sub = { plan_id: "pro", status: "active", is_trial: false, bot_included: true };
    expect(holdsBotSeat(sub)).toBe(true);
    expect(holdsBotSeat({ ...sub, plan_id: "free" })).toBe(false);
    expect(holdsBotSeat({ ...sub, is_trial: true })).toBe(false);
    expect(holdsBotSeat(null)).toBe(false);
  });
});
