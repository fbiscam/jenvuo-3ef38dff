// Static Help Center content. Edit this file to add/update articles.
// Structure mirrors OpenAI Help (Collections → Articles).

export type Block =
  | { type: "h2"; content: string }
  | { type: "p"; content: string }
  | { type: "ul"; items: string[] };

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
    | "Sparkles"
    | "Mic"
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
    icon: "Sparkles",
    articles: [
      {
        slug: "what-is-jenvu",
        title: "What is Jenvu AI?",
        summary:
          "Jenvu is a voice-native trading agent for Gold, FX, indices and crypto — built on ICT and SMC playbooks.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Jenvu is a voice-first market intelligence terminal. You speak — it analyzes structure, liquidity and bias using institutional ICT and SMC concepts, narrates its read in real time, and renders the chart with marked zones." },
          { type: "h2", content: "What you can do" },
          { type: "ul", items: [
            "Talk to the agent like a desk analyst.",
            "Generate A+ setups on demand for Gold and other supported assets.",
            "Watch the AI mark structure, FVGs, order blocks and liquidity on the chart.",
            "Save signals to your dashboard and receive alerts.",
          ]},
        ],
      },
      {
        slug: "create-account",
        title: "How do I create an account?",
        summary: "Sign up takes under a minute — email + password or Google.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Open the Sign In page and switch to 'Create account'. Enter your full name, email and a password (8+ characters). You can also continue with Google." },
          { type: "p", content: "New accounts start on the Free plan with starter credits so you can try the voice agent and the signal engine right away." },
        ],
      },
      {
        slug: "first-signal",
        title: "Generate your first signal",
        summary: "From homepage to A+ setup in three clicks.",
        updatedAt: "2026-06-30",
        body: [
          { type: "h2", content: "Steps" },
          { type: "ul", items: [
            "Open the Signal Desk from the navigation.",
            "Pick or type a symbol (XAUUSD, BTCUSD, EURUSD, NAS100, etc.).",
            "Wait while the AI runs the 7-stage pipeline. If the setup scores 85+ it's graded A+.",
          ]},
          { type: "p", content: "While the agent works, it narrates each step and draws the relevant zones on the 1H and 15M charts." },
        ],
      },
      {
        slug: "supported-assets",
        title: "Which assets does Jenvu support?",
        summary: "Gold, major FX pairs, key indices, large-cap crypto and select stocks.",
        updatedAt: "2026-06-30",
        body: [
          { type: "ul", items: [
            "Metals: XAU/USD, XAG/USD",
            "FX: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD and other majors",
            "Indices: NAS100, SPX500, US30, GER40",
            "Crypto: BTC, ETH, SOL and other top caps",
            "Equities: select large-cap US stocks",
          ]},
          { type: "p", content: "The analysis engine adapts its factor weights to the asset class (metal, forex, index, crypto, stock)." },
        ],
      },
    ],
  },
  {
    slug: "voice-agent",
    title: "Voice Agent",
    description: "Talk to Jenvu like Jarvis — wake words, commands, mic.",
    icon: "Mic",
    articles: [
      {
        slug: "how-to-talk",
        title: "How do I talk to the agent?",
        summary: "Push-to-talk on desktop, tap-to-talk on mobile.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Open the Voice Agent page. Click the mic to start talking and click again to stop — the AI replies once you release. You can also type into the composer if you prefer." },
        ],
      },
      {
        slug: "mic-permissions",
        title: "Mic isn't working — what to check",
        summary: "Browser permissions, OS settings, and the right input device.",
        updatedAt: "2026-06-30",
        body: [
          { type: "ul", items: [
            "Allow microphone access for jenvu.com in your browser site settings.",
            "On macOS / Windows, confirm the browser has mic permission at the OS level.",
            "Close other apps holding the mic (Zoom, Meet, Discord).",
            "Reload the page after changing any permission.",
          ]},
        ],
      },
      {
        slug: "supported-commands",
        title: "What can I ask?",
        summary: "Examples of commands the agent understands.",
        updatedAt: "2026-06-30",
        body: [
          { type: "ul", items: [
            "“Analyze Gold.”",
            "“Give me a setup on Bitcoin.”",
            "“What's the bias on EUR/USD right now?”",
            "“Walk me through the 15-minute structure.”",
            "“Is it safe to trade NFP today?”",
          ]},
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
          { type: "ul", items: [
            "Stage 1 — Multi-timeframe candle ingestion (1H + 15M).",
            "Stage 2 — Swing, BOS and CHoCH detection.",
            "Stage 3 — Fair Value Gaps and Order Blocks.",
            "Stage 4 — Liquidity pool mapping (PDH/PDL, equal highs/lows).",
            "Stage 5 — Premium/Discount + killzone overlay.",
            "Stage 6 — Weighted scoring (85+ = A+).",
            "Stage 7 — LLM narration synced with chart markings.",
          ]},
        ],
      },
      {
        slug: "a-plus-grading",
        title: "What makes a setup A+?",
        summary: "The grade is reserved for high-confluence trades that pass every gate.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Bias, structure, liquidity, premium/discount, killzone alignment and news-risk all need to pass. If any gate fails the agent recommends standing aside — we'd rather miss a trade than print a bad one." },
        ],
      },
      {
        slug: "market-closed",
        title: "What happens when markets are closed?",
        summary: "You'll see a MARKET CLOSED badge — no live entries are issued.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Forex and indices have session windows. When the relevant market is closed, Jenvu shows a badge and skips live entry/SL/TP guidance because those levels would be stale by the next open." },
        ],
      },
    ],
  },
  {
    slug: "plans-credits-billing",
    title: "Plans, Credits & Billing",
    description: "Pricing, credit usage and managing your subscription.",
    icon: "CreditCard",
    articles: [
      {
        slug: "plans-overview",
        title: "Plan comparison",
        summary: "Free, Pro and Elite — credits, limits and features.",
        updatedAt: "2026-06-30",
        body: [
          { type: "ul", items: [
            "Free — starter credits, basic signals.",
            "Pro — $29 / 175 credits, full signal engine and voice agent.",
            "Elite — $99 / 595 credits, priority alerts and higher limits.",
          ]},
          { type: "p", content: "See the Pricing page for the full feature matrix." },
        ],
      },
      {
        slug: "credit-costs",
        title: "How much does each action cost?",
        summary: "Signals, narrated walkthroughs and voice replies each have a credit cost.",
        updatedAt: "2026-06-30",
        body: [
          { type: "ul", items: [
            "Signal only — 2 credits.",
            "Signal + ICT narration — 5 credits.",
            "Voice agent reply — 1 credit.",
          ]},
        ],
      },
      {
        slug: "upgrade-cancel",
        title: "How do I upgrade or cancel?",
        summary: "Manage your plan from the Dashboard → Billing tab.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Open your Dashboard and switch to the Billing tab. You can change plans, view credit usage and cancel at any time. Access continues to the end of the current billing period." },
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
          { type: "p", content: "On the sign-in page, choose 'Forgot password' and enter your account email. We'll send a secure link to set a new one. Links expire after 60 minutes." },
        ],
      },
      {
        slug: "change-email",
        title: "Change your email",
        summary: "Update your account email from the Profile tab.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Open the Dashboard → Profile tab to update your email. You'll be asked to confirm the new address before the change takes effect." },
        ],
      },
      {
        slug: "delete-account",
        title: "Delete your account",
        summary: "Account deletion is permanent and removes all saved data.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "Email support@jenvu.com from your account address with the subject 'Delete account'. We confirm the request and complete deletion within 7 days." },
        ],
      },
      {
        slug: "data-privacy",
        title: "How is my data handled?",
        summary: "See our Privacy Policy for the full breakdown.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "We only store the minimum data needed to run your account, signals and alerts. Read the Privacy Policy for retention, processors and your rights." },
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
          { type: "p", content: "Visit the Download page for the latest builds. The mobile app uses native microphone access, push notifications and haptics." },
        ],
      },
      {
        slug: "push-notifications",
        title: "Enable push notifications",
        summary: "Get A+ setup alerts as soon as they're detected.",
        updatedAt: "2026-06-30",
        body: [
          { type: "p", content: "After signing in on the app, accept the push prompt. You can fine-tune which alerts you receive from Dashboard → Alerts." },
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
