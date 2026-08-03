import React from 'react'
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
import type { TemplateEntry } from './registry'

export interface SubscriptionConfirmationProps {
  name?: string
  planName?: string
  amount?: string
  paymentId?: string
  purchaseDate?: string
  benefits?: string[]
  appUrl?: string
  supportEmail?: string
}

const BRAND = '#7c3aed'
const BRAND_DARK = '#4f46e5'
const INK = '#1b1630'
const MUTED = '#5b5570'

const SubscriptionConfirmationEmail = ({
  name,
  planName = 'Pro',
  amount = '0',
  paymentId = '—',
  purchaseDate = '',
  benefits = [],
  appUrl = 'https://assignmateai.in',
  supportEmail = 'support@assignmateai.in',
}: SubscriptionConfirmationProps) => {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : 'Hi there,'
  const perks = benefits.length
    ? benefits
    : [
        'Higher assignment limits',
        'Faster AI generation',
        'Larger uploads',
        'Premium exports',
        'Priority performance',
      ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your {planName} subscription is active — premium features are unlocked on Assignmate.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={brandMark}>Assignmate</Text>
            <Heading style={heading}>🎉 Welcome to Assignmate Pro!</Heading>
            <Text style={heroSub}>Your payment was successful and your plan is live.</Text>
          </Section>

          <Section style={card}>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              Thank you for subscribing to Assignmate Pro. Your payment has been received successfully
              and your premium features are now active.
            </Text>

            <Section style={detailBox}>
              <Text style={detailTitle}>Subscription details</Text>
              <Text style={detailRow}>
                <span style={detailLabel}>Plan</span>
                <span style={detailValue}>{planName}</span>
              </Text>
              <Text style={detailRow}>
                <span style={detailLabel}>Amount paid</span>
                <span style={detailValue}>₹{amount}</span>
              </Text>
              <Text style={detailRow}>
                <span style={detailLabel}>Payment ID</span>
                <span style={detailValueMono}>{paymentId}</span>
              </Text>
              {purchaseDate ? (
                <Text style={detailRow}>
                  <span style={detailLabel}>Purchase date</span>
                  <span style={detailValue}>{purchaseDate}</span>
                </Text>
              ) : null}
              <Text style={detailRow}>
                <span style={detailLabel}>Status</span>
                <span style={statusPill}>Successful</span>
              </Text>
            </Section>

            <Text style={sectionTitle}>What's included in your plan</Text>
            {perks.map((perk) => (
              <Text key={perk} style={listItem}>
                ✅ {perk}
              </Text>
            ))}

            <Section style={buttonWrap}>
              <Button href={`${appUrl}/dashboard`} style={button}>
                Go to Dashboard
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footnote}>
              <strong style={{ color: INK }}>Need help?</strong> Contact us anytime at{' '}
              <Link href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </Link>
              .
            </Text>
            <Text style={footnote}>Thank you for choosing Assignmate AI.</Text>
            <Text style={signOff}>— The Assignmate Team</Text>
          </Section>

          <Text style={legal}>
            You're receiving this because a subscription was purchased with this email address on
            Assignmate.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionConfirmationEmail,
  subject: 'Welcome to Assignmate Pro! 🎉',
  displayName: 'Subscription confirmation',
  previewData: {
    name: 'Aarav',
    planName: 'Pro',
    amount: '499',
    paymentId: 'pay_QxAmPl3123456',
    purchaseDate: '3 August 2026',
    benefits: [
      'Higher assignment limits',
      'Faster AI generation',
      'Larger uploads',
      'Premium exports',
      'Priority performance',
    ],
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '24px 12px',
}

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  width: '100%',
}

const hero: React.CSSProperties = {
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  backgroundColor: BRAND,
  borderRadius: '18px 18px 0 0',
  padding: '34px 28px 30px',
  textAlign: 'center' as const,
}

const brandMark: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '2.4px',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  opacity: 0.9,
}

const heading: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '26px',
  lineHeight: '34px',
  fontWeight: 700,
  margin: '0 0 8px',
}

const heroSub: React.CSSProperties = {
  color: '#ede9fe',
  fontSize: '15px',
  lineHeight: '22px',
  margin: 0,
}

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #ece8f6',
  borderTop: 'none',
  borderRadius: '0 0 18px 18px',
  padding: '28px 28px 26px',
}

const paragraph: React.CSSProperties = {
  color: MUTED,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
}

const detailBox: React.CSSProperties = {
  backgroundColor: '#faf8ff',
  border: '1px solid #ece8f6',
  borderRadius: '14px',
  padding: '18px 20px 8px',
  margin: '6px 0 22px',
}

const detailTitle: React.CSSProperties = {
  color: INK,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.6px',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const detailRow: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '14px',
  lineHeight: '20px',
}

const detailLabel: React.CSSProperties = {
  color: MUTED,
  display: 'inline-block',
  minWidth: '132px',
}

const detailValue: React.CSSProperties = {
  color: INK,
  fontWeight: 600,
}

const detailValueMono: React.CSSProperties = {
  color: INK,
  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  fontSize: '13px',
  fontWeight: 600,
  wordBreak: 'break-all' as const,
}

const statusPill: React.CSSProperties = {
  backgroundColor: '#e8f8ef',
  borderRadius: '999px',
  color: '#177245',
  fontSize: '12px',
  fontWeight: 700,
  padding: '4px 12px',
}

const sectionTitle: React.CSSProperties = {
  color: INK,
  fontSize: '15px',
  fontWeight: 700,
  margin: '0 0 10px',
}

const listItem: React.CSSProperties = {
  color: MUTED,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 6px',
}

const buttonWrap: React.CSSProperties = {
  margin: '26px 0 6px',
  textAlign: 'center' as const,
}

const button: React.CSSProperties = {
  backgroundColor: BRAND,
  borderRadius: '999px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 700,
  padding: '14px 32px',
  textDecoration: 'none',
}

const hr: React.CSSProperties = {
  borderColor: '#ece8f6',
  margin: '26px 0 18px',
}

const footnote: React.CSSProperties = {
  color: MUTED,
  fontSize: '13px',
  lineHeight: '21px',
  margin: '0 0 8px',
}

const signOff: React.CSSProperties = {
  color: INK,
  fontSize: '14px',
  fontWeight: 600,
  margin: '14px 0 0',
}

const legal: React.CSSProperties = {
  color: '#9a94ad',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '18px 4px 0',
  textAlign: 'center' as const,
}

const link: React.CSSProperties = {
  color: BRAND,
  textDecoration: 'underline',
}
