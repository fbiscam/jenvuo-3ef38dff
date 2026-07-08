import * as React from 'react'
import { Font, Head, Img, Section, Text } from '@react-email/components'

export const SITE_URL = 'https://jenvu.com'
export const LOGO_URL = `${SITE_URL}/favicon.png`

/**
 * Shared design tokens for all Jenvu emails.
 * All templates use Urbanist for body/headings and JetBrains Mono for code/labels.
 */
export const URBANIST =
  "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
export const MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

export const COLORS = {
  bg: '#f5f5f4',
  card: '#ffffff',
  ink: '#09090b',
  body: '#3f3f46',
  muted: '#71717a',
  soft: '#a1a1aa',
  border: '#e4e4e7',
  hairline: '#f1f1f1',
  accent: '#09090b',
}

/** Drop this into every <Head /> to load Urbanist across email clients that support web fonts. */
export const EmailFonts = () => (
  <>
    <Font
      fontFamily="Urbanist"
      fallbackFontFamily="Arial"
      webFont={{
        url: 'https://fonts.gstatic.com/s/urbanist/v15/L0xjDF02iFML4hGCyMqrZLlnusK5Wm5hpDwKMDNo6fA.woff2',
        format: 'woff2',
      }}
      fontWeight={400}
      fontStyle="normal"
    />
    <Font
      fontFamily="Urbanist"
      fallbackFontFamily="Arial"
      webFont={{
        url: 'https://fonts.gstatic.com/s/urbanist/v15/L0xjDF02iFML4hGCyMqrZLlnusG_Wmxhpjw.woff2',
        format: 'woff2',
      }}
      fontWeight={600}
      fontStyle="normal"
    />
    <Font
      fontFamily="Urbanist"
      fallbackFontFamily="Arial"
      webFont={{
        url: 'https://fonts.gstatic.com/s/urbanist/v15/L0xjDF02iFML4hGCyMqrZLlnusG_Wmxhpjw.woff2',
        format: 'woff2',
      }}
      fontWeight={700}
      fontStyle="normal"
    />
  </>
)

/** Jenvu terminal-style header — sits at the very top of every email. */
export const LogoHeader = ({
  tagline = 'JENVU · VOICE-NATIVE TERMINAL',
}: {
  tagline?: string
}) => (
  <>
    {/* Row 1 — traffic-light terminal chrome */}
    <Section style={termBar}>
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ borderCollapse: 'collapse' as const }}
      >
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle', width: '40%' }}>
              <span style={dot} />
              <span style={dot} />
              <span style={dot} />
              <span style={termSession}>JENVU // SESSION</span>
            </td>
            <td style={{ verticalAlign: 'middle', textAlign: 'right' as const }}>
              <span style={termStatus}>● LIVE · AES-256</span>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>

    {/* Row 2 — logo mark + wordmark + tagline */}
    <Section style={logoWrap}>
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ borderCollapse: 'collapse' as const }}
      >
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <table cellPadding={0} cellSpacing={0} role="presentation">
                <tbody>
                  <tr>
                    <td style={logoMark}>
                      <Img
                        src={LOGO_URL}
                        width="34"
                        height="34"
                        alt="Jenvu"
                        style={{ display: 'block', borderRadius: '9px' }}
                      />
                    </td>
                    <td style={{ paddingLeft: '10px' }}>
                      <Text style={logoWord}>JENVU</Text>
                      <Text style={logoSub}>/ voice_terminal</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ verticalAlign: 'middle', textAlign: 'right' as const }}>
              <Text style={logoTag}>{tagline}</Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  </>
)

const termBar = {
  padding: '10px 20px',
  backgroundColor: '#09090b',
  borderBottom: '1px solid #18181b',
}

const dot = {
  display: 'inline-block',
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  backgroundColor: '#3f3f46',
  marginRight: '6px',
  verticalAlign: 'middle',
}

const termSession = {
  display: 'inline-block',
  marginLeft: '10px',
  fontFamily: MONO,
  fontSize: '10px',
  letterSpacing: '0.22em',
  color: '#a1a1aa',
  textTransform: 'uppercase' as const,
  verticalAlign: 'middle',
}

