import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { EmailHead, LogoHeader, shellStyles as s } from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
        <Heading style={s.h1}>Your login link</Heading>
        <Text style={s.text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Section style={s.actionWrap}><Button style={s.button} href={confirmationUrl}>
          Log In
        </Button></Section>
        <Text style={s.footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text><Text style={s.legal}>© Jenvu · AI Gold Trading</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

