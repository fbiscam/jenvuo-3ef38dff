import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Bot, CandlestickChart, Code2, Layers, MessageSquare, Newspaper, Plus, ShieldCheck, Users } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuthUser } from '@/hooks/useAuthUser'
import { PLAN_API_KEYS, TERMINAL_DAILY_HOURS } from '@/lib/free-plan'
import { WhyProductPreview, WhyWorkspaceScene } from '@/components/WhyWorkspaceScene'
import { JxBotLogo, NewsLogo, PlatformLogo, TerminalLogo } from '@/components/brand/ProductLogos'
import { ReviewPlatformMark, type ReviewPlatform } from '@/components/brand/ReviewPlatformMark'
import portrait1 from '@/assets/why-profile-hd-1.jpg'
import portrait2 from '@/assets/why-profile-hd-2.jpg'
import portrait3 from '@/assets/why-profile-hd-3.jpg'
import portrait4 from '@/assets/why-profile-hd-4.jpg'
import portrait5 from '@/assets/why-profile-hd-5.jpg'
import portrait6 from '@/assets/why-profile-hd-6.jpg'
import portrait7 from '@/assets/why-profile-hd-7.jpg'
import portrait8 from '@/assets/why-profile-hd-8.jpg'
import portrait9 from '@/assets/why-profile-hd-9.jpg'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'Why Jenvu — Your AI Trading Workspace' },
      { name: 'description', content: 'Explore Jenvu: Gold chart analysis, conversational AI, JX Bot for EUR/USD, model APIs and free News Trading in one workspace.' },
      { property: 'og:title', content: 'Why Jenvu — Your AI Trading Workspace' },
      { property: 'og:description', content: 'A chart-first Terminal, conversational AI, JX Bot and API access. Start Free and choose the plan that fits your desk.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://jenvu.com/about' }],
  }),
  component: AboutPage,
})

