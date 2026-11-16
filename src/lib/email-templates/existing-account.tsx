import * as React from 'react'

import { Body, Container, Heading, Html, Preview, Section, Text } from '@react-email/components'
import { EmailHead, LogoHeader, shellStyles as s } from './_shared'

export const EXISTING_ACCOUNT_SUBJECT = 'You already have a Jenvu account'

/** Sent instead of a sign-up code when the email (or its inbox) already has an account. */
export const ExistingAccountEmail = () => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>{EXISTING_ACCOUNT_SUBJECT}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
          <Heading style={s.h1}>You already have an account</Heading>
          <Text style={s.text}>
            Someone tried to sign up to Jenvu with this email, but this inbox already has an account. Please sign in at
            auth.jenvu.com/sign-in instead. If you forgot your password, use "Forgot password" on the sign-in page.
          </Text>
          <Text style={s.footer}>If this wasn't you, you can ignore this email. Your account has not changed.</Text>
          <Text style={s.legal}>© Jenvu · AI Gold Trading</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ExistingAccountEmail
