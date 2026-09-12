// Static Help Center content. Edit this file to add/update articles.
// Structure mirrors OpenAI Help (Collections → Articles).

export type Block =
  | { type: "h2"; content: string }
  | { type: "h3"; content: string }
  | { type: "p"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; tone?: "info" | "tip" | "warn"; content: string }
  | { type: "code"; content: string };

export type Article = {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string; // ISO date
  body: Block[];
};

export type Collection = {
  slug: string;
  title: string;
  description: string;
  // Lucide icon name kept as string label so we map on render
  icon:
    | "Compass"
    | "Puzzle"
    | "LineChart"
    | "CreditCard"
    | "Shield"
    | "Smartphone";
  articles: Article[];

};

export const collections: Collection[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "New to Jenvu? Start here for the basics.",
    icon: "Compass",
    articles: [
      {
        slug: "what-is-jenvu",
        title: "What is Jenvu AI?",
        summary:
          "Jenvu is an AI-powered TradingView extension focused on XAU/USD and built on ICT and SMC playbooks.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Jenvu AI is a chart-aware TradingView extension. It analyses market structure, liquidity and bias using institutional ICT (Inner Circle Trader) and SMC (Smart Money Concepts) frameworks, then returns a clear answer with marked zones so you can see exactly what it sees." },
          { type: "p", content: "Think of it as having a senior bullion-desk analyst on call 24/7: ask for a setup on XAU/USD, XAU/JPY or any other gold cross and Jenvu walks the chart aloud, points out the structure shifts, marks the liquidity it's hunting, and only delivers an entry when the confluence meets its A+ bar." },

          { type: "h2", content: "What you can do with Jenvu" },
          { type: "ul", items: [
            "Chat with the extension like a desk analyst directly from your TradingView chart.",
            "Generate A+ setups on demand for XAU/USD.",
            "Watch the AI mark structure, FVGs, order blocks and liquidity directly on the chart.",
            "Save signals to your dashboard and receive alerts when new A+ setups are detected.",
            "Get news context, killzone awareness and bias confirmation before risking capital.",
          ]},

          { type: "h2", content: "Who Jenvu is built for" },
          { type: "p", content: "Jenvu is designed for traders who already understand ICT/SMC fundamentals and want institutional-grade analysis inside TradingView. It's equally useful for beginners learning the playbook because each step is explained in plain English." },

          { type: "note", tone: "info", content: "Jenvu is an analysis tool, not financial advice. You stay in control of every trade — it only suggests a setup when its confluence model is satisfied." },

          { type: "h2", content: "Where to go next" },
          { type: "ul", items: [
            "Read 'How do I create an account?' to set up your profile.",
            "Open 'Generate your first signal' for a 3-click walkthrough.",
            "Browse 'Which assets does Jenvu support?' for the full instrument list.",
          ]},
        ],
      },
      {
        slug: "create-account",
        title: "How do I create an account?",
        summary: "Sign up takes under a minute — email + password or Google.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Creating a Jenvu account takes less than 60 seconds. New accounts start on the Free plan and include starter credits so you can try the extension and signal engine immediately." },

          { type: "h2", content: "Sign up with email" },
          { type: "ol", items: [
            "Open the Sign In page from the top-right of any page.",
            "Switch to the 'Create account' tab.",
            "Enter your full name, email and a password of 8+ characters.",
            "Click 'Create account' — you'll be signed in straight away.",
          ]},

          { type: "h2", content: "Sign up with Google" },
          { type: "p", content: "Prefer one-click? Click 'Continue with Google' on the Sign In page and pick the Google account you want to use. We only request your name, email and profile picture — nothing else." },

          { type: "h2", content: "What happens next" },
          { type: "ul", items: [
            "Your dashboard loads with starter credits already topped up.",
            "You can install and manage the TradingView extension from your dashboard.",
            "Upgrade to Pro or Elite any time from Dashboard → Billing.",
          ]},

          { type: "note", tone: "tip", content: "Use a real email — password resets, A+ signal alerts and billing receipts are all sent there." },
        ],
      },
      {
        slug: "first-signal",
        title: "Generate your first signal",
        summary: "From homepage to A+ setup in three clicks.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Getting your first signal out of Jenvu is intentionally simple. The 7-stage pipeline does the heavy lifting — open your chart and ask the extension to analyze it." },

          { type: "h2", content: "Step by step" },
          { type: "ol", items: [
            "Open the Jenvu desk from your dashboard.",
            "Confirm the instrument — XAU/USD (the only pair Jenvu trades).",
            "Hit 'Analyze'. The extension reads the active chart and starts building the setup.",
            "Wait while the 7-stage pipeline runs — usually 10–25 seconds.",
            "If the final score is 85+, the setup is graded A+ and entry, stop and targets appear.",
          ]},

          { type: "h2", content: "What you'll see on the chart" },
          { type: "ul", items: [
            "Swing highs and lows marked with HH / HL / LH / LL labels.",
            "BOS (break of structure) and CHoCH (change of character) lines.",
            "Order blocks shaded as supply / demand zones.",
            "Fair Value Gaps highlighted as imbalance bands.",
            "Liquidity pools tagged (PDH, PDL, equal highs / lows).",
          ]},

          { type: "h2", content: "Reviewing the analysis" },
          { type: "p", content: "The extension explains each step in the chat and marks relevant structure on the chart. Eligible plans also require a second-model senior review before the final result appears." },

          { type: "note", tone: "warn", content: "If the setup scores below 85, Jenvu shows the read but does not issue an entry. Standing aside is a feature — it protects your win rate." },
        ],
      },
      {
        slug: "supported-assets",
        title: "Which assets does Jenvu support?",
        summary: "Gold only — XAU/USD, nothing else.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Jenvu is a dedicated gold desk. The analysis engine is tuned for bullion — London fix mechanics, DXY correlation, COMEX/COT positioning and central-bank buying flows — and it refuses to trade anything that isn't gold." },

          { type: "h2", content: "Supported instruments" },
          { type: "h3", content: "Gold" },
          { type: "ul", items: [
            "XAU/USD — primary bullion benchmark.",
          ]},

          { type: "note", tone: "info", content: "Ask for BTC, EUR/USD, NAS100 or any other asset and Jenvu will politely decline and redirect you to XAU/USD." },
        ],
      },
    ],
  },
  {
    slug: "tradingview-extension",
    title: "TradingView Extension",
    description: "Install Jenvu, chat with AI and analyze active charts.",
    icon: "Puzzle",
    articles: [
      {
        slug: "how-to-chat",
        title: "How do I use AI chat?",
        summary: "Ask general questions or request a chart analysis.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Jenvu works like a familiar AI chat inside TradingView. It answers normal questions conversationally and only runs the signal engine when you ask it to analyze a chart or trading setup." },

          { type: "h2", content: "Open the extension" },
          { type: "ol", items: [
            "Open a supported XAU/USD chart in TradingView.",
            "Open Jenvu from your browser toolbar.",
            "Enter your extension API key when prompted.",
            "Type a question or ask Jenvu to analyze the active chart.",
          ]},

          { type: "h2", content: "Chat mode and analysis mode" },
          { type: "p", content: "Greetings and general questions stay in chat mode. Requests for a setup, signal or chart review trigger the ICT/SMC engine and use the live TradingView chart as context." },

          { type: "h2", content: "Ask naturally" },
          { type: "p", content: "Type into the composer and send your message. You can ask follow-up questions in the same conversation without repeating the full context." },

          { type: "note", tone: "tip", content: "Keep analysis requests specific — 'Analyze this XAU/USD chart' or 'What is the 15-minute bias?' produces the clearest result." },
        ],
      },
      {
        slug: "extension-troubleshooting",
        title: "Extension isn't responding — what to check",
        summary: "TradingView tab access, API key status and supported charts.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "If Jenvu does not respond or cannot read the chart, run through this checklist from top to bottom." },

          { type: "h2", content: "1. TradingView access" },
          { type: "ul", items: [
            "Make sure the active tab is a TradingView chart.",
            "Allow the extension to access tradingview.com when prompted.",
            "Reload the chart after changing extension permissions.",
          ]},

          { type: "h2", content: "2. Extension API key" },
          { type: "ul", items: [
            "Open Dashboard → Extension and copy an active key.",
            "Paste the key into the extension settings exactly as shown.",
            "Confirm your plan is active and has available AI wallet balance.",
          ]},

          { type: "h2", content: "3. Supported market" },
          { type: "p", content: "Jenvu is tuned for XAU/USD. Open a Gold versus U.S. Dollar chart before requesting a full setup analysis." },

          { type: "h2", content: "4. Reload the extension" },
          { type: "p", content: "Close and reopen the side panel, then refresh the TradingView tab. If the issue continues, generate a new API key from the dashboard." },

          { type: "note", tone: "warn", content: "Never share your extension API key. Revoke it immediately from the dashboard if it is exposed." },
        ],
      },
      {
        slug: "supported-commands",
        title: "What can I ask?",
        summary: "Examples of commands the agent understands.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Jenvu understands natural language — you don't need fixed phrases. These examples are a good starting point and cover the most common workflows." },

          { type: "h2", content: "Analysis & setups" },
          { type: "code", content: "“Analyze XAU/USD.”\n“Give me an A+ setup on gold in euros.”\n“What's the bias on XAU/JPY right now?”\n“Walk me through the 15-minute structure on XAU/GBP.”" },

          { type: "h2", content: "Risk & news" },
          { type: "code", content: "“Is it safe to trade NFP today?”\n“Any high-impact news in the next hour?”\n“What killzone are we in?”" },

          { type: "h2", content: "ICT & SMC concepts" },
          { type: "code", content: "“Show me the daily order block on Gold.”\n“Where is liquidity resting above price?”\n“Is this a manipulation move or a real BOS?”" },

          { type: "h2", content: "Account & app" },
          { type: "code", content: "“How many credits do I have left?”\n“Open my saved signals.”\n“Take me to billing.”" },

          { type: "note", tone: "tip", content: "If Jenvu misunderstands, just rephrase and ask again — there is no penalty and follow-ups are answered in the same thread." },
        ],
      },
    ],
  },
  {
    slug: "signal-engine",
    title: "Signal Engine",
    description: "How signals are generated, scored and narrated.",
    icon: "LineChart",
    articles: [
      {
        slug: "how-signals-are-generated",
        title: "How are signals generated?",
        summary: "A 7-stage deterministic pipeline blending price action with LLM reasoning.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Every Jenvu signal goes through the same 7-stage pipeline. The first six stages are deterministic — pure TypeScript over candle data — so the same input always produces the same read. Only the final narration stage uses an LLM, and even there the model is constrained to describe what the deterministic stages already detected." },

          { type: "h2", content: "The 7 stages" },
          { type: "ol", items: [
            "Multi-timeframe candle ingestion — 1H for context, 15M for execution.",
            "Swing detection and structure mapping — HH / HL / LH / LL.",
            "BOS (break of structure) and CHoCH (change of character) detection.",
            "Fair Value Gaps and Order Block identification.",
            "Liquidity pool mapping — PDH / PDL, equal highs / lows, session sweeps.",
            "Premium/Discount zoning + killzone overlay + weighted scoring.",
            "LLM narration synced with the chart markings from stages 2–6.",
          ]},

          { type: "h2", content: "Why deterministic + LLM" },
          { type: "p", content: "Pure LLM signals hallucinate. Pure rule-based signals can't explain themselves. Jenvu's hybrid keeps the analysis grounded in measurable price action while letting the agent speak to you like a human analyst." },

          { type: "note", tone: "info", content: "Scoring weights are tuned specifically for XAU/USD — DXY correlation, real yields and LBMA London fix flows carry the most weight." },
        ],
      },
      {
        slug: "a-plus-grading",
        title: "What makes a setup A+?",
        summary: "The grade is reserved for high-confluence trades that pass every gate.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "A+ is not a marketing label — it's a hard threshold. A setup is only graded A+ when every one of the following gates passes and the weighted score lands at 85 or above out of 100." },

          { type: "h2", content: "The gates" },
          { type: "ul", items: [
            "Higher-timeframe bias is clearly defined (no consolidation).",
            "Structure on the execution timeframe agrees with HTF bias.",
            "A clean liquidity sweep precedes the entry zone.",
            "Price is in the correct premium/discount half for the direction.",
            "Trade falls inside an institutional killzone (London or NY).",
            "No high-impact red-folder news within the next 30 minutes.",
          ]},

          { type: "h2", content: "Why we stand aside often" },
          { type: "p", content: "Most setups don't pass every gate. That's by design — Jenvu's job is to protect your equity curve, not to keep you constantly in the market. If you see fewer A+ signals on quiet days, that's the engine working correctly." },

          { type: "note", tone: "tip", content: "Lower-grade reads (B and C) are useful for context, education and journal review — just don't trade them blind." },
        ],
      },
      {
        slug: "market-closed",
        title: "What happens when markets are closed?",
        summary: "You'll see a MARKET CLOSED badge — no live entries are issued.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Spot gold follows the OTC bullion week — Sunday open in Sydney through Friday New York close, with a daily 60-minute settlement break. When you ask for a gold cross outside its trading window, Jenvu detects it and adapts." },

          { type: "h2", content: "What you'll see" },
          { type: "ul", items: [
            "A red 'MARKET CLOSED' badge above the chart.",
            "Last-known price displayed without a live tick.",
            "Structure analysis still runs so you can study the chart.",
            "Entry, stop loss and take profit are intentionally hidden — those levels would be stale by the next open.",
          ]},

          { type: "h2", content: "Sessions reference" },
          { type: "ul", items: [
            "Spot gold: Sunday 22:00 UTC → Friday 22:00 UTC.",
            "LBMA London gold fix: 10:30 & 15:00 GMT (highest liquidity).",
            "COMEX open (NY AM): 12:30 – 15:00 GMT.",
            "Daily settlement break: 21:00 – 22:00 UTC.",
          ]},

          { type: "note", tone: "info", content: "If you want to plan the next session in advance, ask Jenvu for 'tomorrow's London bias on XAU/USD' — it'll build a HTF read without issuing a live signal." },
        ],
      },
    ],
  },
  {
    slug: "plans-credits-billing",
    title: "Plans, Credits & Billing",
    description: "Pricing, credit usage and subscription.",
    icon: "CreditCard",
    articles: [
      {
        slug: "plans-overview",
        title: "Plan comparison",
        summary: "Free, Pro, Elite and Ultra — wallets, scan estimates and features.",
        updatedAt: "2026-07-10",
        body: [
          { type: "p", content: "Jenvu uses a USD-wallet subscription model. Every plan comes with a monthly USD wallet — each signal scan deducts a flat $0.20 per scan. Only successful BUY / SELL scans are billed; WAIT results and errors are free." },

          { type: "h2", content: "Free" },
          { type: "ul", items: [
            "$2 wallet per month (~5 scans).",
            "AI extension chat with starter wallet access.",
            "Full signal engine — A+ / A institutional signals.",
            "Full ICT / SMC narration.",
            "Trade journal & analytics.",
            "Multi-timeframe bias engine.",
            "Realtime email & push alerts.",
          ]},

          { type: "h2", content: "Pro — $15 / month" },
          { type: "ul", items: [
            "$15 wallet per month (~35 scans).",
            "AI extension chat billed from the included wallet.",
            "Full XAU/USD signal engine.",
            "Realtime A+ email & push alerts (no delay).",
            "Full ICT / SMC narration, trade journal & analytics.",
            "Multi-timeframe bias engine.",
          ]},

          { type: "h2", content: "Elite — $50 / month" },
          { type: "ul", items: [
            "$50 wallet per month (~85 scans).",
            "Everything in Pro.",
            "Priority A+ alerts (< 30 seconds).",
            "Dedicated XAU/USD scanner with DXY overlay.",
            "API access, webhooks and custom alert rules.",
            "Dedicated onboarding & SLA.",
          ]},

          { type: "h2", content: "Ultra — $100 / month" },
          { type: "ul", items: [
            "$100 wallet per month (~165 scans).",
            "Everything in Elite.",
            "< 10s SLA priority alerts.",
            "Priority desk support.",
          ]},

          { type: "note", tone: "info", content: "See the Pricing page for the full feature matrix and one-time top-up packs ($1 = 3 scans, never expire)." },
        ],
      },
      {
        slug: "credit-costs",
        title: "How scans are counted",
        summary: "Only BUY / SELL signals draw from your USD wallet.",
        updatedAt: "2026-07-10",
        body: [
          { type: "p", content: "Scans deduct a flat $0.20 per successful BUY / SELL signal from your USD wallet. WAIT signals and errors are free." },

          { type: "h2", content: "What counts as a scan" },
          { type: "ul", items: [
            "Signal analysis returning BUY or SELL — deducted from wallet at real cost.",
            "Signal returning WAIT (dead market) — free.",
            "AI extension chat — billed by measured token use.",
            "A+ broadcast alert delivered to you — free.",
          ]},

          { type: "h2", content: "How wallets refresh" },
          { type: "ul", items: [
            "Free: $2 wallet each month (~5 scans).",
            "Pro: $15 wallet added on each billing date (~35 scans).",
            "Elite: $50 wallet added on each billing date (~85 scans).",
            "Ultra: $100 wallet added on each billing date (~165 scans).",
            "Top-up packs never expire and stack on top of your plan.",
          ]},



          { type: "note", tone: "tip", content: "Track usage live from Dashboard → Billing. The sparkline turns red when you've dropped below 30% of your monthly balance." },
        ],
      },
      {
        slug: "upgrade-cancel",
        title: "How do I upgrade or cancel?",
        summary: "Manage your plan from the Dashboard → Billing tab.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "All plan changes happen from one place. There's no email back-and-forth and no waiting on support." },

          { type: "h2", content: "Upgrade" },
          { type: "ol", items: [
            "Open your Dashboard.",
            "Switch to the Billing tab.",
            "Pick Pro or Elite and confirm payment.",
            "Your new credits are available immediately.",
          ]},

          { type: "h2", content: "Downgrade or cancel" },
          { type: "ol", items: [
            "Dashboard → Billing → 'Change plan'.",
            "Pick a lower tier or 'Cancel subscription'.",
            "Access continues until the end of your current billing period.",
            "On the next renewal date you drop to the new plan (or Free, if cancelled).",
          ]},

          { type: "note", tone: "warn", content: "Cancelling does not delete your account or your saved signals — it only stops the renewal. To remove your account entirely, see 'Delete your account'." },
        ],
      },
    ],
  },
  {
    slug: "account-security",
    title: "Account & Security",
    description: "Sign-in, password resets and data privacy.",
    icon: "Shield",
    articles: [
      {
        slug: "reset-password",
        title: "Reset your password",
        summary: "Use the 'Forgot password' link on the sign-in page.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "If you can't remember your password, you can reset it yourself in under a minute without contacting support." },

          { type: "h2", content: "Steps" },
          { type: "ol", items: [
            "Open the Sign In page.",
            "Click 'Forgot password' under the password field.",
            "Enter the email you signed up with.",
            "Check your inbox for a secure reset link from Jenvu.",
            "Click the link, choose a new password and sign in.",
          ]},

          { type: "note", tone: "warn", content: "Reset links expire after 60 minutes for security. If yours has expired, just request a new one — there is no limit." },

          { type: "h2", content: "Not receiving the email?" },
          { type: "ul", items: [
            "Check your Spam / Promotions folders.",
            "Confirm you used the same email address you signed up with.",
            "Add support@jenvu.com to your contacts and try again.",
          ]},
        ],
      },
      {
        slug: "change-email",
        title: "Change your email",
        summary: "Update your account email from the Profile tab.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "You can move your account to a new email address yourself. Your signals, credits and billing history move with you." },

          { type: "h2", content: "Steps" },
          { type: "ol", items: [
            "Open Dashboard → Profile.",
            "Click the email field and type your new address.",
            "Hit 'Save'.",
            "Check the new inbox for a confirmation link from Jenvu.",
            "Click the link to complete the change.",
          ]},

          { type: "note", tone: "info", content: "Until you click the confirmation link, your old email remains active so you don't get locked out by a typo." },
        ],
      },
      {
        slug: "delete-account",
        title: "Delete your account",
        summary: "Account deletion is permanent and removes all saved data.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Account deletion is permanent. We remove your profile, saved signals, journal entries, alerts and billing history. This action cannot be reversed." },

          { type: "h2", content: "How to request deletion" },
          { type: "ol", items: [
            "Email support@jenvu.com from the address on your account.",
            "Use the subject line 'Delete account'.",
            "We reply within one business day to confirm.",
            "Deletion completes within 7 days of your confirmation.",
          ]},

          { type: "note", tone: "warn", content: "If you have an active subscription, cancel it from Dashboard → Billing first. Otherwise your card may be charged on the next renewal before the deletion request lands." },

          { type: "h2", content: "Prefer to pause instead?" },
          { type: "p", content: "If you only want a break, downgrade to Free from Dashboard → Billing. Your account stays put and you can come back any time." },
        ],
      },
      {
        slug: "data-privacy",
        title: "How is my data handled?",
        summary: "See our Privacy Policy for the full breakdown.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "We only collect and retain the minimum data needed to run your account, generate signals and deliver alerts. We do not sell user data and we don't share it with advertisers." },

          { type: "h2", content: "What we store" },
          { type: "ul", items: [
            "Your name, email and authentication tokens.",
            "Saved signals, journal entries and alert preferences.",
            "Billing metadata (plan, credits, invoice references).",
            "Anonymous product analytics (page views, error logs).",
          ]},

          { type: "h2", content: "What we don't store" },
          { type: "ul", items: [
            "Background browsing activity outside the active TradingView analysis request.",
            "Payment card numbers — handled by our PCI-compliant processor.",
            "Cross-site tracking identifiers.",
          ]},

          { type: "note", tone: "info", content: "For the full legal text — retention windows, sub-processors and your rights under GDPR / CCPA — see the Privacy Policy linked in the footer." },
        ],
      },
    ],
  },
  {
    slug: "mobile-app",
    title: "Mobile App",
    description: "iOS and Android — install, notifications, haptics.",
    icon: "Smartphone",
    articles: [
      {
        slug: "install",
        title: "Install on iOS and Android",
        summary: "Download links are on the Download page.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Jenvu's mobile companions keep your alerts, saved signals and account status available away from your TradingView workstation." },

          { type: "h2", content: "Download" },
          { type: "ol", items: [
            "Open jenvu.com/download on your phone.",
            "Tap the App Store or Google Play badge for your device.",
            "Install, open the app and sign in with the same account you use on the web.",
          ]},

          { type: "h2", content: "First-launch permissions" },
          { type: "ul", items: [
            "Notifications — required for A+ signal alerts.",
            "Network access — required to sync signals and account status.",
            "Haptics — automatic, no prompt.",
          ]},

          { type: "note", tone: "tip", content: "Accept all three on first launch. You can always tighten them later in your phone's settings without losing data." },
        ],
      },
      {
        slug: "push-notifications",
        title: "Enable push notifications",
        summary: "Get A+ setup alerts as soon as they're detected.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Push notifications are how Jenvu surfaces A+ setups the moment the engine detects them — typically within seconds of the structure shift on the chart." },

          { type: "h2", content: "Turn them on" },
          { type: "ol", items: [
            "Open the Jenvu mobile app and sign in.",
            "Accept the push prompt on first launch.",
            "If you tapped 'Don't allow', enable Notifications for Jenvu in your phone's Settings app.",
            "Open Dashboard → Alerts to fine-tune which alerts you receive.",
          ]},

          { type: "h2", content: "What you'll get" },
          { type: "ul", items: [
            "A+ setup detected — symbol, direction and score.",
            "News risk warning before high-impact events.",
            "Killzone open reminders (London / NY) if enabled.",
          ]},

          { type: "note", tone: "info", content: "All plans receive realtime email & push alerts the moment an A+ setup forms." },
        ],
      },
    ],
  },
];

export function findCollection(slug: string) {
  return collections.find((c) => c.slug === slug) ?? null;
}

export function findArticle(collectionSlug: string, articleSlug: string) {
  const col = findCollection(collectionSlug);
  if (!col) return null;
  const article = col.articles.find((a) => a.slug === articleSlug) ?? null;
  return article ? { collection: col, article } : null;
}

export function allArticles(): Array<{ collection: Collection; article: Article }> {
  return collections.flatMap((c) => c.articles.map((a) => ({ collection: c, article: a })));
}
