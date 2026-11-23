import security from '@/assets/email/security.png.asset.json'
import gift from '@/assets/email/gift.png.asset.json'
import billing from '@/assets/email/billing.png.asset.json'

export const EMAIL_ART = {
  security: `https://jenvu.com${security.url}`,
  gift: `https://jenvu.com${gift.url}`,
  billing: `https://jenvu.com${billing.url}`,
}
export type EmailArtKind = keyof typeof EMAIL_ART