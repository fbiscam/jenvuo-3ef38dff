import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { COLORS, EmailHead, LogoHeader, shellStyles as s } from './_shared'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
        <Heading style={s.h1}>You've been invited</Heading>
        <Text style={s.text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={linkStyle}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Section style={s.actionWrap}><Button style={s.button} href={confirmationUrl}>
          Accept Invitation
        </Button></Section>
        <Text style={s.footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text><Text style={s.legal}>© Jenvu · AI Gold Trading</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const linkStyle = { color: COLORS.ink, textDecoration: 'underline' }
