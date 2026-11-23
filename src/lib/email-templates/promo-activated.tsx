import * as React from 'react'
import { Body, Button, Container, Heading, Html, Preview, Section, Text } from '@react-email/components'
import { AccountPill, EmailFooter, EmailHead, EmailIllustration, EmailNotice, LogoHeader, shellStyles as s, COLORS } from './_shared'
import type { TemplateEntry } from './registry'

export interface PromoActivatedProps {
  recipient?: string
  kind?: 'plan' | 'credit'
  planName?: string
  creditAmount?: number
  planEndsAt?: string
  creditExpiresAt?: string
}

const dateLabel = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(value))} UTC`
  : 'See Billing for your expiry date'

const PromoActivatedEmail = ({ recipient, kind = 'credit', planName = 'Pro', creditAmount = 0, planEndsAt, creditExpiresAt }: PromoActivatedProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>{kind === 'plan' ? `Your Jenvu ${planName} gift plan is active.` : `Your $${creditAmount.toFixed(2)} API-credit gift is active.`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
          <Heading as="h1" style={s.h1}>{kind === 'plan' ? `Your ${planName} gift is active` : 'Your API-credit gift is active'}</Heading>
          <AccountPill recipient={recipient} />
          <EmailIllustration kind="gift" />
          <Text style={{ ...s.text, textAlign: 'center' }}>{kind === 'plan' ? `Your promo code has activated the ${planName} plan on your account. No payment is needed for this gift.` : `Your promo code has added $${creditAmount.toFixed(2)} in API credit to your account. Your existing plan is unchanged.`}</Text>
          <Section style={{ backgroundColor: COLORS.codeBg, borderRadius: '8px', padding: '20px', margin: '24px 0' }}>
            {kind === 'plan' && <><Text style={s.text}><strong>Active plan: {planName}</strong></Text><Text style={s.text}>Plan active until<br /><strong>{dateLabel(planEndsAt)}</strong></Text></>}
            <Text style={s.text}>{kind === 'plan' ? 'Monthly API credit' : 'API credit added'}: <strong>${creditAmount.toFixed(2)}</strong></Text>
            <Text style={s.text}>Use this credit before<br /><strong>{dateLabel(creditExpiresAt)}</strong></Text>
          </Section>
          <EmailNotice>{kind === 'plan' ? 'Use your gifted features before the plan end date. Without an approved renewal, your account returns to Free. Each monthly credit grant has its own expiry date; unused credit expires and does not roll over.' : 'Use your gifted API credit before the expiry date above. Any unused gift credit expires automatically. Redeeming this credit does not change or renew your plan.'}</EmailNotice>
          <Section style={s.actionWrap}><Button href="https://dash.jenvu.com/billing" style={s.button}>View your account</Button></Section>
          <EmailFooter />
        </Section>
      </Container>
    </Body>
  </Html>
)

export default PromoActivatedEmail
export const template = {
  component: PromoActivatedEmail,
  subject: (data: Record<string, any>) => data['kind'] === 'plan' ? `Your Jenvu ${data['planName'] || 'gift'} plan is active` : 'Your Jenvu API-credit gift is active',
  displayName: 'Promo gift activated',
  previewData: { kind: 'plan', planName: 'Elite', creditAmount: 70, planEndsAt: '2027-02-21T07:37:00Z', creditExpiresAt: '2026-12-23T07:37:00Z' },
} satisfies TemplateEntry