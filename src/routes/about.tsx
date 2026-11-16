import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Bot, CandlestickChart, Code2, Layers, MessageSquare, Newspaper, Plus, ShieldCheck, Users } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuthUser } from '@/hooks/useAuthUser'
import { PLAN_API_KEYS, TERMINAL_DAILY_HOURS } from '@/lib/free-plan'
import workspace from '@/assets/why-jenvu-workspace.jpg'

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
    <Button asChild className="h-11 rounded-full bg-foreground px-6 text-background shadow-none hover:bg-foreground/90"><a href={user ? 'https://dash.jenvu.com/overview' : 'https://auth.jenvu.com/sign-up'}>{user ? 'Open dashboard' : 'Start Free'}<ArrowRight /></a></Button>
    <Button asChild variant="secondary" className="h-11 rounded-full bg-gc-pill px-6 text-gc-ink shadow-none"><Link to="/pricing">Explore plans</Link></Button>
  </div>
}
function ProductPreview({ type }: { type: string }) {
  if (type === 'api') return <div className="why-preview font-code"><div className="why-preview-bar">assistant.ts <Code2 className="size-4" /></div><pre className="overflow-x-auto p-5 text-[12px] leading-7">{`const response = await jenvu.chat({\n  model: selectedModel,\n  messages: [\n    { role: "user", content: question }\n  ]\n});`}</pre></div>
  if (type === 'bot') return <div className="space-y-3">{['EUR/USD · M15', 'Plan-based daily target', 'Daily drawdown limit'].map((t, i) => <div className="why-preview flex items-center gap-3 px-4 py-3" key={t}><Bot className="size-5 text-gc-ink-muted" /><div className="text-[13px]"><p>{t}</p><p className="mt-1 text-[12px] text-gc-ink-muted">{['MetaTrader 5', 'Profit not guaranteed', 'Risk management'][i]}</p></div><ShieldCheck className="ml-auto size-4 text-gc-ink-muted" /></div>)}</div>
  if (type === 'chat') return <div className="why-preview p-5"><p className="rounded-md bg-gc-pill p-3 text-[13px]">What is the current structure on Gold?</p><div className="mt-5 flex items-center gap-2 text-[13px] text-gc-ink-muted"><MessageSquare className="size-4" />Analyzing market structure</div><div className="mt-4 space-y-2" aria-hidden>{[80, 100, 65].map(n => <div key={n} className={`h-2 rounded-full bg-gc-line ${n === 100 ? 'w-full' : n === 80 ? 'w-4/5' : 'w-2/3'}`} />)}</div></div>
  return <div className="why-preview"><div className="why-preview-bar"><span>XAU/USD</span><CandlestickChart className="size-4" /></div><svg viewBox="0 0 400 155" className="h-40 w-full p-4 text-gc-ink" role="img" aria-label="Illustrative Gold structure chart"><path d="M0 35H400M0 80H400M0 125H400" stroke="currentColor" opacity=".1" fill="none" />{[100, 108, 87, 94, 69, 83, 60, 73, 52, 58, 32, 42, 20, 27, 11].map((y,i) => <g key={i}><path d={`M${15+i*26} ${y-12}v40`} stroke="currentColor" /><rect x={10+i*26} y={y} width="10" height="17" fill="currentColor" opacity={i%3 === 0 ? .3 : 1} /></g>)}</svg></div>
}
function AboutPage() {
  return <div className="public-cloudflare why-page min-h-dvh bg-background font-sans text-gc-ink">
    <SiteHeader />
    <main>
      <section className="why-hero why-wrap">
        <div className="relative z-10 max-w-[610px]">
          <p className="mb-7 text-sm text-gc-ink-muted">Why Jenvu</p>
          <h1 className="text-[40px] font-medium leading-[1.06] sm:text-[56px]">Jenvu.<br />Your AI trading<br />workspace.</h1>
          <p className="mb-8 mt-7 max-w-[540px] text-[17px] leading-7 text-gc-ink-muted">Chart-first analysis, conversational AI, JX Bot and model APIs. Everything for your trading desk, in one place.</p>
          <Actions />
        </div>
        <img src={workspace} alt="Jenvu Terminal, Ask Jenvu and EUR/USD JX Bot workspace illustration" width={1024} height={1024} fetchPriority="high" className="why-hero-image dark:invert" />
      </section>
      <section className="why-wrap pb-16 pt-5 text-center sm:pb-24">
        <p className="text-sm text-gc-ink-muted">One workspace. Every part of your desk.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-x-12 gap-y-5 text-xl font-medium text-gc-ink-muted">{[[CandlestickChart,'Terminal'],[MessageSquare,'Jenvu AI'],[Bot,'JX Bot'],[Code2,'API'],[Newspaper,'News Trading']].map(([Icon,title]) => { const Mark = Icon as typeof Bot; return <span key={String(title)} className="flex items-center gap-2"><Mark className="size-5" />{String(title)}</span> })}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">How we can help</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">{products.map(p => <article key={p.title} className="why-product">
          <h3 className="text-[18px] font-medium">{p.title}</h3><p className="mt-2 max-w-[490px] text-[16px] leading-6 text-gc-ink-muted">{p.text}</p>
          <Button asChild variant="link" className="mt-4 h-auto justify-start p-0 text-sm font-normal text-gc-ink-muted"><a href={p.href}>{p.link}<ArrowRight /></a></Button>
          <div className="mx-auto mt-12 w-full max-w-[440px]"><ProductPreview type={p.type} /></div>
        </article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">Built around your desk</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(b => <article key={b.title} className="rounded-[8px] bg-gc-surface p-7"><b.icon className="mb-7 size-5 text-gc-ink-muted" /><h3 className="text-[17px] font-medium">{b.title}</h3><p className="mt-3 text-[15px] leading-6 text-gc-ink-muted">{b.text}</p></article>)}</div>
      </section>
      <section className="why-wrap why-section">
        <h2 className="why-heading">Community voices</h2>
        <p className="mt-3 text-sm text-gc-ink-muted">Illustrative feedback — not verified customer reviews.</p>
        <div className="mt-9 columns-1 gap-4 sm:columns-2 lg:columns-4">{samples.map((q,i) => <article key={q} className="mb-4 break-inside-avoid rounded-[8px] bg-gc-surface p-6"><p className="text-[15px] leading-7">“{q}”</p><div className="mt-6 flex items-center gap-2 text-xs text-gc-ink-muted"><MessageSquare className="size-4" /><span>Sample review {i+1}</span></div></article>)}</div>
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
