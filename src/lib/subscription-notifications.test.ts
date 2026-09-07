import { describe, expect, it } from "vitest";
import {
  decideNotification,
  notificationKey,
  periodEndOf,
  WARNING_WINDOW_DAYS,
} from "./subscription-notifications";
import { DAY_MS } from "./subscription-lifecycle";

const NOW = new Date("2026-09-06T12:00:00.000Z");
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

function sub(overrides: Partial<Parameters<typeof decideNotification>[0]> = {}) {
  return {
    user_id: "u1",
    plan: "plus",
    status: "active",
    current_period_end: at(2 * DAY_MS),
    renewal_at: null,
    ...overrides,
  };
}

describe("decideNotification", () => {
  it("sends the 3-day warning inside the window", () => {
    const d = decideNotification(sub({ current_period_end: at(3 * DAY_MS - 1000) }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d.kind).toBe("warning");
    expect(d.kind === "warning" && d.daysLeft).toBe(3);
  });

  it("does not warn while more than the window remains", () => {
    const d = decideNotification(sub({ current_period_end: at(10 * DAY_MS) }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d.kind).toBeNull();
  });

  it("sends the expired email once the period has passed", () => {
    const d = decideNotification(sub({ current_period_end: at(-2 * DAY_MS), status: "expired" }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d.kind).toBe("expired");
  });

  it("treats the exact expiry timestamp as expired, not as a warning", () => {
    const d = decideNotification(sub({ current_period_end: NOW.toISOString() }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d.kind).toBe("expired");
  });

  it("notifies an admin-granted plan the same as a paid one", () => {
    const d = decideNotification(sub({ plan: "standard" }), { now: NOW, isAdmin: false });
    expect(d.kind).toBe("warning");
  });

  it("notifies a TEST MEMBER subscription", () => {
    const d = decideNotification(sub({ plan: "test" }), { now: NOW, isAdmin: false });
    expect(d.kind).toBe("warning");
  });

  it("never notifies admin accounts", () => {
    expect(decideNotification(sub(), { now: NOW, isAdmin: true }).kind).toBeNull();
    expect(
      decideNotification(sub({ current_period_end: at(-DAY_MS) }), { now: NOW, isAdmin: true }).kind,
    ).toBeNull();
  });

  it("never notifies free plans", () => {
    expect(decideNotification(sub({ plan: "free" }), { now: NOW, isAdmin: false }).kind).toBeNull();
  });

  it("invents nothing when no end date is recorded", () => {
    const d = decideNotification(sub({ current_period_end: null, renewal_at: null }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d).toEqual({ kind: null, reason: "no_period_end" });
  });

  it("handles an invalid end date safely", () => {
    const d = decideNotification(sub({ current_period_end: "not-a-date" }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d.kind).toBeNull();
  });

  it("falls back to renewal_at when current_period_end is missing", () => {
    expect(periodEndOf(sub({ current_period_end: null, renewal_at: at(DAY_MS) }))).toBe(at(DAY_MS));
  });

  it("uses a same-day warning message when detected late", () => {
    const d = decideNotification(sub({ current_period_end: at(3600_000) }), {
      now: NOW,
      isAdmin: false,
    });
    expect(d.kind).toBe("warning");
    expect(d.kind === "warning" && d.daysLeft).toBe(1);
  });

  it("ignores cancelled subscriptions that have not lapsed yet", () => {
    const d = decideNotification(sub({ status: "cancelled" }), { now: NOW, isAdmin: false });
    expect(d.kind).toBeNull();
  });
});

describe("notificationKey (duplicate prevention)", () => {
  const end = at(2 * DAY_MS);

  it("is stable across repeated scheduler runs and lazy checks", () => {
    expect(notificationKey("warning", "u1", end)).toBe(notificationKey("warning", "u1", end));
  });

  it("separates the warning from the expired email", () => {
    expect(notificationKey("warning", "u1", end)).not.toBe(notificationKey("expired", "u1", end));
  });

  it("starts a fresh lifecycle after a Razorpay renewal moves the period", () => {
    const renewed = at(32 * DAY_MS);
    expect(notificationKey("warning", "u1", end)).not.toBe(notificationKey("warning", "u1", renewed));
  });

  it("normalises equivalent timestamps to the same key", () => {
    expect(notificationKey("warning", "u1", end)).toBe(
      notificationKey("warning", "u1", new Date(end).toISOString()),
    );
  });
});

describe("renewal before expiry", () => {
  it("suppresses both emails once the period is pushed beyond the window", () => {
    const renewed = sub({ current_period_end: at(30 * DAY_MS), status: "active" });
    expect(decideNotification(renewed, { now: NOW, isAdmin: false }).kind).toBeNull();
  });

  it("keeps the warning window at 3 days", () => {
    expect(WARNING_WINDOW_DAYS).toBe(3);
  });
});
