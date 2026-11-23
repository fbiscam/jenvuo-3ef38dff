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
import { AccountPill, EmailIllustration, EmailFooter, EmailHead, LogoHeader, shellStyles as s } from './_shared'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  recipient?: string
  token?: string
  showLink?: boolean
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  recipient,
  token,
  showLink = true,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
        <Heading style={s.h1}>Reset your password</Heading>
          <AccountPill recipient={recipient} />
          <EmailIllustration kind="security" />
        <Text style={s.text}>
          We received a request to reset your password for {siteName}.{' '}
          {showLink
            ? 'Click the button below to choose a new password.'
            : 'Enter the reset code below on the password reset page to choose a new password.'}
        </Text>
        {token ? (
          <>
            <Section style={s.codeBox}>
              <Text style={s.codeLabel}>RESET CODE</Text>
              <Text style={s.codeValue}>{token}</Text>
              <Text style={s.codeExpiry}>This code expires in 15 minutes.</Text>
            </Section>
          </>
        ) : null}
        {showLink ? (
          <Section style={s.actionWrap}><Button style={s.button} href={confirmationUrl}>
            Reset Password
          </Button></Section>
        ) : null}
        <Text style={s.footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text><EmailFooter />
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

