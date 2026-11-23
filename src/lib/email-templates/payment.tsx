import * as React from 'react'
import { Body, Button, Container, Heading, Html, Preview, Section, Text } from '@react-email/components'
import { AccountPill, EmailFooter, EmailHead, EmailIllustration, EmailNotice, LogoHeader, shellStyles as s, COLORS } from './_shared'

export interface PaymentEmailProps {
  kind: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'renewal'
  recipient?: string
  amount: string
  credit?: string
  reference?: string
  network?: string
  transaction?: string
  reason?: string
  bonus?: string
  promo?: string
}

const TITLES = { submitted: 'Your payment is being verified', approved: 'Payment approved', rejected: 'Payment could not be approved', cancelled: 'Payment cancelled', renewal: 'Your plan renewal' }

export const PaymentEmail = ({ kind, recipient, amount, credit, reference, network, transaction, reason, bonus, promo }: PaymentEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead /><Preview>{TITLES[kind]}</Preview>
    <Body style={s.main}><Container style={s.container}><LogoHeader />
      <Section style={s.card}>
        <Heading style={s.h1}>{TITLES[kind]}</Heading>
        <AccountPill recipient={recipient} />
        {kind === 'rejected' || kind === 'cancelled' ? <Text style={{ ...s.eyebrow, textAlign: 'center', color: COLORS.danger }}>No credit was added</Text> : <EmailIllustration kind="billing" />}
        <EmailNotice tone={kind === 'rejected' || kind === 'cancelled' ? 'warning' : 'info'}>
          {kind === 'submitted' ? 'We received your transaction. Your payment is being checked before credit is added.' : kind === 'approved' ? `Your payment is confirmed. $${credit ?? amount} API credit has been added to your account.` : kind === 'renewal' ? 'Review your renewal details on Billing.' : 'Your payment was not completed. You can review it on Billing or contact support for a re-check.'}
        </EmailNotice>
        <Section style={{ padding: '4px 16px', backgroundColor: COLORS.codeBg, borderRadius: '8px', marginBottom: '20px' }}>
          {[
            ['Reference', reference ? `#${reference}` : undefined], ['Amount', `$${amount} USDT`], ['Network', network],
            [kind === 'submitted' ? 'Credit on approval' : 'API credit added', kind === 'rejected' || kind === 'cancelled' ? undefined : credit ? `$${credit}` : undefined], ['Bonus', bonus ? `$${bonus}` : undefined], ['Promo', promo], ['Transaction', transaction], ['Reason', reason],
          ].map(([label, value]) => value ? <Text key={label} style={{ ...s.text, fontSize: '13px', padding: '10px 0', margin: 0, borderBottom: `1px solid ${COLORS.hairline}`, overflowWrap: 'anywhere' }}><span style={{ color: COLORS.muted }}>{label}</span><br /><strong>{value}</strong></Text> : null)}
        </Section>
        <Section style={s.actionWrap}><Button href="https://dash.jenvu.com/billing" style={s.button}>Open billing</Button></Section>
        <Text style={s.footer}>Questions about this payment? Contact support@jenvu.com with your reference and transaction ID.</Text>
        <EmailFooter />
      </Section>
    </Container></Body>
  </Html>
)