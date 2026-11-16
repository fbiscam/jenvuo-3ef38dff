import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Bot, CandlestickChart, Code2, Layers, MessageSquare, Newspaper, Plus, ShieldCheck, Users } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuthUser } from '@/hooks/useAuthUser'
import { PLAN_API_KEYS, TERMINAL_DAILY_HOURS } from '@/lib/free-plan'
import { WhyProductPreview, WhyWorkspaceScene } from '@/components/WhyWorkspaceScene'

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
  { title: 'Build on the Jenvu API', text: 'Bring reasoning, coding and conversational models into your own tools and products.', href: 'https://jenvu.com/platform', link: 'Explore the API', icon: Code2, type: 'api' },
  { title: 'Work with Jenvu AI', text: 'Research an idea, understand market structure and ask better questions without leaving your desk.', href: 'https://jenvu.com/ai-engine', link: 'Explore the AI engine', icon: MessageSquare, type: 'chat' },
]
const benefits = [
  { icon: Layers, title: 'One connected workspace', text: 'Terminal, AI, API and JX Bot, with your account and plan in one place.' },
  { icon: ShieldCheck, title: 'Limits you can see', text: 'Clear plan allowances for API keys, daily tokens and Terminal indicator hours. Profit is not guaranteed.' },
  { icon: Users, title: 'A team in your corner', text: 'Account help, product guides and a Founding Program for a one-time 30-day Pro or Elite plan after approval and ID verification.' },
  { icon: Newspaper, title: 'News Trading, always free', text: 'Follow the next US high-impact release, with countdowns and beat-or-miss context on every plan.' },
]
const faqs = [
  ['Can I start on the Free plan?', 'Yes. New accounts start on Free with one API key, free News Trading and JX Bot with one registered IP. There is no new free trial.'],
  ['How many Terminal indicator hours do I get?', `Free includes ${TERMINAL_DAILY_HOURS.free} hours per UTC day, Pro ${TERMINAL_DAILY_HOURS.pro}, Elite ${TERMINAL_DAILY_HOURS.elite}, and Ultra ${TERMINAL_DAILY_HOURS.ultra}. When the allowance runs out, paid indicators lock until the next UTC day. The Terminal remains accessible.`],
  ['What does the JX Bot daily target mean?', 'Free has a $5 daily target; Pro 2%, Elite 4% and Ultra 6% per account. These are maximum safety caps, not guaranteed returns. JX Bot trades EUR/USD M15.'],
  ['How many IPs and API keys are included?', `JX Bot IPs: Free 1, Pro 2, Elite 3, Ultra 5. API keys: Free ${PLAN_API_KEYS.free}, Pro ${PLAN_API_KEYS.pro}, Elite ${PLAN_API_KEYS.elite}, Ultra ${PLAN_API_KEYS.ultra}. One IP is bound to one MT5 account.`],
  ['How does the Founding Program work?', 'Apply for Pro or Elite. If approved, complete ID verification to start a one-time 30-day plan grant with that plan’s API credit. After the month ends, continue on Free or purchase a plan.'],
  ['Can I create more than one account?', 'Yes. Multiple accounts are allowed, including on the same device or network. Each email address can be linked to only one account at a time.'],
  ['What happens when my API credit runs out?', 'API usage stops when there is insufficient credit. Plans are available from Payments; separate credit top-ups are not offered.'],
]
const samples = [
  'A single place to look at structure, liquidity and the reasoning behind a setup.',
  'Knowing the daily limits before choosing a plan makes the comparison straightforward.',
  'The news countdown belongs beside the chart, not in another browser tab.',
  'I want to ask questions about the market without interrupting the chart workflow.',
  'A clear distinction between Gold analysis and the EUR/USD bot keeps the workspace focused.',
  'One account for API access, the Terminal and the bot is a simpler way to organize the desk.',
  'Daily targets should be risk limits, never a promise of profit.',
  'Starting on Free gives me a way to explore before choosing a paid plan.',
]

