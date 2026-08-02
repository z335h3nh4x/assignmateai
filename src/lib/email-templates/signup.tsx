import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as s from './auth-brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate your {siteName} account</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>{siteName}</Text>
          <Heading style={s.heading}>Confirm your email</Heading>
          <Text style={s.heroSub}>One click and your workspace is ready.</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.paragraph}>
            Thanks for signing up for{' '}
            <Link href={siteUrl} style={s.link}>
              <strong>{siteName}</strong>
            </Link>
            . Please confirm <strong>{recipient}</strong> to activate your account.
          </Text>

          <Section style={s.buttonWrap}>
            <Button style={s.button} href={confirmationUrl}>
              Verify email
            </Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            If you didn&apos;t create an account, you can safely ignore this email.
          </Text>
        </Section>

        <Text style={s.signature}>— The {siteName} team</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
