import { Bot, Check, Cloud, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'

function WindowDots() { return <span className="why-window-dots" aria-hidden><i /><i /><i /></span> }
function CodeSnippet({ compact = false }: { compact?: boolean }) {
  const code = compact
    ? `const response = await\n  jenvu.chat.create({\n    model: selectedModel,\n    messages: [{\n      role: "user",\n      content: question\n    }]\n  });`
    : `const response = await fetch(\n  "https://jenvu.com/api/v1/chat/completions",\n  {\n    method: "POST",\n    headers: { Authorization: "Bearer …" },\n    body: JSON.stringify({\n      model: selectedModel,\n      messages: [{ role: "user", content: question }]\n    })\n  }\n);`
  return <pre className={`why-api-code font-code ${compact ? 'why-code-compact' : ''}`}><code>{code.split(/("[^"]*"|\b(?:const|await)\b|\b(?:fetch|stringify|create)\b|\b(?:model|messages|role|content|method|headers|body)\b)/g).map((token, i) => <span key={i} className={token.startsWith('"') ? 'why-syntax-string' : /^(const|await)$/.test(token) ? 'why-syntax-keyword' : /^(fetch|stringify|create)$/.test(token) ? 'why-syntax-function' : /^(model|messages|role|content|method|headers|body)$/.test(token) ? 'why-syntax-property' : undefined}>{token}</span>)}</code></pre>
}

/** Decorative product windows, not live trading data. */
export function WhyWorkspaceScene() {
  return <div className="why-scene" role="img" aria-label="Animated Jenvu coding, AI and bot workspace illustration">
    <div className="why-floating why-float-code">
      <div className="why-window-label"><WindowDots /><span>assistant.ts</span></div>
      <CodeSnippet compact />
    </div>
    <div className="why-floating why-float-chat"><div className="why-window-label">Jenvu AI<Sparkles size={13} /></div><div className="why-chat-bubble">Explain the Gold market structure.</div><div className="why-thinking"><span><i /><i /><i /></span> Thinking</div></div>
    <div className="why-floating why-float-bot"><div className="why-window-label">JX Bot</div><div className="why-bot-chip"><span className="why-status-icon why-status-success"><Bot size={12} /></span> EUR/USD</div><div className="why-bot-chip"><span className="why-status-icon why-status-neutral"><ShieldCheck size={12} /></span> Risk controls</div><div className="why-bot-chip"><span className="why-status-icon why-status-warm"><Check size={12} /></span> IP verification</div></div>
    <div className="why-app-tile why-app-main"><Cloud className="size-10 text-gc-blue" strokeWidth={1.75} /></div><div className="why-app-tile why-app-small"><Bot className="size-10 text-gc-blue" strokeWidth={1.75} /></div>
  </div>
}

export function WhyProductPreview({ type }: { type: string }) {
  if (type === 'terminal') return <div className="why-demo-window">
    <div className="why-demo-row"><GitBranch size={13} /><span>Analyze Gold market structure</span><span className="why-ready">Analysis ready</span></div>
    <div className="why-demo-row text-gc-ink-muted"><Cloud size={13} />Structure analysis completed in 6.12s</div>
    {['terminal/xauusd.ts', 'analysis/structure.ts', 'analysis/liquidity.ts'].map((file, i) => <div key={file} className="why-demo-row font-code"><span>{file}</span><span className="ml-auto text-gc-green">{['+48', '+31', '+72'][i]}</span><span className="text-gc-red">{['−6', '−4', '−9'][i]}</span></div>)}
  </div>
  if (type === 'bot') return <div className="why-bot-log">
    {[['EUR/USD Bot', 'M15 strategy and account status', '9:16 AM'], ['Risk Monitor', 'Daily target and drawdown controls', '9:04 AM'], ['IP Validator', 'Registered MT5 account verification', '9:00 AM']].map(([name, description, time], i) => { const Icon = i === 0 ? Bot : i === 1 ? ShieldCheck : Check; return <div key={name} className="why-log-row"><span className={`why-log-icon ${i === 0 ? 'why-status-success' : i === 1 ? 'why-status-neutral' : 'why-status-warm'}`}><Icon size={19} /></span><div className="min-w-0 flex-1"><p>{name}</p><p className="text-gc-ink-muted">{description}</p></div><time>{time}</time></div> })}
  </div>
  if (type === 'api') return <div className="why-demo-window"><div className="why-demo-row"><WindowDots /><CodeLabel /> <span className="ml-auto text-gc-ink-muted">Jenvu API</span></div><CodeSnippet /></div>
  return <div className="why-demo-window why-chat-demo"><p className="why-prompt">Next US high-impact release</p><div className="flex items-center gap-2 text-xs"><Sparkles size={14} />News Trading</div><p className="why-stream">Follow the countdown, review previous Gold reactions, and compare the context if the result beats or misses expectations.</p><div className="why-thinking"><span><i /><i /><i /></span> Monitoring releases</div></div>
}

function CodeLabel() { return <><GitBranch size={13} /><span>assistant.ts</span></> }