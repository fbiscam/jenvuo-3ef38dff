import { useState } from "react";
import { ArrowUp, Check, Copy, ShieldCheck, TerminalSquare, Activity, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";

export type ProductId = "terminal" | "bot" | "news" | "api";

const examples = {
  cURL: `curl https://jenvu.com/api/public/v1/chat/completions \\\n  -H "Authorization: Bearer $JENVU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "model": "gpt-5.5",
    "messages": [{
      "role": "user",
      "content": "Explain market structure"
    }],
    "stream": true
  }'`,
  Python: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://jenvu.com/api/public/v1",
    api_key=os.environ["JENVU_API_KEY"]
)

stream = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user",
               "content": "Explain market structure"}],
    stream=True
)`,
};

function ChartPreview() {
  const [pair, setPair] = useState("XAU/USD");
  const [frame, setFrame] = useState("15M");
  const shift = pair === "BTC/USD" ? 35 : pair === "EUR/USD" ? -25 : 0;
  return <div className="product-demo product-chart-demo">
    <div className="product-demo-bar"><TerminalSquare size={17} /><span>Jenvu Terminal</span><span className="ml-auto product-status"><i />Chart preview</span></div>
    <div className="flex flex-wrap items-center gap-1 px-4 py-3">
      {['XAU/USD', 'BTC/USD', 'EUR/USD'].map(p => <Button key={p} size="sm" variant="ghost" aria-pressed={pair === p} onClick={() => setPair(p)} className={pair === p ? "bg-muted" : "text-muted-foreground"}>{p}</Button>)}
    </div>
    <div className="flex gap-1 px-4">{['5M','15M','1H','4H'].map(t => <Button key={t} variant="ghost" size="sm" aria-pressed={frame === t} onClick={() => setFrame(t)} className={frame === t ? "bg-muted" : "text-muted-foreground"}>{t}</Button>)}</div>
    <svg viewBox="0 0 580 280" role="img" aria-label={`${pair} ${frame} illustrative candlestick chart with separated liquidity levels`} className="product-candles">
      {[45,95,145,195,245].map(y => <line key={y} x1="0" x2="580" y1={y} y2={y} className="product-grid-line" />)}
      <rect x="240" y="198" width="220" height="22" className="product-demand-zone" />
      <line x1="35" x2="520" y1="52" y2="52" className="product-liquidity" /><text x="470" y="43">BSL</text>
      <line x1="35" x2="520" y1="245" y2="245" className="product-liquidity" /><text x="470" y="261">SSL</text>
      {Array.from({length: 30}, (_,i) => {
        const y = 176 - Math.sin(i * .4) * 42 - i * 2.2 + shift;
        const up = i % 4 !== 0;
        return <g key={`${pair}-${frame}-${i}`} className={up ? "product-candle-up" : "product-candle-down"}>
          <line x1={25+i*17} x2={25+i*17} y1={y-18} y2={y+26} stroke="currentColor" />
          <rect x={20+i*17} y={y} width="10" height={i%3*5+12} fill="currentColor" />
        </g>;
      })}
      <text x="250" y="214">Demand / FVG</text><text x="327" y="83">BOS ↑</text>
      <g className="product-last-candle product-candle-up"><line x1="535" x2="535" y1="62" y2="110" stroke="currentColor"/><rect x="530" y="73" width="10" height="22" fill="currentColor"/></g>
    </svg>
    <div className="product-prompt"><span>Explain the latest liquidity sweep</span><ArrowUp size={18}/></div>
  </div>;
}

function BotPreview() {
  return <div className="product-demo product-bot-demo">
    <div className="product-demo-bar"><Activity size={17}/><span>JX Bot · MetaTrader 5</span><span className="ml-auto text-muted-foreground">EUR/USD · M15</span></div>
    <div className="product-bot-question">Check my account, session and daily limits.</div>
    <div className="product-agent-heading"><span className="product-agent-dots"><i/><i/><i/></span>Bot checks<span className="text-muted-foreground"> · Preview</span></div>
    <div className="product-checks">
      {[['IP verification','Registered IP matches the MT5 connection'],['Session check','Asia and London trading windows'],['Risk monitor',`${DAILY_DRAWDOWN_PCT}% daily drawdown guard from peak closed balance`]].map(([title,text],i) => <div key={title} className={`product-check product-check-${i}`}><ShieldCheck size={18}/><div><strong>{title}</strong><p>{text}</p></div><Check className="ml-auto shrink-0" size={15}/></div>)}
    </div>
    <div className="product-prompt"><span>Your MT5. Your account. Plan-based limits.</span><ShieldCheck size={18}/></div>
  </div>;
}

function NewsPreview() {
  return <div className="product-demo product-news-demo">
    <div className="product-demo-bar"><CalendarDays size={17}/><span>News Trading</span><span className="ml-auto text-muted-foreground">Example release</span></div>
    <div className="product-news-body"><p className="text-sm text-muted-foreground">US high-impact release</p><h4>Consumer Price Index</h4><p className="product-countdown">00<span>:</span>42<span>:</span><span className="product-clock">18</span></p>
      <div className="grid grid-cols-2 gap-3"><div className="product-reaction"><span>If actual beats</span><strong className="text-gc-red">Gold DOWN ↘</strong></div><div className="product-reaction"><span>If actual misses</span><strong className="text-gc-green">Gold UP ↗</strong></div></div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Illustrative reaction context. Historical reactions are not a prediction.</p>
    </div>
    <div className="product-prompt"><span>What could this release mean for Gold?</span><ArrowUp size={18}/></div>
  </div>;
}

function ApiPreview() {
  const [language, setLanguage] = useState<keyof typeof examples>("cURL");
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(examples[language]); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }
  return <div className="product-demo product-api-demo">
    <div className="product-demo-bar"><span className="product-window-dots"><i/><i/><i/></span><span>market_assistant</span><Button aria-label={copied ? "Copied" : "Copy code"} title="Copy code" variant="ghost" size="icon-sm" className="ml-auto" onClick={copy}>{copied ? <Check/> : <Copy/>}</Button></div>
    <div className="flex gap-1 px-4 pt-3" role="tablist" aria-label="Code language">{Object.keys(examples).map(l => <Button key={l} role="tab" aria-selected={language === l} variant="ghost" size="sm" onClick={() => { setLanguage(l as keyof typeof examples); setCopied(false); }} className={language === l ? "bg-muted" : "text-muted-foreground"}>{l}</Button>)}</div>
    <pre className="product-code" role="tabpanel"><code>{examples[language].split('\n').map((line,i) => <span key={i} className="product-code-line"><span className="product-code-number">{i+1}</span><span>{line.split(/("[^"\n]*"|'[^'\n]*'|\b(?:import|from|curl|stream|True)\b)/g).map((part,j) => <span key={j} className={/^['"]/.test(part) ? 'product-token-string' : /^(import|from|curl|stream|True)$/.test(part) ? 'product-token-keyword' : undefined}>{part}</span>)}</span></span>)}</code></pre>
  </div>;
}

export default function ProductPreview({ product }: { product: ProductId }) {
  return product === "terminal" ? <ChartPreview/> : product === "bot" ? <BotPreview/> : product === "news" ? <NewsPreview/> : <ApiPreview/>;
}