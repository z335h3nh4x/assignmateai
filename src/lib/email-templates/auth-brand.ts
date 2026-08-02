// Shared brand styling for Assignmate auth emails.
export const BRAND = '#7c3aed'
export const BRAND_DARK = '#4f46e5'
export const INK = '#1b1630'
export const MUTED = '#5b5570'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '24px 16px 40px',
}

export const hero = {
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  backgroundColor: BRAND,
  borderRadius: '16px',
  padding: '32px 28px',
  textAlign: 'center' as const,
}

export const brandMark = {
  color: '#e9e4ff',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
}

export const heading = {
  color: '#ffffff',
  fontSize: '26px',
  lineHeight: '1.25',
  fontWeight: 700,
  margin: '0',
}

export const heroSub = {
  color: '#ded8ff',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '10px 0 0',
}

export const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #ece9f6',
  borderRadius: '16px',
  padding: '28px 24px',
  marginTop: '18px',
}

export const paragraph = {
  color: INK,
  fontSize: '15px',
  lineHeight: '1.65',
  margin: '0 0 14px',
}

export const buttonWrap = { textAlign: 'center' as const, padding: '18px 0 4px' }

export const button = {
  backgroundColor: BRAND,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  borderRadius: '10px',
  padding: '13px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const link = { color: BRAND, textDecoration: 'underline' }

export const hr = { borderColor: '#ece9f6', margin: '24px 0 16px' }

export const footnote = {
  color: MUTED,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
}

export const signature = {
  color: MUTED,
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}

export const codeStyle = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '30px',
  letterSpacing: '8px',
  fontWeight: 700,
  color: INK,
  backgroundColor: '#f5f2ff',
  border: '1px solid #e5defb',
  borderRadius: '12px',
  padding: '16px 12px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
