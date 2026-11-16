export type ReviewPlatform = 'x' | 'mt5' | 'binance' | 'tradingview' | 'ctrader' | 'bybit'

/** Decorative platform marks on illustrative reviews; not endorsements. */
export function ReviewPlatformMark({ platform }: { platform: ReviewPlatform }) {
  const names = { x: 'X', mt5: 'MetaTrader 5', binance: 'Binance', tradingview: 'TradingView', ctrader: 'cTrader', bybit: 'Bybit' }
  return <span className={`why-review-platform why-platform-${platform}`} role="img" aria-label={`${names[platform]} decorative mark`}>
    {platform === 'x' ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.4 22H2.2l7.9-9L2.2 2h6.6l4.5 6.6L18.9 2Zm-1.1 18h1.7L7.7 4H5.9Z" /></svg>
      : platform === 'binance' ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1 6 6-2.4 2.4L12 5.8 8.4 9.4 6 7Zm-8 8 3 3-3 3-3-3Zm16 0 3 3-3 3-3-3Zm-8 0 3 3-3 3-3-3Zm-6 8 2.4-2.4 3.6 3.6 3.6-3.6L18 17l-6 6Z" /></svg>
      : platform === 'tradingview' ? <svg viewBox="0 0 32 24" fill="currentColor"><path d="M1 7h15v5h-5v11H6V12H1Zm15 3h6l-5 13h-6Zm8-3h6l-7 16h-6Z" /><circle cx="20" cy="3" r="3" /></svg>
      : platform === 'mt5' ? <><svg viewBox="0 0 28 24" fill="currentColor"><circle cx="8" cy="5" r="4" /><circle cx="20" cy="5" r="4" /><circle cx="14" cy="12" r="4" /><path d="M1 19a7 7 0 0 1 7-7v6h4v6H1Zm26 0a7 7 0 0 0-7-7v6h-4v6h11Z" /></svg><b>5</b></>
      : platform === 'ctrader' ? <b className="why-wordmark">cTrader</b>
      : <b className="why-wordmark why-bybit">BYB<span>I</span>T</b>}
  </span>
}