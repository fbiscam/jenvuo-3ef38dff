import type { ReactNode } from "react";

export type DocSection = { id: string; title: string; keywords?: string; body: ReactNode };
export type DocGroup = { title: string; sections: DocSection[] };

const Note = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border-l-4 border-gc-blue-deep bg-gc-sky px-4 py-3 text-[14px] text-gc-ink">{children}</div>
);

const Term = ({ t, children }: { t: string; children: ReactNode }) => (
  <div className="grid gap-1 border-b border-gc-line py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
    <dt className="font-medium text-gc-ink">{t}</dt>
    <dd>{children}</dd>
  </div>
);

export const DOC_GROUPS: DocGroup[] = [
  {
    title: "Get started",
    sections: [
      {
        id: "what-is-jenvu",
        title: "What is Jenvu",
        keywords: "overview introduction Fiber xauusd platform",
        body: (
          <>
            <p>
              Jenvu is an analysis platform built for one market: <strong>Fiber</strong>. It combines a live chart (the
              Terminal), chart markings based on ICT and Smart Money Concepts, an AI chat that explains what it sees, alerts, a demo
              trading account and a browser extension.
            </p>
            <p>The main parts of Jenvu are:</p>
            <ul>
              <li><strong>Terminal</strong> — the live Fiber chart with structure, zones, fair value gaps, sweeps and volume.</li>
              <li><strong>AI chat</strong> — ask questions about the chart and get a short, direct answer.</li>
              <li><strong>Dashboard</strong> — your account, usage, billing, API keys, notifications and settings.</li>
              <li><strong>Browser extension</strong> — Jenvu analysis next to the charts you already use.</li>
            </ul>
            <Note>Jenvu is an analysis tool. It is not financial advice and it never promises profits or fixed win rates.</Note>
          </>
        ),
      },
      {
        id: "create-account",
        title: "Create an account",
        keywords: "sign up register signup login sign in",
        body: (
          <>
            <ol>
              <li>Open <a href="https://auth.jenvu.com/sign-in">auth.jenvu.com/sign-in</a> and choose <strong>Sign up</strong>.</li>
              <li>Enter your name, email and a password, or continue with Google.</li>
              <li>Confirm your email using the link we send you.</li>
              <li>You land on your dashboard at <strong>dash.jenvu.com/overview</strong>.</li>
            </ol>
            <p>Sign-up is open to everyone. To prevent abuse, only two accounts can be created from the same device or network.</p>
          </>
        ),
      },
      {
        id: "free-trial",
        title: "Free trial",
        keywords: "trial credit pro 14 days $100 start free",
        body: (
          <>
            <p>
              New accounts can start a free trial that gives you <strong>$100 of AI credit</strong> and <strong>14 days of Pro</strong>.
            </p>
            <ol>
              <li>Sign in to your dashboard.</li>
              <li>In the blue banner at the top, click <strong>Start free</strong>.</li>
              <li>The credit and Pro access are added straight away.</li>
            </ol>
            <ul>
              <li>The trial starts only when you click — signing up alone does not start it.</li>
              <li>Each account can claim it once.</li>
              <li>It is not available while you already have an active paid plan.</li>
            </ul>
          </>
        ),
      },
      {
        id: "sign-in-out",
        title: "Signing in and out",
        keywords: "login logout session",
        body: (
          <>
            <p>
              One sign-in works across all Jenvu sites — the dashboard, Support and Insights. When you sign out from any of them you
              are signed out everywhere and returned to the sign-in page.
            </p>
            <p>Forgot your password? Use <strong>Forgot password</strong> on the sign-in page to get a reset link by email.</p>
          </>
        ),
      },
    ],
  },
  {
    title: "Accounts",
    sections: [
      {
        id: "dashboard",
        title: "Using the dashboard",
        keywords: "menu sidebar top bar search",
        body: (
          <>
            <p>
              The dashboard lives at <strong>dash.jenvu.com</strong>. The top bar has the menu button (☰), a search box to jump to
              any page, the notification bell and your profile picture.
            </p>
            <p>The menu stays closed until you open it with ☰. Close it with ✕, by tapping outside it or by pressing Escape.</p>
            <h3>Main pages</h3>
            <ul>
              <li><strong>Overview</strong> — welcome panel, shortcuts and your usage at a glance.</li>
              <li><strong>Terminal</strong> — the live Fiber chart and AI chat.</li>
              <li><strong>Usage</strong> — how much AI credit you have used.</li>
              <li><strong>API</strong> — create and manage API keys.</li>
              <li><strong>Billing</strong> — your plan, invoices and payment.</li>
              <li><strong>Notifications</strong>, <strong>Journal</strong>, <strong>Risk</strong>, <strong>Analytics</strong> and <strong>Referrals</strong>.</li>
              <li><strong>Profile</strong> and <strong>Security</strong> — your details, photo, password and two-step sign-in.</li>
            </ul>
          </>
        ),
      },
      {
        id: "profile",
        title: "Profile and photo",
        keywords: "avatar picture settings name",
        body: (
          <p>
            Click your profile picture in the top bar and choose <strong>Change profile photo</strong> or <strong>Settings</strong>.
            You can update your name and upload a new photo there.
          </p>
        ),
      },
      {
        id: "security",
        title: "Security and two-step sign-in",
        keywords: "2fa authenticator password mfa",
        body: (
          <>
            <p>Go to <strong>Security</strong> to change your password or turn on two-step sign-in with an authenticator app.</p>
            <ol>
              <li>Click <strong>Set up authenticator</strong>.</li>
              <li>Scan the QR code with Google Authenticator, Authy or a similar app.</li>
              <li>Enter the 6-digit code to finish.</li>
            </ol>
            <p>If setup is interrupted, simply start again — the unfinished attempt is removed automatically.</p>
          </>
        ),
      },
      {
        id: "notifications",
        title: "Notifications",
        keywords: "bell alerts messages",
        body: (
          <p>
            The bell in the top bar shows all your notifications with their full text. New ones appear instantly without reloading.
            A notification is marked as read when you move over it. The newest unread one may also appear as a strip at the top of
            the dashboard, which you can dismiss.
          </p>
        ),
      },
    ],
  },
  {
    title: "Terminal and chart",
    sections: [
      {
        id: "terminal-access",
        title: "Who can use the Terminal",
        keywords: "access locked founding program id verification",
        body: (
          <>
            <p>The Terminal is reserved for approved <strong>Founding Program</strong> members, free of cost. <strong>Pro, Elite and Ultra</strong> plans, the free trial and credit do not unlock it: plans cover <strong>JX Bot</strong> for MT5 and the <strong>Top AI Models</strong>, and every other page stays open.</p>
            <ul>
              <li>When your Founding application is approved, you get 3 months of your chosen plan and $250 credit straight away.</li>
              <li>You then have <strong>2 days</strong> to upload an identity document. Once submitted, access continues.</li>
              <li>If no document is submitted in time, the Terminal locks until you upload one.</li>
            </ul>
            <p>Apply at <a href="https://jenvu.com/founding">jenvu.com/founding</a>.</p>
          </>
        ),
      },
      {
        id: "price-feed",
        title: "Price feed and candles",
        keywords: "data source gate timeframe weekend candle timer",
        body: (
          <>
            <p>
              Candles come from a live price feed, with a backup source if the main one is
              unavailable. Small differences from your broker's chart are normal because every provider's prices differ slightly.
            </p>
            <ul>
              <li>Timeframes include 15M, 30M, 1H, 2H and 4H. 4H candles follow the same session times as TradingView.</li>
              <li>The chart shows the market as closed over the weekend.</li>
              <li>A timer shows how long until the current candle closes.</li>
              <li>Past candles and markings stay fixed — they don't move or redraw when you reload.</li>
            </ul>
          </>
        ),
      },
      {
        id: "structure",
        title: "Market structure (swings, BOS, CHoCH)",
        keywords: "hh hl lh ll swing bos choch fresh",
        body: (
          <>
            <p>Jenvu labels the swing points of price so you can see the trend at a glance:</p>
            <ul>
              <li><strong>HH / HL</strong> — higher high and higher low (uptrend).</li>
              <li><strong>LH / LL</strong> — lower high and lower low (downtrend).</li>
              <li><strong>BOS</strong> (break of structure) — price breaks a swing in the trend's direction.</li>
              <li><strong>CHoCH</strong> (change of character) — the first break against the trend; a possible reversal.</li>
            </ul>
            <p>
              A <strong>Fresh LH</strong> is only shown when a strong bearish candle creates a bearish fair value gap within five
              candles, so weak highs aren't labelled as fresh.
            </p>
            <p>You can switch <strong>Swing price action</strong> on or off from the chart menu.</p>
          </>
        ),
      },
      {
        id: "zones",
        title: "Supply and demand zones",
        keywords: "zone order block supply demand faded",
        body: (
          <>
            <p>
              Zones mark areas where price previously moved away strongly. <strong>Supply</strong> zones sit above price and
              <strong> demand</strong> zones below.
            </p>
            <ul>
              <li>The latest zone stays on the chart until price clearly invalidates it.</li>
              <li>Older zones can be shown faded if you turn that option on.</li>
              <li>Zones are for reading the chart only — they do not show entry, stop loss or take profit levels.</li>
            </ul>
          </>
        ),
      },
      {
        id: "fvg",
        title: "Fair value gaps (FVG)",
        keywords: "fvg imbalance gap",
        body: (
          <p>
            A fair value gap is a three-candle pattern where the middle candle moves so fast that the first and third candles don't
            overlap. Jenvu draws bullish and bearish FVGs and keeps them until price fills or breaks them. Older FVGs can be shown
            faded.
          </p>
        ),
      },
      {
        id: "sweeps",
        title: "Liquidity sweeps (BSL / SSL)",
        keywords: "sweep liquidity bsl ssl fakeout reversal",
        body: (
          <>
            <p>
              <strong>BSL</strong> (buy-side liquidity) rests above recent highs and <strong>SSL</strong> (sell-side liquidity)
              below recent lows. A sweep happens when price takes that level and then comes back.
            </p>
            <ul>
              <li>Jenvu checks the previous 10 closed candles for the level that was swept.</li>
              <li>Tiny pokes beyond the level are ignored to avoid fakeouts.</li>
              <li>A sweep is confirmed only when price closes back inside and reverses within 2 candles.</li>
              <li>Results show as confirmed, failed, late or no move. Works on 5M, 15M, 1H, 2H and 4H.</li>
              <li>Sweep and liquidity lines never overlap supply/demand zones.</li>
            </ul>
            <p>Turn <strong>Fresh sweep</strong> labels on or off from the chart menu. Sweeps are for reading only — they never set trade levels.</p>
          </>
        ),
      },
      {
        id: "volume",
        title: "Volume and RVOL",
        keywords: "volume rvol buy sell spike",
        body: (
          <>
            <p>The volume panel shows how active each candle was, with spikes highlighted.</p>
            <ul>
              <li><strong>RVOL</strong> compares a candle's volume with the average of the last 20 candles.</li>
              <li>The buy/sell split is an <strong>estimate</strong> based on where the candle closed in its range.</li>
            </ul>
            <Note>Fiber trades across many venues, so volume here is not the total market's real order flow. Use it as a guide only.</Note>
          </>
        ),
      },
    ],
  },
  {
    title: "JX Bot for MT5",
    sections: [
      {
        id: "jx-bot",
        title: "JX Bot",
        keywords: "mt5 metatrader expert advisor ea bot license automated",
        body: (
          <>
            <p>
              JX Bot is Jenvu's Expert Advisor for <strong>Fiber on MetaTrader 5</strong> (M15 chart). It comes with every paid plan:
              Pro 1 license, Elite 2, Ultra 5. Each license key works on one MT5 account.
            </p>
            <ul>
              <li>Download it from Dashboard → JX Bot and follow the install steps there.</li>
              <li>The bot checks its license with jenvu.com before it trades.</li>
              <li>It pauses for the day at your daily target (monthly target / 20) and stops at the monthly target.</li>
            </ul>
            <Note>Targets are stop limits, not promised profit. Credit or the free trial does not unlock JX Bot.</Note>
          </>
        ),
      },
    ],
  },
  {
    title: "AI and engines",
    sections: [
      {
        id: "ai-chat",
        title: "AI chat",
        keywords: "assistant ask question chat",
        body: (
          <>
            <p>
              Ask the AI about the Fiber chart in plain language — for example “Is there a sweep on 1H?” or “What is the current
              structure on 4H?”. It answers only the question you ask, in short and clear words.
            </p>
            <ul>
              <li>When the evidence isn't strong enough, it says <strong>WAIT</strong> instead of forcing an idea.</li>
              <li>It never claims to be a human trader and never quotes a fixed win rate.</li>
              <li>Each message uses AI credit from your plan or trial.</li>
            </ul>
          </>
        ),
      },
      {
        id: "engines",
        title: "The seven engines",
        keywords: "deterministic engines analysis rules",
        body: (
          <p>
            Behind the chart are seven rule-based engines that read things like market structure, zones, fair value gaps and
            liquidity. They always give the same result for the same candles, so markings are consistent and repeatable. The
            AI explains their output — it does not invent its own levels.
          </p>
        ),
      },
      {
        id: "alerts",
        title: "Alerts",
        keywords: "alerts signal buy sell notify",
        body: (
          <p>
            When the engines detect a qualifying setup, an alert is sent to your notification bell. Buy alerts show a green arrow and
            sell alerts a red arrow. Alerts describe what the chart shows — they are not instructions to trade.
          </p>
        ),
      },
      {
        id: "extension",
        title: "Browser extension",
        keywords: "chrome extension install download",
        body: (
          <ol>
            <li>Go to the <a href="https://jenvu.com/download">Download</a> page and download the latest extension file.</li>
            <li>Unzip it, open <strong>chrome://extensions</strong> and turn on <strong>Developer mode</strong>.</li>
            <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
            <li>Pin Jenvu to your toolbar and sign in with your Jenvu account.</li>
          </ol>
        ),
      },
    ],
  },
  {
    title: "Plans and billing",
    sections: [
      {
        id: "plans",
        title: "Plans and prices",
        keywords: "pricing pro elite ultra cost tokens",
        body: (
          <>
            <ul>
              <li><strong>Pro</strong> — $49 per month.</li>
              <li><strong>Elite</strong> — $99 per month.</li>
              <li><strong>Ultra</strong> — $169 per month.</li>
            </ul>
            <p>
              Each paid plan includes a monthly AI wallet. AI use is charged by actual tokens at $3 per million. See{" "}
              <a href="https://jenvu.com/pricing">Pricing</a> for the full comparison and yearly prices.
            </p>
          </>
        ),
      },
      {
        id: "billing",
        title: "Billing, cancelling and refunds",
        keywords: "invoice cancel refund payment",
        body: (
          <>
            <p>
              Manage your plan from <strong>Billing</strong> in the dashboard. Plans are month-to-month — cancel any time and keep
              access until the end of the period you paid for.
            </p>
            <p>
              Read the <a href="https://jenvu.com/refund">Refund Policy</a> and{" "}
              <a href="https://jenvu.com/cancellation">Cancellation Policy</a> for details.
            </p>
          </>
        ),
      },
      {
        id: "founding",
        title: "Founding Program",
        keywords: "founding apply early access",
        body: (
          <p>
            The Founding Program gives early traders 3 months of their chosen plan, $250 credit and access to the Terminal. Apply at{" "}
            <a href="https://jenvu.com/founding">jenvu.com/founding</a>, choose a plan and wait for approval. See{" "}
            <a href="#terminal-access">Who can use the Terminal</a> for the verification step.
          </p>
        ),
      },
    ],
  },
  {
    title: "Developers",
    sections: [
      {
        id: "api",
        title: "API keys",
        keywords: "api key developer integration",
        body: (
          <p>
            Open <strong>API</strong> in the dashboard to create a key. Keep it private — anyone with your key can use your credit.
            You can delete a key at any time, and your plan sets how many keys you can have.
          </p>
        ),
      },
      {
        id: "ai-assistants",
        title: "Connect AI assistants",
        keywords: "mcp claude chatgpt assistant connector",
        body: (
          <p>
            Jenvu can connect to AI assistants that support MCP. You sign in with your Jenvu account and approve the connection; the
            assistant can then only see your own Jenvu data.
          </p>
        ),
      },
    ],
  },
  {
    title: "Reference",
    sections: [
      {
        id: "glossary",
        title: "Glossary A to Z",
        keywords: "glossary terms definitions a-z",
        body: (
          <dl>
            <Term t="ATR">Average True Range — how much price usually moves per candle.</Term>
            <Term t="BOS">Break of structure — price breaks a swing in the trend's direction.</Term>
            <Term t="BSL">Buy-side liquidity — orders resting above recent highs.</Term>
            <Term t="CHoCH">Change of character — the first break against the current trend.</Term>
            <Term t="Demand zone">An area below price where buyers previously stepped in strongly.</Term>
            <Term t="Equilibrium">The 50% middle of a price range.</Term>
            <Term t="FVG">Fair value gap — a fast move that leaves a gap between candles.</Term>
            <Term t="HH / HL">Higher high / higher low — signs of an uptrend.</Term>
            <Term t="Killzone">The busiest session windows, such as London and New York opens.</Term>
            <Term t="LH / LL">Lower high / lower low — signs of a downtrend.</Term>
            <Term t="Liquidity">Groups of orders that price is often drawn towards.</Term>
            <Term t="Order block">The last opposite candle before a strong move.</Term>
            <Term t="OTE">Optimal trade entry — a pullback area inside a move.</Term>
            <Term t="PDH / PDL">Previous day's high / low.</Term>
            <Term t="Premium / Discount">The upper / lower half of a price range.</Term>
            <Term t="RVOL">Relative volume — a candle's volume compared with the recent average.</Term>
            <Term t="SSL">Sell-side liquidity — orders resting below recent lows.</Term>
            <Term t="Supply zone">An area above price where sellers previously stepped in strongly.</Term>
            <Term t="Sweep">Price takes a liquidity level and then comes back.</Term>
            <Term t="Swing">A turning point in price — a local high or low.</Term>
            <Term t="WAIT">The AI's answer when there isn't enough evidence for a view.</Term>
            <Term t="Fiber">Fiber priced in US dollars.</Term>
          </dl>
        ),
      },
      {
        id: "risk",
        title: "Risk notice",
        keywords: "disclaimer risk advice",
        body: (
          <p>
            Trading Fiber carries a high level of risk and can lose you money. Jenvu provides analysis and education only — not
            financial advice. Read the full <a href="https://jenvu.com/disclaimer">Risk Disclaimer</a>.
          </p>
        ),
      },
      {
        id: "get-help",
        title: "Get help",
        keywords: "support contact email phone help",
        body: (
          <p>
            Visit <a href="https://support.jenvu.com">Jenvu Support</a> for guides and answers, or{" "}
            <a href="https://jenvu.com/contact">contact our team</a>. You can also email{" "}
            <a href="mailto:support@jenvu.com">support@jenvu.com</a>, Monday to Friday, 09:00–18:00 GMT.
          </p>
        ),
      },
    ],
  },
];
