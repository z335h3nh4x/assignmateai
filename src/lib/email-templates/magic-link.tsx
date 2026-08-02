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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure login link for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>{siteName}</Text>
          <Heading style={s.heading}>Your login link</Heading>
          <Text style={s.heroSub}>No password needed.</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.paragraph}>
            Click below to log in to {siteName}. This link expires shortly and can only
            be used once.
          </Text>

          <Section style={s.buttonWrap}>
            <Button style={s.button} href={confirmationUrl}>
              Log in
            </Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            If you didn&apos;t request this link, you can safely ignore this email.
          </Text>
        </Section>

        <Text style={s.signature}>— The {siteName} team</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
