import assert from "node:assert/strict";
import test from "node:test";

import { getApplicableReminderDay } from "../services/paymentReminderService.js";
import { isPlaybackSessionStale } from "../utils/playback.js";

test("payment reminder catch-up uses the nearest missed configured reminder", () => {
  const configured = [6, 3];

  assert.equal(getApplicableReminderDay(configured, 8), null);
  assert.equal(getApplicableReminderDay(configured, 6), 6);
  assert.equal(getApplicableReminderDay(configured, 5), 6);
  assert.equal(getApplicableReminderDay(configured, 3), 3);
  assert.equal(getApplicableReminderDay(configured, 1), 3);
  assert.equal(getApplicableReminderDay(configured, -1), null);
});

test("playback sessions become stale after the configured inactivity window", () => {
  const original = process.env.PLAYBACK_STALE_MINUTES;
  process.env.PLAYBACK_STALE_MINUTES = "3";

  try {
    assert.equal(
      isPlaybackSessionStale({
        lastHeartbeatAt: new Date(Date.now() - 60 * 1000),
      }),
      false
    );
    assert.equal(
      isPlaybackSessionStale({
        lastHeartbeatAt: new Date(Date.now() - 4 * 60 * 1000),
      }),
      true
    );
  } finally {
    if (original === undefined) {
      delete process.env.PLAYBACK_STALE_MINUTES;
    } else {
      process.env.PLAYBACK_STALE_MINUTES = original;
    }
  }
});
