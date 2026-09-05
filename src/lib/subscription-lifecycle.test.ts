import { describe, it, expect } from "vitest";
import {
  displayStatus,
  isSubscriptionValid,
  periodEndLabel,
  type SubscriptionState,
} from "./subscription-lifecycle";

const NOW = new Date("2026-09-05T16:00:00.000Z");
const iso = (d: Date) => d.toISOString();
const shift = (ms: number) => iso(new Date(NOW.getTime() + ms));

function state(partial: Partial<SubscriptionState>): SubscriptionState {
  return { status: "active", period_end: null, valid: false, is_paid: true, ...partial };
}

describe("isSubscriptionValid", () => {
  it("1. active before expiration stays valid", () => {
    expect(isSubscriptionValid("active", shift(5 * 86_400_000), NOW)).toBe(true);
  });

  it("2. exactly at the expiration timestamp is expired", () => {
    expect(isSubscriptionValid("active", iso(NOW), NOW)).toBe(false);
  });

  it("3. expired by one minute is expired", () => {
    expect(isSubscriptionValid("active", shift(-60_000), NOW)).toBe(false);
  });

  it("4. expired by several days is expired", () => {
    expect(isSubscriptionValid("active", shift(-3 * 86_400_000), NOW)).toBe(false);
  });

  it("5. TEST MEMBER expiry follows the same rule (the reported bug)", () => {
    // TEST MEMBER, period end 2026-09-02, checked on 2026-09-05.
    expect(isSubscriptionValid("active", "2026-09-02T16:12:47.521Z", NOW)).toBe(false);
  });

  it("6. cancelled or already-expired statuses are never valid", () => {
    expect(isSubscriptionValid("cancelled", shift(86_400_000), NOW)).toBe(false);
    expect(isSubscriptionValid("expired", shift(86_400_000), NOW)).toBe(false);
    expect(isSubscriptionValid(null, null, NOW)).toBe(false);
  });

  it("7. trialing behaves like active", () => {
    expect(isSubscriptionValid("trialing", shift(3600_000), NOW)).toBe(true);
  });

  it("8. missing expiration data is not invented", () => {
    expect(isSubscriptionValid("active", null, NOW)).toBe(true);
  });

  it("9. renewal extends validity", () => {
    const renewed = shift(30 * 86_400_000);
    expect(isSubscriptionValid("active", renewed, NOW)).toBe(true);
  });

  it("10. repeated checks are stable", () => {
    const end = shift(-1000);
    for (let i = 0; i < 5; i++) expect(isSubscriptionValid("active", end, NOW)).toBe(false);
  });

  it("11. verdict uses the supplied server clock, not the browser timezone", () => {
    const end = "2026-09-03T00:00:00.000Z";
    // Same instant expressed with a +05:30 offset must give the same answer.
    expect(isSubscriptionValid("active", end, NOW)).toBe(false);
    expect(isSubscriptionValid("active", "2026-09-03T05:30:00.000+05:30", NOW)).toBe(false);
    // Server clock before the end date -> valid, regardless of local time.
    expect(isSubscriptionValid("active", end, new Date("2026-09-01T00:00:00.000Z"))).toBe(true);
  });
});

describe("displayStatus", () => {
  it("never shows Active for an expired paid subscription", () => {
    expect(displayStatus(state({ status: "active", period_end: "2026-09-02T00:00:00Z", valid: false }))).toBe(
      "expired",
    );
    expect(displayStatus(state({ status: "expired", valid: false }))).toBe("expired");
  });

  it("shows Active while the server says the subscription is valid", () => {
    expect(displayStatus(state({ valid: true, period_end: shift(86_400_000) }))).toBe("active");
  });

  it("free users with no subscription record read as none", () => {
    expect(displayStatus(state({ status: "none", is_paid: false }))).toBe("none");
    expect(displayStatus(null)).toBe("none");
  });

  it("cancelled is distinct from expired", () => {
    expect(displayStatus(state({ status: "cancelled" }))).toBe("cancelled");
  });
});

describe("periodEndLabel", () => {
  it("does not promise an automatic renewal", () => {
    expect(periodEndLabel(state({ valid: true, period_end: shift(86_400_000) }))).toBe("Plan ends");
    expect(periodEndLabel(state({ valid: false, period_end: shift(-86_400_000) }))).toBe("Expired on");
  });

  it("falls back to the usage cycle for free plans", () => {
    expect(periodEndLabel(state({ is_paid: false, period_end: null }))).toBe("Usage resets");
  });
});
