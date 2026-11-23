import * as React from 'react'
import { Body, Button, Container, Heading, Html, Preview, Section, Text } from '@react-email/components'
import { EmailHead, LogoHeader, shellStyles as s, COLORS, INTER } from './_shared'
import type { TemplateEntry } from './registry'

interface Props {
  planName?: string
  months?: number
  code?: string
  perks?: string[]
  redeemBy?: string
  redeemUrl?: string
  note?: string
}

const PlanGiftEmail = ({
  planName = 'Pro',
  months = 1,
  code = 'JNV-PRO-1M-XXXX-XXXX',
  perks = [],
  redeemBy,
  redeemUrl = 'https://dash.jenvu.com/billing',
  note,
}: Props) => {
  const duration = months === 1 ? '1 month' : `${months} months`
  return (
    <Html lang="en" dir="ltr">
      <EmailHead />
      <Preview>{`Your Jenvu ${planName} promo code for ${duration} is inside.`}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <LogoHeader />
          <Section style={s.card}>
            <Heading as="h1" style={s.h1}>
              You've received Jenvu {planName}
            </Heading>
            <Text style={{ ...s.text, textAlign: 'center' as const }}>
              Here is your promo code for <strong>{duration}</strong> of the{' '}
              <strong>{planName}</strong> plan. Apply it from Billing to start right away.
            </Text>

            <Section style={codeCard}>
              <Text style={codeLabel}>Your promo code</Text>
              <Text style={codeValue}>{code}</Text>
              <table role="presentation" cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto', borderCollapse: 'collapse' as const }}>
                <tbody>
                  <tr>
                    <td style={chip}>{planName}</td>
                    <td style={{ width: '8px' }} />
                    <td style={chip}>{duration}</td>
                  </tr>
                </tbody>
              </table>
              {redeemBy && <Text style={codeHint}>Apply by {redeemBy}</Text>}
            </Section>

            {note && <Text style={{ ...s.text, textAlign: 'center' as const, color: COLORS.body }}>{note}</Text>}

            {perks.length > 0 && (
              <Section style={perkBox}>
                <Text style={sectionLabel}>What {planName} includes</Text>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: 'collapse' as const }}>
                  <tbody>
                    {perks.map((p, i) => (
                      <tr key={i}>
                        <td style={tickCell}>✓</td>
                        <td style={perkText}>{p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            <Section style={s.actionWrap}>
              <Button href={redeemUrl} style={s.button}>Apply promo code</Button>
            </Section>

            <Section style={stepsBox}>
              <Text style={sectionLabel}>How to apply</Text>
              {[
                'Sign in to Jenvu with this email address.',
                'Open Billing and press "Redeem promo code".',
                'Paste the code and press Apply. Your plan starts at once.',
              ].map((t, i) => (
                <table key={i} role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: 'collapse' as const }}>
                  <tbody>
                    <tr>
                      <td style={stepNum}>{i + 1}</td>
                      <td style={stepText}>{t}</td>
                    </tr>
                  </tbody>
                </table>
              ))}
            </Section>

            <Text style={{ ...s.footer, textAlign: 'center' as const, marginTop: '22px' }}>
              This code works only for this email address and can be used once. Keep it private.
              Didn't expect this? You can ignore this email.
            </Text>
            <Text style={s.legal}>Jenvu · Promo codes</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const codeCard = {
  backgroundColor: COLORS.codeBg,
  borderRadius: '12px',
  padding: '24px 16px 22px',
  margin: '20px 0 24px',
  textAlign: 'center' as const,
}
const codeLabel = { fontFamily: INTER, fontSize: '12px', fontWeight: 500 as const, color: COLORS.muted, margin: '0 0 10px', textAlign: 'center' as const }
const codeValue = {
  fontFamily: INTER,
  fontSize: '19px',
  fontWeight: 500 as const,
  color: COLORS.ink,
  letterSpacing: '0.04em',
  margin: '0 0 14px',
  textAlign: 'center' as const,
  whiteSpace: 'nowrap' as const,
}
const chip = {
  fontFamily: INTER,
  fontSize: '12px',
  fontWeight: 500 as const,
  color: COLORS.ink,
  backgroundColor: '#ffffff',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '999px',
  padding: '4px 12px',
  whiteSpace: 'nowrap' as const,
}
const codeHint = { fontFamily: INTER, fontSize: '12px', color: COLORS.soft, margin: '12px 0 0', textAlign: 'center' as const }
const perkBox = { border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '18px 20px 12px', margin: '0 0 8px' }
const stepsBox = { border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '18px 20px 12px', margin: '0' }
const sectionLabel = { fontFamily: INTER, fontSize: '13px', fontWeight: 500 as const, color: COLORS.ink, margin: '0 0 10px' }
const tickCell = { width: '22px', verticalAlign: 'top' as const, fontFamily: INTER, fontSize: '14px', color: '#188038', padding: '0 0 8px', lineHeight: '1.5' }
const perkText = { verticalAlign: 'top' as const, fontFamily: INTER, fontSize: '14px', color: COLORS.body, padding: '0 0 8px', lineHeight: '1.5' }
const stepNum = {
  width: '22px',
  verticalAlign: 'top' as const,
  fontFamily: INTER,
  fontSize: '13px',
  fontWeight: 500 as const,
  color: COLORS.muted,
  padding: '0 0 8px',
  lineHeight: '1.55',
}
const stepText = { verticalAlign: 'top' as const, fontFamily: INTER, fontSize: '14px', color: COLORS.body, padding: '0 0 8px', lineHeight: '1.55' }

export default PlanGiftEmail

export const template = {
  component: PlanGiftEmail,
  subject: (d: Record<string, any>) =>
    `Your Jenvu ${d?.planName || 'Pro'} promo code (${Number(d?.months) === 1 || !d?.months ? '1 month' : `${d.months} months`})`,
  displayName: 'Plan promo code',
  previewData: {
    planName: 'Elite',
    months: 5,
    code: 'JNV-ELITE-5M-7K3Q-X9PD',
    perks: ['$70 API credit every month', 'JX Bot with a 4% daily target on 3 IPs', '16 hours of Terminal strategies a day', '5 API keys, 40 requests per minute'],
    redeemBy: '23 Dec 2026',
    redeemUrl: 'https://dash.jenvu.com/billing',
  },
} satisfies TemplateEntry
