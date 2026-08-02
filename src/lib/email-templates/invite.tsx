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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You&apos;ve been invited to join {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>{siteName}</Text>
          <Heading style={s.heading}>You&apos;ve been invited</Heading>
          <Text style={s.heroSub}>Accept your invite and start in minutes.</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.paragraph}>
            You&apos;ve been invited to join{' '}
            <Link href={siteUrl} style={s.link}>
              <strong>{siteName}</strong>
            </Link>
            . Accept the invitation below to create your account.
          </Text>

          <Section style={s.buttonWrap}>
            <Button style={s.button} href={confirmationUrl}>
              Accept invitation
            </Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            If you weren&apos;t expecting this invitation, you can safely ignore this email.
          </Text>
        </Section>

        <Text style={s.signature}>— The {siteName} team</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
