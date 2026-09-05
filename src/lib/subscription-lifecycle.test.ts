import { describe, it, expect } from "vitest";
import {
  displayStatus,
  isSubscriptionValid,
  periodEndLabel,
  computeGrantPeriod,
  defaultGrantDays,
  sourceLabel,
  SUBSCRIPTION_SOURCES,
  DAY_MS,
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

/* ---------------- Admin-granted subscriptions ---------------- */

const START = new Date("2026-09-05T10:00:00.000Z");
const grant = (durationDays: number | null, isFree = false) =>
  computeGrantPeriod({ start: START, durationDays, isFree });

describe("admin grant periods", () => {
  it("Plus granted for 30 days gets a real start and end date", () => {
    const p = grant(30);
    expect(p.started_at).toBe("2026-09-05T10:00:00.000Z");
    expect(p.period_end).toBe("2026-10-05T10:00:00.000Z");
    expect(p.period_end).not.toBeNull();
  });

  it("Standard granted for 30 days expires 30 days later", () => {
    expect(new Date(grant(30).period_end!).getTime() - START.getTime()).toBe(30 * DAY_MS);
  });

  it("Test member granted for 30 days expires like any paid plan", () => {
    const p = grant(30);
    expect(p.period_end).toBe("2026-10-05T10:00:00.000Z");
    expect(isSubscriptionValid("active", p.period_end, new Date("2026-10-06T10:00:00.000Z"))).toBe(false);
  });

  it("yearly grants run 365 days", () => {
    expect(defaultGrantDays("yearly")).toBe(365);
    expect(defaultGrantDays("monthly")).toBe(30);
    expect(defaultGrantDays(null)).toBe(30);
    expect(new Date(grant(365).period_end!).getTime() - START.getTime()).toBe(365 * DAY_MS);
  });

  it("only an explicit permanent choice produces no end date", () => {
    expect(grant(null).period_end).toBeNull();
    expect(grant(30).period_end).not.toBeNull();
  });

  it("free plans never carry a period", () => {
    expect(grant(30, true).period_end).toBeNull();
  });

  it("an admin-granted plan is invalid once its end date passes", () => {
    const p = grant(30);
    expect(isSubscriptionValid("active", p.period_end, new Date("2026-10-04T10:00:00.000Z"))).toBe(true);
    expect(isSubscriptionValid("active", p.period_end, new Date("2026-10-05T10:00:01.000Z"))).toBe(false);
  });

  it("a valid admin grant stays active until its real end date", () => {
    const p = grant(30);
    expect(displayStatus({ status: "active", period_end: p.period_end, valid: true, is_paid: true })).toBe("active");
    expect(periodEndLabel({ status: "active", period_end: p.period_end, valid: true, is_paid: true })).toBe("Plan ends");
  });
});

describe("subscription source", () => {
  it("admin grants display as Admin, never Razorpay", () => {
    expect(sourceLabel(SUBSCRIPTION_SOURCES.ADMIN)).toBe("Admin");
    expect(sourceLabel("admin")).not.toBe("Razorpay");
    expect(sourceLabel("manual")).toBe("Admin");
  });

  it("Razorpay purchases keep the Razorpay label", () => {
    expect(sourceLabel(SUBSCRIPTION_SOURCES.RAZORPAY)).toBe("Razorpay");
  });

  it("promotional and test sources are distinguishable", () => {
    expect(sourceLabel("promo")).toBe("Promotional");
    expect(sourceLabel("test")).toBe("Test");
  });

  it("no source shows an em dash rather than guessing from the plan", () => {
    expect(sourceLabel(null)).toBe("—");
    expect(sourceLabel(undefined)).toBe("—");
  });
});