const products = [
  { title: 'Read Gold with the Terminal', text: 'Structure, liquidity and chart-first ICT/SMC analysis, together in one workspace.', href: 'https://dash.jenvu.com/terminal', link: 'Open the Terminal', icon: CandlestickChart, type: 'terminal' },
  { title: 'Automate with JX Bot', text: 'An EUR/USD M15 trading bot for MetaTrader 5, with plan-based daily targets and risk limits.', href: 'https://dash.jenvu.com/jx-bot', link: 'Explore JX Bot', icon: Bot, type: 'bot' },
  { title: 'Stay ahead with News Trading', text: 'Follow US high-impact releases and explore historical Gold reactions. Free on every plan.', href: 'https://dash.jenvu.com/news', link: 'Explore News Trading', icon: Newspaper, type: 'chat' },
  { title: 'Build on the Jenvu API', text: 'Bring reasoning, coding and conversational models into your own tools and products.', href: 'https://jenvu.com/platform', link: 'Explore the API', icon: Code2, type: 'api' },
]
const workspaceMarks = [['Terminal', TerminalLogo], ['JX Bot', JxBotLogo], ['News Trading', NewsLogo], ['Platform', PlatformLogo]] as const
const benefits = [
  { icon: Layers, title: 'One connected workspace', text: 'Terminal, AI, API and JX Bot, with your account and plan in one place with top models you need.' },
  { icon: ShieldCheck, title: 'Limits you can see', text: 'Clear plan allowances for API keys, daily tokens and Terminal indicator hours with daily limits.' },
  { icon: Users, title: 'A team in your corner', text: 'Account help, product guides and a Founding Program for one time 30 day Pro or Elite plan.' },
  { icon: Newspaper, title: 'News Trading, always free', text: 'Follow the next US high-impact release, with countdowns and beat-or-miss context every plan.' },
]
const faqs = [
  ['What is included in one workspace?', 'Terminal, JX Bot, News Trading and Platform share your Jenvu account. Use chart analysis, follow US economic releases, manage your bot and build with model APIs without separate product accounts. Each product keeps its own plan allowances.'],
  ['Can I start on the Free plan?', 'Yes. New accounts start on Free with one API key, free News Trading and JX Bot with one registered IP. There is no new free trial.'],
  ['How many Terminal indicator hours do I get?', `Free includes ${TERMINAL_DAILY_HOURS.free} hours per UTC day, Pro ${TERMINAL_DAILY_HOURS.pro}, Elite ${TERMINAL_DAILY_HOURS.elite}, and Ultra ${TERMINAL_DAILY_HOURS.ultra}. When the allowance runs out, paid indicators lock until the next UTC day. The Terminal remains accessible.`],
  ['What does the JX Bot daily target mean?', 'Free has a $5 daily target; Pro 2%, Elite 4% and Ultra 6% per account. These are maximum safety caps, not guaranteed returns. JX Bot trades EUR/USD M15.'],
  ['How many IPs and API keys are included?', `JX Bot IPs: Free 1, Pro 2, Elite 3, Ultra 5. API keys: Free ${PLAN_API_KEYS.free}, Pro ${PLAN_API_KEYS.pro}, Elite ${PLAN_API_KEYS.elite}, Ultra ${PLAN_API_KEYS.ultra}. One IP is bound to one MT5 account.`],
  ['How does the Founding Program work?', 'Apply for Pro or Elite. If approved, complete ID verification to start a one-time 30-day plan grant with that plan’s API credit. After the month ends, continue on Free or purchase a plan.'],
  ['Can I create more than one account?', 'Yes. Multiple accounts are allowed, including on the same device or network. Each email address can be linked to only one account at a time.'],
  ['What happens when my API credit runs out?', 'API usage stops when there is insufficient credit. Plans are available from Payments; separate credit top-ups are not offered.'],
]
const samples = [
  { name: 'Arjun', image: portrait1, quote: 'Trading CFDs with FORAX has been smooth for me. The platform is easy to navigate, execution is quick, and the account setup was straightforward. I still do my own research before every trade, but having a reliable broker makes a real difference.' },
  { name: 'Daniel', image: portrait3, quote: 'One workspace for the chart, the news calendar and the questions I want to research. That is the kind of trading desk I would want to build.' },
  { name: 'Maya', image: portrait8, quote: 'Knowing exactly what each plan includes matters. The API keys, daily tokens and Terminal hours are visible before choosing anything. I would rather work with clear limits than find out halfway through a session that the tool I need has a different subscription.' },
  { name: 'Lina', image: portrait2, quote: 'The API side is what interests me most. A familiar request format, different models to explore and a place to check usage. I could keep a small research tool beside the Terminal instead of piecing together a completely separate account for every part of the workflow.' },
  { name: 'Omar', image: portrait5, quote: 'A bot should have boundaries. A daily target is not a guaranteed return, and a drawdown guard does not remove trading risk. Seeing that distinction stated clearly is important. I want the account status, the registered IP and the risk controls to be easy to inspect, not hidden behind a performance headline.' },
  { name: 'Alex', image: portrait7, quote: 'The news countdown belongs next to the chart. Historical reactions can add context without pretending to predict what Gold will do at the next release. Keeping News Trading free makes that information much easier to explore.' },
  { name: 'Amara', image: portrait4, quote: 'My ideal workflow starts with a question, not a trade. What is the range? Where is the liquidity? What would change the idea? A chart-first workspace with conversational AI gives those questions a natural place to live. The final decision still belongs to the person using it.' },
  { name: 'Sophie', image: portrait6, quote: 'Starting on Free gives me room to understand the workspace before choosing a plan. I can look at the Terminal, explore News Trading and try the API with the monthly credit. Then compare the actual allowances rather than buying a collection of unrelated tools. For me, the useful part is the connection between them: research, chart context and account controls together, while Gold analysis stays separate from the EUR/USD bot. That distinction makes the whole desk easier to understand.' },
  { name: 'Marcus', image: portrait9, quote: 'Less switching between tools, more attention on the question in front of me. A simple workspace with clear product boundaries is a good starting point.' },
]
const reviewPlatforms: ReviewPlatform[] = ['mt5', 'tradingview', 'binance', 'etoro', 'webull', 'trading212', 'coinbase', 'robinhood', 'kucoin']

