import * as React from 'react'

import { Body, Container, Heading, Html, Preview, Section, Text } from '@react-email/components'
import { AccountPill, EmailIllustration, EmailFooter, EmailHead, LogoHeader, shellStyles as s } from './_shared'

export type SignInCodeKind = 'login' | 'second_step' | 'email_2fa_setup'

const COPY: Record<SignInCodeKind, { subject: string; heading: string; intro: string; label: string }> = {
  login: {
    subject: 'Your Jenvu sign-in code',
    heading: 'Your sign-in code',
    intro: 'Use this one-time code to sign in to Jenvu. No password needed.',
    label: 'SIGN-IN CODE',
  },
  second_step: {
    subject: 'Your Jenvu security code',
    heading: 'Confirm it is you',
    intro: 'Your password was entered correctly. Enter this code to sign in.',
    label: 'SECURITY CODE',
  },
  email_2fa_setup: {
    subject: 'Turn on email codes for Jenvu',
    heading: 'Turn on email codes',
    intro: 'Enter this code on the Security page to turn on email codes for sign-in.',
    label: 'SETUP CODE',
  },
}

export const signInCodeSubject = (kind: SignInCodeKind) => COPY[kind].subject

export const SignInCodeEmail = ({ kind, token, recipient }: { kind: SignInCodeKind; token: string; recipient?: string }) => {
  const c = COPY[kind]
  return (
    <Html lang="en" dir="ltr">
      <EmailHead />
      <Preview>{c.subject}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <LogoHeader />
          <Section style={s.card}>
            <Heading style={s.h1}>{c.heading}</Heading>
          <AccountPill recipient={recipient} />
          <EmailIllustration kind="security" />
            <Text style={s.text}>{c.intro}</Text>
            <Section style={s.codeBox}>
              <Text style={s.codeLabel}>{c.label}</Text>
              <Text style={s.codeValue}>{token}</Text>
              <Text style={s.codeExpiry}>This code expires in 15 minutes.</Text>
            </Section>
            <Text style={s.footer}>
              If you didn't ask for this code, someone may know your email or password. Change your password from the Security page.
            </Text>
            <EmailFooter />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SignInCodeEmail
