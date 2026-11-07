import * as React from 'react'
import { Body, Container, Html, Preview, Section, Text } from '@react-email/components'
import { EmailHead, LogoHeader, shellStyles as s, COLORS } from './_shared'
import type { TemplateEntry } from './registry'

interface Props {
  subject?: string
  body?: string
  boxLabel?: string
  replyAddress?: string
}

/** One-to-one message written by the Jenvu team from the admin Email box. */
const AdminMessageEmail = ({
  subject = 'Message from Jenvu',
  body = '',
  boxLabel = 'Jenvu Support',
  replyAddress = 'support@jenvu.com',
}: Props) => {
  const paragraphs = String(body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="en" dir="ltr">
      <EmailHead />
      <Preview>{paragraphs[0]?.slice(0, 120) || subject}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <LogoHeader />
          <Section style={s.card}>
            <Text style={s.eyebrow}>{boxLabel}</Text>
            <Text style={{ ...s.text, fontSize: '18px', color: COLORS.ink, margin: '0 0 20px' }}>{subject}</Text>
            {paragraphs.length === 0 ? (
              <Text style={s.text}>Hello from the Jenvu team.</Text>
            ) : (
              paragraphs.map((p, i) => (
                <Text key={i} style={{ ...s.text, whiteSpace: 'pre-line' as const }}>
                  {p}
                </Text>
              ))
            )}
            <Text style={{ ...s.footer, marginTop: '24px' }}>
              Just reply to this email — your answer goes to {replyAddress}.
            </Text>
            <Text style={s.legal}>Jenvu · {boxLabel}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminMessageEmail,
  subject: (d: Record<string, any>) => String(d.subject || 'Message from Jenvu'),
  displayName: 'Admin email (support / sales)',
  previewData: {
    subject: 'About your Founding application',
    body: 'Hi Sara,\n\nThanks for applying. Your ID check is done and your account is ready.\n\nBest,\nJenvu Support',
    boxLabel: 'Jenvu Support',
    replyAddress: 'support@jenvu.com',
  },
} satisfies TemplateEntry
