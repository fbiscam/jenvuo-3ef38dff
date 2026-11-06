import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import * as React from "react";

/* JX Bot feature cards ("Works inside MetaTrader 5" + 3 more) — shared by /jx-bot and the homepage. */

/** JX Bot mascot: round face with two slanted, blinking eyes. */
export function JxFace({ className = "", eyes = "bg-background" }: { className?: string; eyes?: string }) {
  return (
    <span className={`relative inline-block rounded-full ${/(^| )bg-/.test(className) ? "" : "bg-foreground"} ${className}`} aria-hidden>
      <span className={`jx-eye absolute left-[24%] top-[14%] h-[30%] w-[17%] rotate-[28deg] rounded-full ${eyes}`} />
      <span className={`jx-eye absolute left-[56%] top-[20%] h-[30%] w-[17%] rotate-[28deg] rounded-full ${eyes}`} />
    </span>
  );
}

function Card({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[22px] bg-gc-surface">
      <div className="p-7 md:p-8">
        <h3 className="text-[16px] font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-foreground/80">{text}</p>
      </div>
      <div className="relative mt-auto h-[260px] px-7 md:px-8">{children}</div>
    </div>
  );
}

const aurora = "bg-[linear-gradient(135deg,oklch(0.75_0.12_30),oklch(0.7_0.08_150),oklch(0.55_0.08_220))]";
const aurora2 = "bg-[linear-gradient(180deg,oklch(0.6_0.1_240),oklch(0.78_0.1_20))]";

function MiniScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-[10%] bottom-0 top-8 rounded-t-lg bg-background p-3 shadow-lg">
      <div className="mb-2 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
      </div>
      {children}
    </div>
  );
}

function WorksCard() {
  return (
    <Card title="Works inside MetaTrader 5" text="Add your PC or RDP's IP once. The bot checks it with Jenvu on start and trades only while the IP and your plan match.">
      <div className="h-full overflow-hidden rounded-t-2xl bg-muted">
        <div className="flex items-center justify-between px-4 pt-3 text-[13px]">
          <span className="font-medium text-foreground">MetaTrader 5</span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[12px] text-amber-800">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Checking
          </span>
        </div>
        <p className="px-4 pt-1 text-[13px] text-foreground/80">Jenvu license: VALID · trading EUR/USD M15</p>
        <div className={`relative mx-4 mt-3 h-full overflow-hidden rounded-t-xl ${aurora}`}>
          <MiniScreen>
            {[70, 45, 60, 35, 55].map((w, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
                <span className="h-1.5 rounded-full bg-gc-line" style={{ width: `${w}%` }} />
              </div>
            ))}
          </MiniScreen>
        </div>
      </div>
    </Card>
  );
}

function CandlesCard() {
  const bars = [40, 25, 55, 35, 65, 45, 75, 58, 82];
  return (
    <Card title="Checks every candle" text="It follows the H1 trend and skips wide spreads, weak candles and sudden spikes, so some days have fewer trades.">
      <div className="h-full overflow-hidden rounded-t-2xl border border-gc-line bg-background">
        <div className="border-b border-gc-line px-4 py-2 text-[12px] text-muted-foreground">JX Bot is reading EUR/USD M15</div>
        <div className={`relative h-full ${aurora2}`}>
          <MiniScreen>
            <div className="flex h-[150px] items-end gap-2 px-2">
              {bars.map((h, i) => (
                <span key={i} className="jx-bar flex-1 rounded-sm bg-gc-line" style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </MiniScreen>
        </div>
      </div>
    </Card>
  );
}

function StopCard() {
  return (
    <Card title="Stops at your target" text={`It pauses for the day at ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, or the ${DAILY_DRAWDOWN_PCT}% drawdown guard, and stops for the month at the monthly target.`}>
      <div className="space-y-2 pt-4">
        <div className="jx-in max-w-[440px] rounded-2xl bg-muted px-4 py-3 text-[14px] text-foreground">
          Daily target reached on this account. No new trades.
        </div>
        <div className="jx-in max-w-[440px] rounded-2xl bg-muted px-4 py-3 text-[14px] text-foreground" style={{ animationDelay: "0.3s" }}>
          Drawdown guard is on at {DAILY_DRAWDOWN_PCT}%. Depends on balance.
        </div>
        <div className="pt-3 text-center text-[13px] text-muted-foreground md:max-w-[440px]">
          Status for <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">Paused · target hit</span>
        </div>
      </div>
    </Card>
  );
}

function HoursCard() {
  const tones = ["bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-orange-400"];
  return (
    <Card title="Trades at safe hours" text="New trades Mon–Thu 01:00–14:00 and Friday until 13:00 broker time. It skips the London and New York opens and weekends.">
      <div className="grid h-full place-items-center pb-10">
        <div className="flex items-center rounded-full border border-gc-line bg-background p-1 pr-3">
          {tones.map((t) => (
            <JxFace key={t} className={`jx-hop ml-1 h-8 w-8 first:ml-0 ${t}`} eyes="bg-white" />
          ))}
          <span className="jx-pulse-text ml-2 text-[13px] text-muted-foreground">Waiting for the next session…</span>
        </div>
      </div>
    </Card>
  );
}

export function JxBotFeatures() {
  return (
    <section className="px-5 py-14">
      <p className="mx-auto max-w-[620px] text-center text-[18px] leading-relaxed text-foreground md:text-[20px]">
        Download the bot, add your IP and let it run. Each IP works with one MT5 account, and your dashboard shows every
        trade, the daily target and an ON/OFF log.
      </p>
      <div className="mx-auto mt-14 grid max-w-[1110px] gap-5 md:grid-cols-2">
        <WorksCard />
        <CandlesCard />
        <StopCard />
        <HoursCard />
      </div>
    </section>
  );
}
