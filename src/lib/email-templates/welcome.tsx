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

interface WelcomeEmailProps {
  name?: string
  appUrl?: string
}

const BRAND = '#7c3aed'
const BRAND_DARK = '#4f46e5'
const INK = '#1b1630'
const MUTED = '#5b5570'

const WelcomeEmail = ({ name, appUrl = 'https://assignmateai.in' }: WelcomeEmailProps) => {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : 'Hi there,'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Assignmate account is ready — upload an assignment and get a full solution.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={brandMark}>Assignmate</Text>
            <Heading style={heading}>Welcome to Assignmate</Heading>
            <Text style={heroSub}>Your AI assignment workspace is ready to go.</Text>
          </Section>

          <Section style={card}>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              Thanks for confirming your email. You can now upload an assignment — PDF, DOCX, text or a photo of
              a question paper — and Assignmate will read it, work through every question, and hand you a
              properly formatted solution.
            </Text>

            <Text style={listItem}>• Upload a file and let it detect the title, subject and questions</Text>
            <Text style={listItem}>• Get step-by-step answers with equations, tables and diagrams</Text>
            <Text style={listItem}>• Export as a clean academic PDF or a handwritten notebook page</Text>

            <Section style={buttonWrap}>
              <Button href={`${appUrl}/dashboard`} style={button}>
                Start your first assignment
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={footnote}>
              Need a hand? Just reply to this email and we&apos;ll help you get set up.
            </Text>
          </Section>

          <Text style={signature}>— The Assignmate team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Assignmate — your workspace is ready',
  displayName: 'Welcome email',
  previewData: { name: 'Aarav', appUrl: 'https://assignmateai.in' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '24px 16px 40px',
}

const hero = {
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  backgroundColor: BRAND,
  borderRadius: '16px',
  padding: '32px 28px',
  textAlign: 'center' as const,
}

const brandMark = {
  color: '#e9e4ff',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
}

const heading = {
  color: '#ffffff',
  fontSize: '26px',
  lineHeight: '1.25',
  fontWeight: 700,
  margin: '0',
}

const heroSub = {
  color: '#ded8ff',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '10px 0 0',
}

const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #ece9f6',
  borderRadius: '16px',
  padding: '28px 24px',
  marginTop: '18px',
}

const paragraph = {
  color: INK,
  fontSize: '15px',
  lineHeight: '1.65',
  margin: '0 0 14px',
}

const listItem = {
  color: MUTED,
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
}

const buttonWrap = { textAlign: 'center' as const, padding: '22px 0 4px' }

const button = {
  backgroundColor: BRAND,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  borderRadius: '10px',
  padding: '13px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}

const hr = { borderColor: '#ece9f6', margin: '24px 0 16px' }

const footnote = {
  color: MUTED,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
}

const signature = {
  color: MUTED,
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}

export default WelcomeEmail
