import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { BOT_SEATS_PER_MONTH, botOffer, holdsBotSeat, priceFor, seatsLeft } from "./bot-seats";

describe("JX Bot monthly seats", () => {
  it("has 50 seats a month", () => {
    expect(BOT_SEATS_PER_MONTH).toBe(50);
  });

  it("prices plans with the bot at 29/59/99", () => {
    expect([priceFor("pro", true), priceFor("elite", true), priceFor("ultra", true)]).toEqual([29, 59, 99]);
  });

  it("prices plans without the bot at 19/39/59", () => {
    expect([priceFor("pro", false), priceFor("elite", false), priceFor("ultra", false)]).toEqual([19, 39, 59]);
  });

  it("gives the 50th buyer a seat and the 51st none", () => {
    expect(botOffer({ holder: false, taken: 49 })).toEqual({ withBot: true, newSeat: true });
    expect(botOffer({ holder: false, taken: 50 })).toEqual({ withBot: false, newSeat: false });
  });

  it("lets a bot holder renew with the bot without using a seat, even when seats are full", () => {
    expect(botOffer({ holder: true, taken: 50 })).toEqual({ withBot: true, newSeat: false });
  });

  it("counts seats left, never below zero", () => {
    expect(seatsLeft(12)).toBe(38);
    expect(seatsLeft(70)).toBe(0);
  });

  it("treats only active paid plans bought with the bot as holders", () => {
    const sub = { plan_id: "pro", status: "active", is_trial: false, bot_included: true };
    expect(holdsBotSeat(sub)).toBe(true);
    expect(holdsBotSeat({ ...sub, bot_included: false })).toBe(false);
    expect(holdsBotSeat({ ...sub, plan_id: "free" })).toBe(false);
    expect(holdsBotSeat({ ...sub, is_trial: true })).toBe(false);
    expect(holdsBotSeat(null)).toBe(false);
  });
});