const termStatus = {
  fontFamily: MONO,
  fontSize: '10px',
  letterSpacing: '0.18em',
  color: '#4ade80',
  textTransform: 'uppercase' as const,
}

const logoWrap = {
  padding: '16px 24px 14px',
  borderBottom: `1px solid ${COLORS.hairline}`,
  backgroundColor: '#ffffff',
}

const logoMark = {
  width: '34px',
  height: '34px',
  padding: 0,
  verticalAlign: 'middle' as const,
  borderRadius: '9px',
  overflow: 'hidden' as const,
  lineHeight: 0,
}

const logoWord = {
  margin: 0,
  fontFamily: URBANIST,
  fontSize: '16px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  color: COLORS.ink,
  textTransform: 'uppercase' as const,
  lineHeight: '1.1',
}

const logoSub = {
  margin: '2px 0 0',
  fontFamily: MONO,
  fontSize: '9.5px',
  letterSpacing: '0.14em',
  color: COLORS.soft,
  textTransform: 'lowercase' as const,
}

const logoTag = {
  margin: 0,
  fontFamily: MONO,
  fontSize: '9.5px',
  letterSpacing: '0.22em',
  color: COLORS.soft,
  textTransform: 'uppercase' as const,
}

/* Shared container / body styles other templates can reuse. */
export const shellStyles = {
  main: {
    backgroundColor: COLORS.bg,
    fontFamily: URBANIST,
    padding: '32px 12px',
    margin: 0,
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: COLORS.card,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden' as const,
    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.08)',
  },
  card: { padding: '28px 28px 24px' },
  eyebrow: {
    fontFamily: MONO,
    fontSize: '11px',
    fontWeight: 700 as const,
    letterSpacing: '0.2em',
    color: COLORS.soft,
    textTransform: 'uppercase' as const,
    margin: '0 0 10px',
  },
  h1: {
    fontFamily: URBANIST,
    fontSize: '26px',
    fontWeight: 700 as const,
    color: COLORS.ink,
    letterSpacing: '-0.01em',
    margin: '0 0 14px',
    lineHeight: '1.2',
  },
  text: {
    fontFamily: URBANIST,
    fontSize: '14px',
    color: COLORS.body,
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
    backgroundColor: COLORS.ink,
    color: '#ffffff',
    fontFamily: URBANIST,
    fontSize: '14px',
    fontWeight: 600 as const,
    borderRadius: '10px',
    padding: '12px 22px',
    textDecoration: 'none',
    margin: '4px 0 0',
  },
  footer: {
    fontFamily: URBANIST,
    fontSize: '12px',
    color: COLORS.soft,
    lineHeight: '1.6',
    margin: '0 0 10px',
    fontWeight: 400 as const,
  },
  footerLink: {
    color: COLORS.body,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  legal: {
    fontFamily: MONO,
    fontSize: '10px',
    color: '#d4d4d8',
    letterSpacing: '0.1em',
    margin: '18px 0 0',
    textTransform: 'uppercase' as const,
  },
  codeBox: {
    backgroundColor: COLORS.ink,
    borderRadius: '12px',
    padding: '22px 20px',
    margin: '20px 0 24px',
    textAlign: 'center' as const,
    border: '1px solid #18181b',
  },
  codeLabel: {
    fontFamily: MONO,
    fontSize: '10px',
    fontWeight: 700 as const,
    letterSpacing: '0.28em',
    color: COLORS.soft,
    textTransform: 'uppercase' as const,
    margin: '0 0 10px',
  },
  codeValue: {
    fontFamily: MONO,
    fontSize: '36px',
    fontWeight: 700 as const,
    color: '#ffffff',
    letterSpacing: '0.35em',
    margin: '0 0 10px',
    padding: '0 0 0 12px',
  },
  codeExpiry: {
    fontFamily: MONO,
    fontSize: '10px',
    color: COLORS.muted,
    letterSpacing: '0.15em',
    margin: 0,
    textTransform: 'uppercase' as const,
  },
}

/** Convenience <Head> that already includes the font loader. */
export const EmailHead = () => (
  <Head>
    <EmailFonts />
  </Head>
)
