/**
 * Single source of truth for money formatting.
 *
 * The display currency is configured by admins (Admin → Subscriptions →
 * Billing currency) and stored in platform_settings under `billing.currency`.
 * Never hardcode a currency symbol anywhere — always format through here.
 */

export const SUPPORTED_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "AED",
  "SGD",
  "JPY",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Fallback used before settings load, and when no currency is configured. */
export const DEFAULT_CURRENCY: SupportedCurrency = "INR";

/** Currency Razorpay charges in, regardless of the UI display currency. */
export const GATEWAY_CURRENCY = "INR";

export function normalizeCurrency(value?: string | null): string {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY;
}

type MoneyOptions = {
  locale?: string;
  /** Hide decimals when the amount has none (e.g. "₹499" instead of "₹499.00"). */
  compactDecimals?: boolean;
};

/** Format an amount given in minor units (paise/cents). */
export function formatMoneyCents(
  minorUnits: number,
  currency?: string | null,
  options: MoneyOptions = {},
): string {
  return formatMoney((minorUnits ?? 0) / 100, currency, options);
}

/** Format an amount given in major units. */
export function formatMoney(
  amount: number,
  currency?: string | null,
  options: MoneyOptions = {},
): string {
  const code = normalizeCurrency(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  const whole = options.compactDecimals && Number.isInteger(value);
  try {
    return new Intl.NumberFormat(options.locale || undefined, {
      style: "currency",
      currency: code,
      ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(whole ? 0 : 2)}`;
  }
}