function Actions() {
  const { user } = useAuthUser()
  return <div className="flex flex-wrap gap-3">
    <Button asChild className="h-11 rounded-full bg-foreground px-6 text-background shadow-none hover:bg-foreground/90"><a href={user ? 'https://dash.jenvu.com/overview' : 'https://auth.jenvu.com/sign-up'}>{user ? 'Open dashboard' : 'Start for free'}<ArrowRight /></a></Button>
    <Button asChild variant="secondary" className="h-11 rounded-full bg-gc-pill px-6 text-gc-ink shadow-none"><a href="https://dash.jenvu.com/terminal">Explore Terminal</a></Button>
  </div>
}
function AboutPage() {
  return <div className="public-cloudflare why-page min-h-dvh bg-background font-sans text-gc-ink">
    <SiteHeader />
    <main>
      <section className="why-hero why-wrap">
        <div className="why-hero-copy">
          <p className="mb-7 text-sm text-gc-ink-muted">Why Jenvu</p>
          <h1>Jenvu. Everything<br />you need for your<br />trading workspace.</h1>
          <p className="mb-8 mt-7 max-w-[540px] text-[17px] leading-7 text-gc-ink-muted">Chart-first analysis, conversational AI, JX Bot and model APIs. Everything for your trading desk, in one place.</p>
          <Actions />
        </div>
        <WhyWorkspaceScene />
      </section>
      <section className="why-wrap why-logo-strip text-center">
        <p className="text-sm text-gc-ink-muted">One workspace. Every part of your desk.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-x-12 gap-y-5 text-xl font-medium text-gc-ink-muted">{[[CandlestickChart,'Terminal'],[MessageSquare,'Jenvu AI'],[Bot,'JX Bot'],[Code2,'API'],[Newspaper,'News Trading']].map(([Icon,title]) => { const Mark = Icon as typeof Bot; return <span key={String(title)} className="flex items-center gap-2"><Mark className="size-5" />{String(title)}</span> })}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">How we can help</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">{products.map(p => <article key={p.title} className="why-product">
          <h3 className="text-[18px] font-medium">{p.title}</h3><p className="mt-2 max-w-[490px] text-[16px] leading-6 text-gc-ink-muted">{p.text}</p>
          <Button asChild variant="link" className="mt-4 h-auto justify-start p-0 text-sm font-normal text-gc-ink-muted"><a href={p.href}>{p.link}<ArrowRight /></a></Button>
          <div className="why-product-demo"><WhyProductPreview type={p.type} /></div>
        </article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">About the platform</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(b => <article key={b.title} className="why-benefit"><b.icon className="mb-7 size-5 text-gc-ink-muted" /><h3 className="text-[17px] font-normal">{b.title}</h3><p className="mt-3 text-[15px] leading-6 text-gc-ink-muted">{b.text}</p></article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">Community voices</h2>
        <p className="mt-3 text-sm text-gc-ink-muted">Illustrative feedback — not verified customer reviews.</p>
        <div className="mt-9 columns-1 gap-4 sm:columns-2 lg:columns-4">{samples.map((q,i) => <article key={q} className="why-review"><p className="text-[15px] leading-7">“{q}”</p><div className="mt-6 flex items-center gap-2 text-xs"><span className="why-review-avatar"><Users className="size-3" /></span><div>Sample review {i+1}<p className="mt-1 text-[10px] text-gc-ink-muted">Illustrative feedback</p></div><span className="ml-auto text-sm text-gc-ink-muted" aria-hidden>𝕏</span></div></article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading mb-8">FAQ</h2>
        <Accordion type="single" collapsible>{faqs.map(([q,a],i) => <AccordionItem key={q} value={`faq-${i}`} className="border-gc-line"><AccordionTrigger className="group py-6 text-[15px] font-normal hover:no-underline [&>svg]:hidden"><span className="pr-5">{q}</span><Plus className="size-4 shrink-0 text-gc-ink-muted transition-transform group-data-[state=open]:rotate-45" /></AccordionTrigger><AccordionContent className="max-w-[900px] pb-6 text-[15px] leading-7 text-gc-ink-muted">{a}</AccordionContent></AccordionItem>)}</Accordion>
      </section>
      <section className="why-wrap py-20 text-center sm:py-28"><h2 className="why-heading">Get started</h2><p className="mx-auto mb-7 mt-5 max-w-[520px] text-[16px] leading-6">Start Free with Jenvu, or choose the plan that fits your trading desk.</p><div className="flex justify-center"><Actions /></div></section>
    </main>
    <SiteFooter />
  </div>
}
