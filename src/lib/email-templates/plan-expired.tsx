import React from 'react'
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
import type { TemplateEntry } from './registry'

interface PlanExpiredProps {
  name?: string
  planName?: string
  expiredOn?: string
  freePlanName?: string
  appUrl?: string
}

const BRAND = '#7c3aed'
const INK = '#1b1630'
const MUTED = '#5b5570'

const PlanExpiredEmail = ({
  name,
  planName = 'Pro',
  expiredOn = '',
  freePlanName = 'Basic',
  appUrl = 'https://assignmateai.in',
}: PlanExpiredProps) => {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : 'Hi there,'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your Assignmate ${planName} plan has expired — you're now on ${freePlanName}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={brandMark}>Assignmate</Text>
            <Heading style={heading}>{`Your ${planName} plan has expired`}</Heading>
          </Section>

          <Section style={card}>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              {`Your Assignmate ${planName} plan expired on ${expiredOn}.`}
            </Text>
            <Text style={paragraph}>
              {`Your account has automatically moved to the ${freePlanName} plan, and your account now uses the ${freePlanName} limits.`}
            </Text>
            <Text style={paragraph}>
              Your assignments, history and profile have not been deleted — everything is still there.
            </Text>
            <Text style={paragraph}>
              {`Want your ${planName} limits back? You can upgrade again any time.`}
            </Text>

            <Section style={buttonWrap}>
              <Button href={`${appUrl}/dashboard`} style={button}>
                Upgrade plan
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={footnote}>Questions? Just reply to this email.</Text>
          </Section>

          <Text style={signature}>— The Assignmate team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PlanExpiredEmail,
  subject: (data: Record<string, any>) =>
    `Your Assignmate ${data?.planName ?? 'plan'} plan has expired`,
  displayName: 'Plan expired',
  previewData: {
    name: 'Aarav',
    planName: 'Plus',
    expiredOn: '5 October 2026',
    freePlanName: 'Basic',
    appUrl: 'https://assignmateai.in',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { margin: '0 auto', padding: '24px 16px', maxWidth: '560px' }
const hero = { padding: '8px 0 16px' }
const brandMark = { color: BRAND, fontSize: '14px', fontWeight: 700, letterSpacing: '1px', margin: '0 0 8px' }
const heading = { color: INK, fontSize: '24px', lineHeight: '32px', margin: '0' }
const card = { border: '1px solid #eceaf5', borderRadius: '12px', padding: '20px 22px' }
const paragraph = { color: INK, fontSize: '15px', lineHeight: '24px', margin: '0 0 12px' }
const buttonWrap = { padding: '8px 0 4px' }
const button = {
  backgroundColor: BRAND,
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 20px',
  textDecoration: 'none',
}
const hr = { borderColor: '#eceaf5', margin: '18px 0' }
const footnote = { color: MUTED, fontSize: '13px', lineHeight: '20px', margin: '0' }
const signature = { color: MUTED, fontSize: '13px', margin: '18px 0 0' }
