import assert from "node:assert/strict";
import test from "node:test";

import {
  getCurrentMonthCycle,
  getMonthCycle,
  getPreviousMonthCycle,
  isWithinCurrentMonthGracePeriod,
} from "../utils/billingPeriod.js";
import {
  evaluateMonthlyAccessEvidence,
} from "../services/monthlyAccessPolicyService.js";

test("August access extends through September 10 in Asia/Colombo", () => {
  const cycle = getMonthCycle(2026, 8);

  assert.equal(cycle.label, "August 2026");
  assert.equal(cycle.accessStartsAt.toISOString(), "2026-07-31T18:30:00.000Z");
  assert.equal(cycle.paymentDeadline.toISOString(), "2026-08-10T18:29:59.999Z");
  assert.equal(cycle.accessEndsAt.toISOString(), "2026-09-10T18:29:59.999Z");
});

test("September 10 is included in grace and September 11 is not", () => {
  const september10 = new Date("2026-09-10T23:59:59.999+05:30");
  const september11 = new Date("2026-09-11T00:00:00.000+05:30");

  assert.equal(isWithinCurrentMonthGracePeriod(september10), true);
  assert.equal(isWithinCurrentMonthGracePeriod(september11), false);
  assert.equal(getCurrentMonthCycle(september11).label, "September 2026");
  assert.equal(getPreviousMonthCycle(september11).label, "August 2026");
});

test("previous-month approval grants grace access", () => {
  const result = evaluateMonthlyAccessEvidence({
    hasCurrentApproval: false,
    hasPreviousApproval: true,
    isWithinGracePeriod: true,
    hasOnTimePendingPayment: false,
  });

  assert.equal(result.hasCurrentStanding, true);
  assert.equal(result.source, "previous_month_grace");
});

test("an on-time pending payment preserves returning-student access after grace", () => {
  const result = evaluateMonthlyAccessEvidence({
    hasCurrentApproval: false,
    hasPreviousApproval: true,
    isWithinGracePeriod: false,
    hasOnTimePendingPayment: true,
  });

  assert.equal(result.hasCurrentStanding, true);
  assert.equal(result.source, "on_time_payment_pending");
});

test("late pending payment does not preserve access after grace", () => {
  const result = evaluateMonthlyAccessEvidence({
    hasCurrentApproval: false,
    hasPreviousApproval: true,
    isWithinGracePeriod: false,
    hasOnTimePendingPayment: false,
  });

  assert.equal(result.hasCurrentStanding, false);
  assert.equal(result.source, "payment_overdue");
});

test("a new student receives no grace access without previous-month approval", () => {
  const result = evaluateMonthlyAccessEvidence({
    hasCurrentApproval: false,
    hasPreviousApproval: false,
    isWithinGracePeriod: true,
    hasOnTimePendingPayment: true,
  });

  assert.equal(result.hasCurrentStanding, false);
});

test("current-month approval grants access after the grace deadline", () => {
  const result = evaluateMonthlyAccessEvidence({
    hasCurrentApproval: true,
    hasPreviousApproval: false,
    isWithinGracePeriod: false,
    hasOnTimePendingPayment: false,
  });

  assert.equal(result.hasCurrentStanding, true);
  assert.equal(result.source, "current_month_approved");
});
