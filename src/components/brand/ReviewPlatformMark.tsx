import { SiBinance, SiTradingview, SiX } from 'react-icons/si'
import metaTraderLogo from '@/assets/metatrader5-logo.png.asset.json'

export type ReviewPlatform = 'x' | 'mt5' | 'binance' | 'tradingview'

/** Decorative platform marks on illustrative reviews; not endorsements. */
export function ReviewPlatformMark({ platform }: { platform: ReviewPlatform }) {
  const names = { x: 'X', mt5: 'MetaTrader 5', binance: 'Binance', tradingview: 'TradingView' }
  return <span className={`why-review-platform why-platform-${platform}`} role="img" aria-label={`${names[platform]} decorative mark`}>
    {platform === 'x' ? <SiX /> : platform === 'binance' ? <SiBinance /> : platform === 'tradingview' ? <SiTradingview /> : <img src={new URL(metaTraderLogo.url, 'https://jenvu.com').href} alt="" width={30} height={30} loading="lazy" />}
  </span>
}