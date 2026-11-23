import * as React from 'react'
import { Head, Img, Link, Section, Text } from '@react-email/components'

import { EMAIL_ART, type EmailArtKind } from './_visuals'

export const SITE_URL = 'https://jenvu.com'
/** Borderless J mark (no outer rounded box), used in every email masthead. */
export const LOGO_URL = `${SITE_URL}/email-logo.png`

/**
 * Shared design tokens for Jenvu emails — clean, minimal, professional.
 * Google Sans for everything (headings, body, labels, and code digits),
 * matching the Jenvu product UI.
 */
export const INTER =
  "'Google Sans Flex', 'Google Sans', 'Google Sans Normal', 'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// Legacy aliases so existing templates keep compiling without edits.
export const URBANIST = INTER
export const MONO = INTER

export const COLORS = {
  bg: '#ffffff',
  card: '#ffffff',
  ink: '#202124',
  body: '#3c4043',
  muted: '#5f6368',
  soft: '#70757a',
  border: '#dadce0',
  hairline: '#dadce0',
  accent: '#111111',
  link: '#202124',
  codeBg: '#f5f7f8',
  notice: '#e8f2ee',
  warning: '#fceeee',
  success: '#188038',
  danger: '#b3261e',
}

/** Load Google Sans inside <Head>. Falls back to system sans-serif when web fonts are blocked. */
export const EmailFonts = () => (
  <>
    <link
      rel="preconnect"
      href="https://fonts.googleapis.com"
    />
    <link
      rel="preconnect"
      href="https://fonts.gstatic.com"
      crossOrigin=""
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&family=Google+Sans:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
  </>
)


/** Centered logo + Jenvu wordmark, Replit-style masthead. */
export const LogoHeader = (_props: { tagline?: string } = {}) => (
  <Section style={logoWrap}>
    <table
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      align="center"
      style={{ borderCollapse: 'collapse' as const, margin: '0 auto' }}
    >
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle' }}>
            <Img
              src={LOGO_URL}
              width="26"
              height="26"
              alt="Jenvu"
              style={{ display: 'block', border: 0, outline: 'none' }}
            />
          </td>
          <td style={{ paddingLeft: '10px', verticalAlign: 'middle' }}>
            <Text style={logoWord}>Jenvu</Text>
          </td>
        </tr>
      </tbody>
    </table>
  </Section>
)

const logoWrap = {
  padding: '32px 24px 0',
  backgroundColor: '#ffffff',
  textAlign: 'center' as const,
}

const logoWord = {
  margin: 0,
  fontFamily: '"Google Sans Flex","Google Sans","Google Sans Normal",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
  fontSize: '22px',
  fontWeight: 400 as const,
  letterSpacing: '0',
  color: COLORS.ink,
  lineHeight: '1',
}

