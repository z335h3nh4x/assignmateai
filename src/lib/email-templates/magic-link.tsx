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
  token?: string
}

const codeStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  fontSize: '34px',
  fontWeight: 700,
  letterSpacing: '10px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  color: '#4c1d95',
  background: '#f5f3ff',
  border: '1px solid #ddd6fe',
  borderRadius: '12px',
  padding: '18px 12px',
  margin: '8px 0 4px',
}

export const MagicLinkEmail = ({ siteName, confirmationUrl, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{token ? `${token} is your ${siteName} login code` : `Your secure login link for ${siteName}`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.hero}>
          <Text style={s.brandMark}>{siteName}</Text>
          <Heading style={s.heading}>Your login code</Heading>
          <Text style={s.heroSub}>No password needed.</Text>
        </Section>

        <Section style={s.card}>
          {token ? (
            <>
              <Text style={s.paragraph}>
                Enter this code in {siteName} to finish signing in. It expires shortly and
                can only be used once.
              </Text>
              <Text style={codeStyle}>{token}</Text>
              <Text style={s.footnote}>Or use the button below instead.</Text>
            </>
          ) : (
            <Text style={s.paragraph}>
              Click below to log in to {siteName}. This link expires shortly and can only
              be used once.
            </Text>
          )}

          <Section style={s.buttonWrap}>
            <Button style={s.button} href={confirmationUrl}>
              Log in
            </Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Section>

        <Text style={s.signature}>— The {siteName} team</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
