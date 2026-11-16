import { SiBinance, SiTradingview, SiCoinbase, SiRobinhood, SiKucoin } from 'react-icons/si'
import metaTraderLogo from '@/assets/metatrader5-logo.png.asset.json'
import etoroLogo from '@/assets/etoro-logo.png.asset.json'
import webullLogo from '@/assets/webull-logo.png.asset.json'
import trading212Logo from '@/assets/trading212-logo.png.asset.json'

const imageMarks = { mt5: metaTraderLogo, etoro: etoroLogo, webull: webullLogo, trading212: trading212Logo }
const iconMarks = { binance: SiBinance, tradingview: SiTradingview, coinbase: SiCoinbase, robinhood: SiRobinhood, kucoin: SiKucoin }
export type ReviewPlatform = keyof typeof imageMarks | keyof typeof iconMarks

/** Decorative platform marks on illustrative reviews; not endorsements. */
export function ReviewPlatformMark({ platform }: { platform: ReviewPlatform }) {
  const names = { mt5: 'MetaTrader 5', binance: 'Binance', tradingview: 'TradingView', etoro: 'eToro', webull: 'Webull', trading212: 'Trading 212', coinbase: 'Coinbase', robinhood: 'Robinhood', kucoin: 'KuCoin' }
  const image = platform in imageMarks ? imageMarks[platform as keyof typeof imageMarks] : undefined
  const Icon = platform in iconMarks ? iconMarks[platform as keyof typeof iconMarks] : undefined
  return <span className={`why-review-platform why-platform-${platform}`} role="img" aria-label={`${names[platform]} decorative mark`}>
    {Icon ? <Icon /> : image ? <img src={new URL(image.url, 'https://jenvu.com').href} alt="" width={30} height={30} loading="lazy" /> : null}
  </span>
}