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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail.
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
    <Head />
    <Preview>Confirm your new email address for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>{siteName}</Text>
          <Heading style={s.heading}>Confirm your email change</Heading>
          <Text style={s.heroSub}>Verify the new address to finish.</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.paragraph}>
            You requested to change the email on your {siteName} account from{' '}
            <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>.
          </Text>

          <Section style={s.buttonWrap}>
            <Button style={s.button} href={confirmationUrl}>
              Confirm email change
            </Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            If you didn&apos;t request this change, please secure your account immediately.
          </Text>
        </Section>

        <Text style={s.signature}>— The {siteName} team</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
