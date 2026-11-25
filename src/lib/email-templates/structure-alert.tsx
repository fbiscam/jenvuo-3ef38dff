import React from 'react'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFonts } from './_shared'

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

const row = { fontSize: '14px', color: '#111111', margin: '4px 0' }

const Email = ({
  pair = 'EUR/USD', timeframe = '1H', label = 'LH', price = '1.09720',
  swingTime = '', confirmedTime = '', priceAction = null, sweep = null,
  chartUrl = 'https://dash.jenvu.com/terminal',
}: Props) => (
  <Html lang="en">
    <Head><EmailFonts /></Head>
    <Preview>{`${pair} ${timeframe}: fresh ${label} at ${price}`}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: "'Google Sans Flex', Arial, sans-serif" }}>
      <Container style={{ padding: '24px', maxWidth: '560px' }}>
        <Heading style={{ fontSize: '20px', color: '#111111', margin: '0 0 16px' }}>
          {`Fresh ${label} on ${pair} (${timeframe})`}
        </Heading>
        <Section>
          <Text style={row}>{`Pair: ${pair}`}</Text>
          <Text style={row}>{`Timeframe: ${timeframe}`}</Text>
          <Text style={row}>{`Structure: ${label}`}</Text>
          <Text style={row}>{`Swing price: ${price}`}</Text>
          {swingTime ? <Text style={row}>{`Swing candle: ${swingTime}`}</Text> : null}
          {confirmedTime ? <Text style={row}>{`Confirmed: ${confirmedTime}`}</Text> : null}
          <Text style={{ ...row, marginTop: '12px' }}>
            {`Signal: ${priceAction && sweep ? 'Price action + liquidity sweep' : priceAction ? 'Price action' : 'Liquidity sweep'}`}
          </Text>
          {priceAction ? <Text style={row}>{`Price action: ${priceAction}`}</Text> : null}
          {sweep ? <Text style={row}>{`Liquidity sweep: ${sweep}`}</Text> : null}
        </Section>
        <Link href={chartUrl} style={{ display: 'inline-block', marginTop: '16px', background: '#111111', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none' }}>
          Open Terminal
        </Link>
        <Text style={{ fontSize: '12px', color: '#666666', marginTop: '24px' }}>
          Chart analysis only, not financial advice or a guaranteed outcome.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Fresh ${d.label ?? ''} on ${d.pair ?? ''} ${d.timeframe ?? ''} at ${d.price ?? ''}`,
  displayName: 'Fresh high/low alert',
  previewData: { pair: 'EUR/USD', timeframe: '1H', label: 'LH', price: '1.09720', swingTime: '2026-11-25 08:00 UTC', confirmedTime: '2026-11-25 18:00 UTC', priceAction: '✓ Pin rejection · Sellers', sweep: 'BSL swept' },
} satisfies TemplateEntry
