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

interface PlanExpiringProps {
  name?: string
  planName?: string
  expiresOn?: string
  daysLeft?: number
  freePlanName?: string
  appUrl?: string
}

const BRAND = '#7c3aed'
const INK = '#1b1630'
const MUTED = '#5b5570'

const PlanExpiringEmail = ({
  name,
  planName = 'Pro',
  expiresOn = '',
  daysLeft = 3,
  freePlanName = 'Basic',
  appUrl = 'https://assignmateai.in',
}: PlanExpiringProps) => {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : 'Hi there,'
  const when =
    daysLeft <= 0
      ? 'today'
      : daysLeft === 1
        ? 'tomorrow'
        : `in ${daysLeft} days`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your Assignmate ${planName} plan expires ${when}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={brandMark}>Assignmate</Text>
            <Heading style={heading}>{`Your ${planName} plan expires ${when}`}</Heading>
          </Section>

          <Section style={card}>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              {`Your Assignmate ${planName} plan is scheduled to expire on ${expiresOn}.`}
            </Text>
            <Text style={paragraph}>
              {`After that, your account automatically moves to the ${freePlanName} plan and your ${planName} limits and credits will no longer be available.`}
            </Text>
            <Text style={paragraph}>
              You can renew or upgrade before that date to keep your current limits.
            </Text>

            <Section style={buttonWrap}>
              <Button href={`${appUrl}/dashboard`} style={button}>
                Renew or upgrade plan
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={footnote}>
              Your assignments, history, profile and account stay safe either way.
            </Text>
          </Section>

          <Text style={signature}>— The Assignmate team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PlanExpiringEmail,
  subject: (data: Record<string, any>) =>
    `Your Assignmate ${data?.planName ?? 'plan'} plan expires soon`,
  displayName: 'Plan expiring soon',
  previewData: {
    name: 'Aarav',
    planName: 'Plus',
    expiresOn: '5 October 2026',
    daysLeft: 3,
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