/** Shared container / body styles reused across all templates. */
export const shellStyles = {
  main: {
    backgroundColor: COLORS.bg,
    fontFamily: INTER,
    padding: '24px 10px',
    margin: 0,
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: COLORS.card,
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden' as const,
  },
  card: { padding: '24px 24px 28px', overflowWrap: 'anywhere' as const },
  eyebrow: {
    fontFamily: INTER,
    fontSize: '12px',
    fontWeight: 500 as const,
    letterSpacing: '0',
    color: COLORS.muted,
    margin: '0 0 8px',
  },
  h1: {
    fontFamily: INTER,
    fontSize: '26px',
    fontWeight: 400 as const,
    color: COLORS.ink,
    letterSpacing: '0',
    margin: '0 0 18px',
    padding: '0',
    borderBottom: 'none',
    textAlign: 'center' as const,
    lineHeight: '1.33',
  },
  text: {
    fontFamily: INTER,
    fontSize: '15px',
    color: COLORS.ink,
    lineHeight: '1.65',
    margin: '0 0 16px',
    fontWeight: 400 as const,
  },
  hr: {
    border: 'none',
    borderTop: `1px solid ${COLORS.hairline}`,
    margin: '24px 0',
  },
  button: {
    display: 'inline-block',
    backgroundColor: COLORS.accent,
    color: COLORS.card,
    border: `1px solid ${COLORS.accent}`,
    fontFamily: INTER,
    fontSize: '14px',
    fontWeight: 500 as const,
    borderRadius: '999px',
    padding: '13px 26px',
    textDecoration: 'none',
    margin: '4px 0 0',

  },

  actionWrap: {
    textAlign: 'center' as const,
    margin: '24px 0 20px',
  },

  footer: {
    fontFamily: INTER,
    fontSize: '12px',
    color: COLORS.muted,
    lineHeight: '1.6',
    margin: '0 0 10px',
    fontWeight: 400 as const,
  },
  link: {
    color: COLORS.link,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  footerLink: {
    color: COLORS.body,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  legal: {
    fontFamily: INTER,
    fontSize: '12px',
    color: COLORS.soft,
    letterSpacing: '0',
    margin: '24px 0 0',
    textAlign: 'center' as const,
    fontWeight: 400 as const,
  },
  codeBox: {
    backgroundColor: COLORS.codeBg,
    borderRadius: '8px',
    padding: '22px 20px',
    margin: '18px 0 22px',
    textAlign: 'center' as const,
    border: 'none',
  },
  codeLabel: {
    fontFamily: INTER,
    fontSize: '12px',
    fontWeight: 500 as const,
    letterSpacing: '0',
    color: COLORS.muted,
    margin: '0 0 10px',
  },
  codeValue: {
    fontFamily: INTER,
    fontSize: '32px',
    fontWeight: 500 as const,
    color: COLORS.ink,
    letterSpacing: '0',
    margin: '0 0 10px',
    padding: '0 0 0 6px',
  },
  codeExpiry: {
    fontFamily: INTER,
    fontSize: '12px',
    color: COLORS.soft,
    letterSpacing: '0',
    margin: 0,
    fontWeight: 400 as const,
  },
}

/** Convenience <Head> that already includes the font loader. */
export const EmailHead = () => (
  <Head>
    <EmailFonts />
  </Head>
)

/** Recipient is optional: never show an invented address in an actual email. */
export const AccountPill = ({ recipient }: { recipient?: string }) => recipient ? (
  <Section style={{ textAlign: 'center', margin: '0 0 22px' }}>
    <Text style={{ display: 'inline-block', border: `1px solid ${COLORS.border}`, borderRadius: '999px', padding: '7px 12px', margin: 0, color: COLORS.body, fontSize: '13px', lineHeight: '1.5', overflowWrap: 'anywhere', maxWidth: '100%', boxSizing: 'border-box' }}>
      <span aria-hidden="true">◎ &nbsp;</span>{recipient}
    </Text>
  </Section>
) : null

export const EmailIllustration = ({ kind = 'security' }: { kind?: EmailArtKind }) => (
  <Section style={{ borderTop: `1px solid ${COLORS.hairline}`, padding: '24px 0', textAlign: 'center' }}>
    <Img src={EMAIL_ART[kind]} width="160" alt={kind === 'gift' ? 'Gift and promo ticket' : kind === 'billing' ? 'Payment receipt' : 'Account and security'} style={{ display: 'block', width: '160px', maxWidth: '100%', height: 'auto', margin: '0 auto' }} />
  </Section>
)

export const EmailNotice = ({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' }) => (
  <Section style={{ padding: '16px 18px', backgroundColor: tone === 'warning' ? COLORS.warning : COLORS.notice, borderRadius: '8px', margin: '0 0 22px' }}>
    <Text style={{ ...shellStyles.text, fontSize: '14px', margin: 0 }}>{children}</Text>
  </Section>
)

export const EmailFooter = () => (
  <Section style={{ borderTop: `1px solid ${COLORS.hairline}`, paddingTop: '18px', marginTop: '24px', textAlign: 'center' }}>
    <Text style={shellStyles.footer}>This email concerns your Jenvu account or a request you made.</Text>
    <Text style={{ ...shellStyles.footer, margin: 0 }}>
      <Link href="https://support.jenvu.com" style={shellStyles.footerLink}>Help</Link>
      {' · '}<Link href="https://jenvu.com/privacy" style={shellStyles.footerLink}>Privacy</Link>
      {' · '}Jenvu
    </Text>
  </Section>
)
