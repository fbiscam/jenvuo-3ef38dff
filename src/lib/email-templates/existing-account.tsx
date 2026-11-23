import * as React from 'react'

import { Body, Container, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import { AccountPill, EmailIllustration, EmailFooter, EmailHead, LogoHeader, shellStyles as s } from './_shared'

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
          <EmailIllustration kind="security" />
          <Text style={s.text}>
            Someone tried to sign up to Jenvu with this email, but this inbox already has an account. Please sign in at{' '}
            <Link href="https://auth.jenvu.com/sign-in" style={s.link}>
              auth.jenvu.com/sign-in
            </Link>{' '}
            instead. If you forgot your password, use "Forgot password" on the sign-in page.
          </Text>
          <Text style={s.footer}>If this wasn't you, you can ignore this email. Your account has not changed.</Text>
          <EmailFooter />
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ExistingAccountEmail
