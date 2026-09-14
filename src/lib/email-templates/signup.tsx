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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
  showLink?: boolean
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
  showLink = true,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <EmailHead />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <LogoHeader />
        <Section style={s.card}>
        <Heading style={s.h1}>Confirm your email</Heading>
        <Text style={s.text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={linkStyle}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={s.text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={linkStyle}>
            {recipient}
          </Link>
          ){token ? ' using the code below:' : ' by clicking the button below:'}
        </Text>
        {token ? <Section style={s.codeBox}><Text style={s.codeLabel}>VERIFICATION CODE</Text><Text style={s.codeValue}>{token}</Text><Text style={s.codeExpiry}>This code expires shortly.</Text></Section> : null}
        {showLink ? (
          <Section style={s.actionWrap}><Button style={s.button} href={confirmationUrl}>
            Verify Email
          </Button></Section>
        ) : null}
        <Text style={s.footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={s.legal}>© Jenvu · AI Gold Trading</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const linkStyle = { color: COLORS.ink, textDecoration: 'underline' }
