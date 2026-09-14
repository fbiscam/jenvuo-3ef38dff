import * as React from 'react'

import {
  Body,
  Container,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { EmailHead, LogoHeader, shellStyles as s } from './_shared'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>Your verification code</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
        <Heading style={s.h1}>Confirm reauthentication</Heading>
        <Text style={s.text}>Use the code below to confirm your identity:</Text>
        <Section style={s.codeBox}>
          <Text style={s.codeLabel}>VERIFICATION CODE</Text>
          <Text style={s.codeValue}>{token}</Text>
          <Text style={s.codeExpiry}>This code expires shortly.</Text>
        </Section>
        <Text style={s.footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text><Text style={s.legal}>© Jenvu · AI Gold Trading</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

