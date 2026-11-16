import { Bot, Check, Cloud, GitBranch, ShieldCheck, Sparkles, Terminal } from 'lucide-react'
import { JxBotLogo, PlatformLogo } from '@/components/brand/ProductLogos'

/** Decorative product windows, not live trading data. */
export function WhyWorkspaceScene() {
  return <div className="why-scene" role="img" aria-label="Animated Jenvu coding, AI and bot workspace illustration">
    <div className="why-floating why-float-code">
      <div className="why-window-label">Jenvu Build <GitBranch size={14} /></div>
      <div className="why-code-lines"><i /><i /><i /></div>
      <p className="font-code text-[10px]">model: <span className="text-gc-ink-muted">selectedModel</span>,</p>
      <div className="why-code-lines why-code-stack"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
    <div className="why-floating why-float-chat"><div className="why-window-label">Jenvu AI</div><div className="why-chat-bubble"><i /><i /></div><div className="why-thinking"><span><i /><i /><i /></span> Thinking</div></div>
    <div className="why-floating why-float-bot"><div className="why-window-label">JX Bot</div><div className="why-bot-chip"><span className="why-status-icon why-status-success"><Bot size={12} /></span> EUR/USD</div><div className="why-bot-chip"><span className="why-status-icon why-status-neutral"><ShieldCheck size={12} /></span> Risk controls</div><div className="why-bot-chip"><span className="why-status-icon why-status-warm"><Check size={12} /></span> IP verification</div></div>
    <div className="why-app-tile why-app-main"><PlatformLogo className="size-10" /></div><div className="why-app-tile why-app-small"><JxBotLogo className="size-10" /></div>
  </div>
}

export function WhyProductPreview({ type }: { type: string }) {
  if (type === 'terminal') return <div className="why-demo-window">
    <div className="why-demo-row"><GitBranch size={13} /><span>Analyze Gold market structure</span><span className="why-ready">Analysis ready</span></div>
    <div className="why-demo-row text-gc-ink-muted"><Cloud size={13} />Structure, liquidity and chart context</div>
    {['terminal/xauusd.ts', 'analysis/structure.ts', 'analysis/liquidity.ts'].map((file, i) => <div key={file} className="why-demo-row font-code"><span>{file}</span><span className="ml-auto text-gc-green">{['+48', '+31', '+72'][i]}</span><span className="text-gc-red">{['−6', '−4', '−9'][i]}</span></div>)}
  </div>
  if (type === 'bot') return <div className="why-bot-log">
    {[['EUR/USD Bot', 'M15 strategy and account status', '9:16 AM'], ['Risk Monitor', 'Daily target and drawdown controls', '9:04 AM'], ['IP Validator', 'Registered MT5 account verification', '9:00 AM']].map(([name, description, time], i) => <div key={name} className="why-log-row"><span className={`why-log-icon ${i === 0 ? 'why-status-success' : i === 1 ? 'why-status-neutral' : 'why-status-warm'}`}><Bot size={19} /></span><div className="min-w-0 flex-1"><p>{name}</p><p className="text-gc-ink-muted">{description}</p></div><time>{time}</time></div>)}
  </div>
  if (type === 'api') return <div className="why-demo-window"><div className="why-demo-row"><CodeLabel /> <span className="ml-auto text-gc-ink-muted">Jenvu API</span></div><pre className="why-api-code font-code">{`const response = await fetch(\n  "https://jenvu.com/api/v1/chat/completions",\n  {\n    method: "POST",\n    headers: { Authorization: "Bearer …" },\n    body: JSON.stringify({\n      model: selectedModel,\n      messages: [{ role: "user", content: question }]\n    })\n  }\n);`}</pre></div>
  return <div className="why-demo-window why-chat-demo"><p className="why-prompt">Next US high-impact release</p><div className="flex items-center gap-2 text-xs"><Sparkles size={14} />News Trading</div><p className="why-stream">Follow the countdown, review previous Gold reactions, and compare the context if the result beats or misses expectations.</p><div className="why-thinking"><span><i /><i /><i /></span> Monitoring releases</div></div>
}

function CodeLabel() { return <><GitBranch size={13} /><span>assistant.ts</span></> }