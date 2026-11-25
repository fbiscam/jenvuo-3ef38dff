import * as React from 'react'
import { Body, Container, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHead, EmailNotice, LogoHeader, shellStyles as s, COLORS } from './_shared'

interface Props {
  pair?: string
  timeframe?: string
  label?: string
  price?: string
  swingTime?: string
  confirmedTime?: string
  priceAction?: string | null
  sweep?: string | null
  chartUrl?: string
}

const BULL = new Set(['HH', 'HL'])

const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <tr>
    <td style={iconCell}><span style={iconBadge}>{icon}</span></td>
    <td style={labelCell}>{label}</td>
    <td style={valueCell}>{value}</td>
  </tr>
)

const Email = ({
  pair = 'EUR/USD', timeframe = '1H', label = 'LH', price = '1.09720',
  swingTime = '', confirmedTime = '', priceAction = null, sweep = null,
  chartUrl = 'https://dash.jenvu.com/terminal',
}: Props) => {
  const bull = BULL.has(label)
  const tone = bull ? COLORS.success : COLORS.danger
  const signal = priceAction && sweep ? 'Price action + liquidity sweep' : priceAction ? 'Price action' : 'Liquidity sweep'
  return (
    <Html lang="en" dir="ltr">
      <EmailHead />
      <Preview>{`${pair} ${timeframe}: fresh ${label} at ${price}`}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <LogoHeader />
          <Section style={s.card}>
            <Section style={{ textAlign: 'center', margin: '0 0 14px' }}>
              <Text style={{ ...pill, color: tone, borderColor: tone }}>
                {bull ? '▲' : '▼'} &nbsp;Fresh {label} · {timeframe}
              </Text>
            </Section>
            <Heading as="h1" style={s.h1}>{`Fresh ${label} on ${pair}`}</Heading>

            <Section style={priceBox}>
              <Text style={priceLabel}>📍 Swing price</Text>
              <Text style={{ ...priceValue, color: tone }}>{price}</Text>
              <Text style={priceHint}>{pair} · {timeframe} chart</Text>
            </Section>

            <table cellPadding={0} cellSpacing={0} role="presentation" style={table}>
              <tbody>
                <DetailRow icon="💱" label="Pair" value={pair} />
                <DetailRow icon="⏱" label="Timeframe" value={timeframe} />
                <DetailRow icon={bull ? '📈' : '📉'} label="Structure" value={label} />
                {swingTime ? <DetailRow icon="🕯" label="Swing candle" value={swingTime} /> : null}
                {confirmedTime ? <DetailRow icon="✅" label="Confirmed" value={confirmedTime} /> : null}
                <DetailRow icon="⚡" label="Signal" value={signal} />
                {priceAction ? <DetailRow icon="🎯" label="Price action" value={priceAction} /> : null}
                {sweep ? <DetailRow icon="💧" label="Liquidity sweep" value={sweep} /> : null}
              </tbody>
            </table>

            <Section style={s.actionWrap}>
              <Link href={chartUrl} style={s.button}>Open Terminal →</Link>
            </Section>

            <EmailNotice tone="warning">
              Chart analysis only, not financial advice or a guaranteed outcome.
            </EmailNotice>

            <EmailFooter />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const pill = { display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '6px 14px', margin: 0, fontSize: '13px', fontWeight: 500 as const }
const priceBox = { border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px', margin: '0 0 20px', textAlign: 'center' as const }
const priceLabel = { fontSize: '12px', color: COLORS.muted, margin: '0 0 6px' }
const priceValue = { fontSize: '34px', fontWeight: 500 as const, margin: '0 0 6px' }
const priceHint = { fontSize: '12px', color: COLORS.soft, margin: 0 }
const table = { width: '100%', borderCollapse: 'collapse' as const, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }
const cellBase = { borderBottom: `1px solid ${COLORS.hairline}`, padding: '11px 12px', fontSize: '14px', verticalAlign: 'middle' as const }
const iconCell = { ...cellBase, width: '36px', paddingRight: 0 }
const iconBadge = { display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', textAlign: 'center' as const, backgroundColor: COLORS.codeBg, borderRadius: '999px', fontSize: '14px' }
const labelCell = { ...cellBase, color: COLORS.muted }
const valueCell = { ...cellBase, color: COLORS.ink, fontWeight: 500 as const, textAlign: 'right' as const }

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Fresh ${d.label ?? ''} on ${d.pair ?? ''} ${d.timeframe ?? ''} at ${d.price ?? ''}`,
  displayName: 'Fresh high/low alert',
  previewData: { pair: 'EUR/USD', timeframe: '1H', label: 'LH', price: '1.09720', swingTime: '2026-11-25 08:00 UTC', confirmedTime: '2026-11-25 18:00 UTC', priceAction: 'Pin rejection · Sellers 84%', sweep: 'BSL swept' },
} satisfies TemplateEntry
