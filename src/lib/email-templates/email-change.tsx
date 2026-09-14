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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
        <Heading style={s.h1}>Confirm your email change</Heading>
        <Text style={s.text}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${oldEmail}`} style={linkStyle}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={linkStyle}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={s.text}>
          Click the button below to confirm this change:
        </Text>
        <Section style={s.actionWrap}><Button style={s.button} href={confirmationUrl}>
          Confirm Email Change
        </Button></Section>
        <Text style={s.footer}>
          If you didn't request this change, please secure your account
          immediately.
        </Text><Text style={s.legal}>© Jenvu · AI Gold Trading</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const linkStyle = { color: COLORS.ink, textDecoration: 'underline' }
