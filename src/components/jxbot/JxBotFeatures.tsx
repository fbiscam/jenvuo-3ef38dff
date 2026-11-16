import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT, FREE_BOT } from "@/lib/mt5-licenses";
import { Check, ArrowUpRight, ShieldCheck, Clock3, Monitor, CirclePause, TrendingUp } from "lucide-react";
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
    <article className="jx-feature-card">
      <div className="jx-feature-copy">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="jx-feature-visual">{children}</div>
    </article>
  );
}

function WindowBar({ title }: { title: string }) {
  return (
    <div className="jx-window-bar">
      <div className="jx-window-dots" aria-hidden="true"><i /><i /><i /></div>
      <span>{title}</span><Monitor size={13} />
    </div>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return <div className="jx-check-row"><span className="jx-check-icon"><Check size={12} strokeWidth={3} /></span><span>{children}</span><span className="jx-row-line" /></div>;
}

function WorksCard() {
  return (
    <Card title="Works inside MetaTrader 5" text="Add your PC or RDP's IP once. The bot checks it with Jenvu on start and trades only while the IP and your plan match.">
      <div className="jx-note"><JxFace className="size-5" /><div><div className="jx-note-byline">JX Bot <span>Just now</span></div><p>IP verified. Your MetaTrader workspace is ready.</p></div></div>
      <div className="jx-preview-window">
        <WindowBar title="MetaTrader 5" />
        <div className="jx-preview-heading"><span>Account connection</span><span className="jx-status-pill"><ShieldCheck size={12} /> Verified</span></div>
        <div className="jx-check-list"><CheckRow>Registered IP</CheckRow><CheckRow>MT5 account linked</CheckRow><CheckRow>Plan matched</CheckRow><CheckRow>EUR/USD · M15</CheckRow></div>
      </div>
    </Card>
  );
}

function CandlesCard() {
  return (
    <Card title="Checks every candle" text="It follows the H1 trend and skips wide spreads, weak candles and sudden spikes, so some days have fewer trades.">
      <div className="jx-scanner-stage"><div className="jx-preview-window">
        <WindowBar title="Candle scanner" />
        <div className="jx-preview-heading"><span>EUR/USD <small>M15</small></span><span className="jx-status-pill"><TrendingUp size={12} /> H1 trend</span></div>
        <svg className="jx-candle-chart" viewBox="0 0 420 125" role="img" aria-label="Illustrative EUR/USD candle scan">
          {[25,55,85,115].map(y => <path key={y} d={`M0 ${y} H420`} className="jx-chart-grid" />)}
          {[82,94,72,78,55,64,40,49,28,35,18].map((y,i) => <g key={i} className={i % 3 === 1 ? 'jx-candle-down' : 'jx-candle-up'}><path d={`M${20+i*37} ${y-15} v48`} /><rect x={13+i*37} y={y} width="14" height={i%3===1 ? 19 : 25} rx="2" /></g>)}
          <path className="jx-chart-scan" d="M385 0 V125" />
        </svg>
        <div className="jx-scanner-footer"><span><Check size={13} /> Closed candle</span><span><Check size={13} /> Spread filter</span></div>
      </div></div>
    </Card>
  );
}

function StopCard() {
  return (
    <Card title="Stops at your target" text={`Free stops at $${FREE_BOT.dailyTargetUsd}; Pro at ${DAILY_TARGET_PCT.pro}%, Elite at ${DAILY_TARGET_PCT.elite}% and Ultra at ${DAILY_TARGET_PCT.ultra}% of each account's day-start balance. The ${DAILY_DRAWDOWN_PCT}% drawdown guard protects the day's peak closed balance.`}>
      <div className="jx-target-stage">
        <div className="jx-target-bubble">Daily target reached <Check size={14} /></div>
        <div className="jx-guard-caption"><ShieldCheck size={15} /> Your limits stay in control</div>
        <div className="jx-target-panel"><div className="jx-preview-heading"><span>Daily safety cap</span><span className="jx-status-pill">Pro · {DAILY_TARGET_PCT.pro}%</span></div><div className="jx-target-progress"><span /></div><div className="jx-target-bottom"><div><strong>Trading paused</strong><p>No new trades today</p></div><CirclePause size={27} /></div></div>
        <div className="jx-guard-footer"><ShieldCheck size={13} /> {DAILY_DRAWDOWN_PCT}% drawdown protection</div>
      </div>
    </Card>
  );
}

function HoursCard() {
  return (
    <Card title="Trades at safe hours" text="New entries stay in the Asia and London sessions. The London open is blocked, New York entries are off, and existing trades continue to be managed.">
      <div className="jx-preview-window jx-schedule-window"><WindowBar title="Session schedule · UTC" /><div className="jx-preview-heading"><span><Clock3 size={14} /> Trading windows</span><span className="jx-status-pill">Session guard</span></div>
        <div className="jx-session-row"><span className="jx-session-icon"><Clock3 size={15} /></span><div><strong>Asia</strong><p>Entry window</p></div><span className="jx-session-tag">Allowed</span></div>
        <div className="jx-session-row"><span className="jx-session-icon"><Clock3 size={15} /></span><div><strong>London</strong><p>Open block · 06:15–09:00</p></div><span className="jx-session-tag">Filtered</span></div>
        <div className="jx-session-row"><span className="jx-session-icon"><CirclePause size={15} /></span><div><strong>New York</strong><p>No entries · 12:00–23:00</p></div><span className="jx-session-tag">Off</span></div>
        <div className="jx-schedule-footer">Open trades remain managed <ArrowUpRight size={13} /></div>
      </div>
    </Card>
  );
}

export function JxBotFeatures() {
  return (
    <section className="jx-features px-5 py-14" aria-labelledby="jx-features-title">
      <h2 id="jx-features-title" className="text-center text-[30px] font-medium text-foreground md:text-[36px]">Everything you'd want in a trading bot</h2>
      <p className="mx-auto mt-4 max-w-[650px] text-center text-[17px] leading-relaxed text-foreground md:text-[18px]">
        Download the bot, add your IP and let it run. Each IP works with one MT5 account, and your dashboard shows every
        trade, the daily target & ON/OFF log.
      </p>
      <div className="mx-auto mt-12 grid max-w-[1200px] gap-6 md:grid-cols-2 md:gap-8">
        <WorksCard />
        <CandlesCard />
        <StopCard />
        <HoursCard />
      </div>
      <p className="jx-feature-disclaimer">Illustrative previews · not live account data. Daily profit targets are maximum safety caps — profit is not guaranteed.</p>
    </section>
  );
}
