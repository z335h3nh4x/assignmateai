import * as React from 'react'

import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Assignmate verification code</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>Assignmate</Text>
          <Heading style={s.heading}>Confirm it&apos;s you</Heading>
          <Text style={s.heroSub}>Enter this code to continue.</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.paragraph}>Use the verification code below:</Text>
          <Text style={s.codeStyle}>{token}</Text>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            This code expires shortly. If you didn&apos;t request it, you can safely
            ignore this email.
          </Text>
        </Section>

        <Text style={s.signature}>— The Assignmate team</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
