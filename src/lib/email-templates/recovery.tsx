import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as s from './auth-brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>{siteName}</Text>
          <Heading style={s.heading}>Reset your password</Heading>
          <Text style={s.heroSub}>Choose a new password in a few seconds.</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.paragraph}>
            We received a request to reset the password for your {siteName} account.
            Click below to set a new one.
          </Text>

          <Section style={s.buttonWrap}>
            <Button style={s.button} href={confirmationUrl}>
              Reset password
            </Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            If you didn&apos;t request this, you can safely ignore this email — your
            password will stay unchanged.
          </Text>
        </Section>

        <Text style={s.signature}>— The {siteName} team</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
