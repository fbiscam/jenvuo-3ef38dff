import * as React from 'react'
import {
  Body,
  Container,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { EmailHead, LogoHeader, shellStyles as s, COLORS } from './_shared'
import type { TemplateEntry } from './registry'

interface Props {
  recipient?: string
  fullName?: string
  siteUrl?: string
}

const SITE = 'https://jenvu.com'
const DASH = 'https://dash.jenvu.com'

const listItem: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '15px',
  color: COLORS.body,
  lineHeight: '1.6',
  margin: '0 0 8px',
}
const linkStyle: React.CSSProperties = {
  color: COLORS.ink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}
const fineprint: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '12px',
  color: COLORS.soft,
  lineHeight: '1.6',
  margin: '24px 0 0',
}

const WelcomeEmail = ({
  recipient = 'trader@jenvu.com',
  fullName,
  siteUrl = SITE,
}: Props) => {
  const first = fullName?.split(/\s+/)[0]
  return (
    <Html lang="en" dir="ltr">
      <EmailHead />
      <Preview>Welcome to Jenvu — your trading desk is ready</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <LogoHeader />

          <Section style={s.card}>
            <Heading style={s.h1}>
              {first ? `Welcome, ${first}` : 'Welcome to Jenvu'}
            </Heading>
            <Text style={s.text}>
              You&apos;re in. Jenvu brings live charts, AI analysis and 60+ AI
              models together for Gold (XAU/USD), Bitcoin (BTC/USD) and EUR/USD.
            </Text>

            <Text style={{ ...s.text, marginTop: 20, fontWeight: 500, color: COLORS.ink }}>
              Get started:
            </Text>
            <Text style={listItem}>
              1. Open the{' '}
              <Link href={`${DASH}/terminal`} style={linkStyle}>Terminal</Link>{' '}
              — live candles and market structure for all three pairs.
            </Text>
            <Text style={listItem}>
              2. Ask anything in{' '}
              <Link href={`${DASH}/chat`} style={linkStyle}>Chat</Link>{' '}
              — pick from 60+ AI models in one place.
            </Text>
            <Text style={listItem}>
              3. Build with the{' '}
              <Link href={`${DASH}/api`} style={linkStyle}>Jenvu API</Link>{' '}
              — one key for every model.
            </Text>
            <Text style={listItem}>
              4. Start your free trial from the{' '}
              <Link href={`${DASH}/overview`} style={linkStyle}>Dashboard</Link>{' '}
              — $100 in credit and 14 days of Pro, no charge when it ends.
            </Text>

            <Section style={{ textAlign: 'center', marginTop: 28 }}>
              <Link href={`${DASH}/overview`} style={s.button}>
                Open Dashboard
              </Link>
            </Section>

            <Text style={fineprint}>
              Trading involves risk; Jenvu gives analysis, not guaranteed results. Questions? Reply to this email or visit support.jenvu.com.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: WelcomeEmail,
  subject: 'Welcome to Jenvu — your desk is ready',
  displayName: 'Welcome email',
  previewData: {
    recipient: 'trader@jenvu.com',
    fullName: 'Alex Trader',
    siteUrl: SITE,
  },
}
