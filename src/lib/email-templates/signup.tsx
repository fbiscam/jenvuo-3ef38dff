import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => {
  const code = token || '••••••'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your Jenvu verification code: {code} — activate your desk.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Terminal header */}
          <Section style={terminalHeader}>
            <div style={dotsWrap}>
              <span style={dot} />
              <span style={dot} />
              <span style={dot} />
            </div>
            <Text style={terminalLabel}>
              JENVU // AUTH_SESSION
            </Text>
            <Text style={terminalStatus}>ENCRYPTION · AES-256</Text>
          </Section>

          {/* Body card */}
          <Section style={card}>
            <Text style={eyebrow}>VERIFY_EMAIL // ACTIVATE_DESK</Text>
            <Heading as="h1" style={h1}>
              Confirm your desk.
            </Heading>
            <Text style={text}>
              Welcome to <strong style={brand}>{siteName}</strong>. Enter the
              6-digit code below on the sign-up screen to activate
              voice-native institutional intelligence for{' '}
              <span style={muted}>{recipient}</span>.
            </Text>

            {/* OTP CODE — hero block */}
            <Section style={codeBox}>
              <Text style={codeLabel}>YOUR VERIFICATION CODE</Text>
              <Text style={codeStyle}>{code}</Text>
              <Text style={codeExpiry}>Expires in 60 minutes · One-time use</Text>
            </Section>

            {/* Instructions */}
            <Text style={stepsHeading}>HOW TO USE</Text>
            <Text style={step}>
              <strong style={stepNum}>1.</strong> Return to the JENVU sign-up
              tab where you created your account.
            </Text>
            <Text style={step}>
              <strong style={stepNum}>2.</strong> Enter the 6-digit code above
              in the verification field.
            </Text>
            <Text style={step}>
              <strong style={stepNum}>3.</strong> Your desk activates
              automatically — no link required.
            </Text>

            <Hr style={hr} />

            <Text style={fallbackHeading}>OR ONE-TAP LINK</Text>
            <Text style={text}>
              Prefer a link? Tap below to verify and open your desk directly.
            </Text>
            <Link href={confirmationUrl} style={button}>
              Verify & Open Desk →
            </Link>

            <Hr style={hr} />

            <Text style={footer}>
              You're receiving this because someone used{' '}
              <span style={muted}>{recipient}</span> to sign up at{' '}
              <Link href={siteUrl} style={footerLink}>
                {siteName}
              </Link>
              . If that wasn't you, ignore this email — no account is created
              without a verified code.
            </Text>
            <Text style={legal}>
              JENVU · Voice-native gold trading intelligence · {siteUrl.replace(/^https?:\/\//, '')}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

/* --------- styles: JENVU terminal aesthetic --------- */
const MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const SANS =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

const main = {
  backgroundColor: '#f5f5f4',
  fontFamily: SANS,
  padding: '32px 12px',
  margin: 0,
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e4e4e7',
  overflow: 'hidden',
  boxShadow: '0 20px 40px -20px rgba(0,0,0,0.08)',
}

const terminalHeader = {
  padding: '14px 20px',
  borderBottom: '1px solid #f1f1f1',
  backgroundColor: '#fafafa',
}

const dotsWrap = { display: 'inline-block', verticalAlign: 'middle' }

const dot = {
  display: 'inline-block',
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  backgroundColor: '#e4e4e7',
  marginRight: '6px',
}

const terminalLabel = {
  display: 'inline-block',
  margin: '0 0 0 8px',
  fontFamily: MONO,
  fontSize: '10px',
  letterSpacing: '0.2em',
  color: '#18181b',
  textTransform: 'uppercase' as const,
  verticalAlign: 'middle',
}

const terminalStatus = {
  float: 'right' as const,
  margin: 0,
  fontFamily: MONO,
  fontSize: '10px',
  letterSpacing: '0.15em',
  color: '#a1a1aa',
}

const card = { padding: '32px 28px 24px' }

const eyebrow = {
  fontFamily: MONO,
  fontSize: '11px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  color: '#a1a1aa',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
}

const h1 = {
  fontFamily: SANS,
  fontSize: '26px',
  fontWeight: 600 as const,
  color: '#09090b',
  letterSpacing: '-0.01em',
  margin: '0 0 14px',
  lineHeight: '1.2',
}

const text = {
  fontFamily: SANS,
  fontSize: '14px',
  color: '#52525b',
  lineHeight: '1.65',
  margin: '0 0 20px',
}

const brand = { color: '#09090b' }
const muted = { color: '#71717a', fontFamily: MONO, fontSize: '13px' }

const codeBox = {
  backgroundColor: '#09090b',
  borderRadius: '12px',
  padding: '22px 20px',
  margin: '20px 0 24px',
  textAlign: 'center' as const,
  border: '1px solid #18181b',
}

const codeLabel = {
  fontFamily: MONO,
  fontSize: '10px',
  fontWeight: 700 as const,
  letterSpacing: '0.28em',
  color: '#a1a1aa',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
}

const codeStyle = {
  fontFamily: MONO,
  fontSize: '36px',
  fontWeight: 700 as const,
  color: '#ffffff',
  letterSpacing: '0.35em',
  margin: '0 0 10px',
  padding: '0 0 0 12px', // offset for letter-spacing
}

const codeExpiry = {
  fontFamily: MONO,
  fontSize: '10px',
  color: '#71717a',
  letterSpacing: '0.15em',
  margin: 0,
  textTransform: 'uppercase' as const,
}

const stepsHeading = {
  fontFamily: MONO,
  fontSize: '10px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  color: '#71717a',
  textTransform: 'uppercase' as const,
  margin: '4px 0 10px',
}

const step = {
  fontFamily: SANS,
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '0 0 6px',
}

const stepNum = {
  fontFamily: MONO,
  color: '#09090b',
  marginRight: '6px',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #f1f1f1',
  margin: '24px 0',
}

const fallbackHeading = {
  fontFamily: MONO,
  fontSize: '10px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  color: '#71717a',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}

const button = {
  display: 'inline-block',
  backgroundColor: '#09090b',
  color: '#ffffff',
  fontFamily: SANS,
  fontSize: '14px',
  fontWeight: 500 as const,
  borderRadius: '10px',
  padding: '12px 22px',
  textDecoration: 'none',
  margin: '4px 0 0',
}

const footer = {
  fontFamily: SANS,
  fontSize: '12px',
  color: '#a1a1aa',
  lineHeight: '1.6',
  margin: '0 0 10px',
}

const footerLink = {
  color: '#52525b',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

const legal = {
  fontFamily: MONO,
  fontSize: '10px',
  color: '#d4d4d8',
  letterSpacing: '0.1em',
  margin: '18px 0 0',
  textTransform: 'uppercase' as const,
}
