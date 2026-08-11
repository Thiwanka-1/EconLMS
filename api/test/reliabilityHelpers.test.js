import assert from "node:assert/strict";
import test from "node:test";

import { getApplicableReminderDay } from "../services/paymentReminderService.js";
import {
  clampPlaybackPosition,
  getPlaybackRewindFloor,
  isPlaybackSessionStale,
  resolvePlaybackRewindLock,
} from "../utils/playback.js";

test("payment reminder catch-up uses the nearest missed configured reminder", () => {
  const configured = [6, 3];

  assert.equal(getApplicableReminderDay(configured, 8), null);
  assert.equal(getApplicableReminderDay(configured, 6), 6);
  assert.equal(getApplicableReminderDay(configured, 5), 6);
  assert.equal(getApplicableReminderDay(configured, 3), 3);
  assert.equal(getApplicableReminderDay(configured, 1), 3);
  assert.equal(getApplicableReminderDay(configured, -1), null);
});

test("server playback positions are constrained to the two-minute window", () => {
  assert.equal(getPlaybackRewindFloor(300), 180);
  assert.equal(
    clampPlaybackPosition({
      currentPositionSeconds: 177,
      furthestWatchedSeconds: 300,
    }),
    180
  );
  assert.equal(
    clampPlaybackPosition({
      currentPositionSeconds: 187,
      furthestWatchedSeconds: 300,
    }),
    187
  );
});

test("server preserves a full-rewind lock until its original position", () => {
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 180,
      furthestWatchedSeconds: 300,
      requestedLockSeconds: 300,
    }),
    300
  );
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 250,
      furthestWatchedSeconds: 300,
      existingLockSeconds: 300,
      requestedLockSeconds: null,
    }),
    300
  );
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 300,
      furthestWatchedSeconds: 300,
      existingLockSeconds: 300,
    }),
    null
  );
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 180,
      furthestWatchedSeconds: 300,
      reachedRewindFloor: true,
    }),
    300
  );
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