function Actions() {
  const { user } = useAuthUser()
  return <div className="flex flex-wrap gap-3">
    <Button asChild className="h-11 rounded-full bg-foreground px-6 text-background shadow-none hover:bg-foreground/90"><a href={user ? 'https://dash.jenvu.com/overview' : 'https://auth.jenvu.com/sign-up'}>{user ? 'Open dashboard' : 'Start for free'}<ArrowRight /></a></Button>
    <Button asChild variant="secondary" className="h-11 rounded-full bg-gc-pill px-6 text-gc-ink shadow-none"><a href="https://jenvu.com/contact">Talk to the Jenvu team</a></Button>
  </div>
}
function AboutPage() {
  return <div className="public-cloudflare why-page min-h-dvh bg-background font-sans text-gc-ink">
    <SiteHeader />
    <main>
      <section className="why-hero why-wrap">
        <div className="why-hero-copy">
          <h1>Everything you<br />need for your<br />trading workspace</h1>
          <p className="mb-9 mt-7 max-w-[550px] text-[17px] leading-7 text-gc-ink-muted">Analysis and support across Terminal, JX Bot, News Trading and the Jenvu API, all in one place.</p>
          <Actions />
        </div>
        <WhyWorkspaceScene />
      </section>
      <section className="why-wrap why-logo-strip text-center">
        <p className="text-sm text-gc-ink-muted">One workspace. Every part of your desk.</p>
        <div className="why-marks">{workspaceMarks.map(([title, Mark]) => <span key={title} role="img" aria-label={title}><Mark className="size-10" /></span>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">How we can help</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">{products.map((p, i) => <article key={p.title} className="why-product">
          <div className="mb-5">{(() => { const mark = workspaceMarks[i]; if (!mark) return null; const Mark = mark[1]; return <Mark className="size-6" /> })()}</div>
          <h3 className="text-[18px] font-medium">{p.title}</h3><p className="mt-2 max-w-[490px] text-[16px] leading-6 text-gc-ink-muted">{p.text}</p>
          <Button asChild variant="link" className="mt-4 h-auto justify-start p-0 text-sm font-normal text-gc-ink-muted"><a href={p.href}>{p.link}<ArrowRight /></a></Button>
          <div className="why-product-demo"><WhyProductPreview type={p.type} /></div>
        </article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">About the workspace</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(b => <article key={b.title} className="why-benefit"><b.icon className="mb-7 size-5 text-gc-ink-muted" /><h3 className="text-[17px] font-normal">{b.title}</h3><p className="mt-3 text-[15px] leading-6 text-gc-ink-muted">{b.text}</p></article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">Community voices</h2>
        <p className="mt-3 text-sm text-gc-ink-muted">Illustrative reviews and AI-generated portraits — not verified testimonials. Platform marks are decorative, not endorsements.</p>
        <div className="why-review-columns mt-9">{samples.map((q,i) => <article key={q.name} className="why-review"><p className="text-[15px] leading-[26px]">“{q.quote}”</p><div className="mt-6 flex items-center gap-2 text-xs"><img src={q.image} width={28} height={28} loading="lazy" className="why-review-avatar" alt={`${q.name}, illustrative profile`} /><div>{q.name}<p className="mt-1 text-[10px] text-gc-ink-muted">Sample review {i+1}</p></div><ReviewPlatformMark platform={reviewPlatforms[i] ?? 'tradingview'} /></div></article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading mb-8">FAQ</h2>
        <Accordion type="single" collapsible>{faqs.map(([q,a],i) => <AccordionItem key={q} value={`faq-${i}`} className="border-gc-line"><AccordionTrigger className="group py-6 text-[15px] font-normal hover:no-underline [&>svg]:hidden"><span className="pr-5">{q}</span><span className="ml-auto shrink-0"><Plus className="size-4 text-gc-ink-muted transition-transform group-data-[state=open]:rotate-45" /></span></AccordionTrigger><AccordionContent className="max-w-[900px] pb-6 text-[15px] leading-7 text-gc-ink-muted">{a}</AccordionContent></AccordionItem>)}</Accordion>
      </section>
      <section className="why-wrap py-20 text-center sm:py-28"><h2 className="why-heading">Get started</h2><p className="mx-auto mb-7 mt-5 max-w-[520px] text-[16px] leading-6">Start Free with Jenvu, or choose the plan that fits your trading desk.</p><div className="flex justify-center"><Actions /></div></section>
    </main>
    <SiteFooter />
  </div>
}
