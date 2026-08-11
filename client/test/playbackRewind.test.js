import assert from "node:assert/strict";
import test from "node:test";

import {
  getPlaybackRewindAvailable,
  getPlaybackRewindTarget,
  resolvePlaybackRewindLock,
} from "../src/utils/playbackRewind.js";

test("rewind never passes the original two-minute boundary", () => {
  const furthestWatchedSeconds = 300;
  let currentPositionSeconds = 300;

  for (let index = 0; index < 12; index += 1) {
    currentPositionSeconds = getPlaybackRewindTarget({
      currentPositionSeconds,
      furthestWatchedSeconds,
    }).targetSeconds;
  }

  assert.equal(currentPositionSeconds, 180);
  assert.equal(
    getPlaybackRewindTarget({
      currentPositionSeconds,
      furthestWatchedSeconds,
    }).canRewind,
    false,
  );
});

test("the final rewind uses only the seconds remaining before the boundary", () => {
  const result = getPlaybackRewindTarget({
    currentPositionSeconds: 187,
    furthestWatchedSeconds: 300,
  });

  assert.equal(result.actualStepSeconds, 7);
  assert.equal(result.targetSeconds, 180);
});

test("using the full rewind locks it until the original position is reached", () => {
  const lock = resolvePlaybackRewindLock({
    currentPositionSeconds: 180,
    furthestWatchedSeconds: 300,
    reachedRewindFloor: true,
  });

  assert.equal(lock, 300);
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 250,
      furthestWatchedSeconds: 300,
      existingLockSeconds: lock,
    }),
    300,
  );
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 300,
      furthestWatchedSeconds: 300,
      existingLockSeconds: lock,
    }),
    null,
  );
});

test("a partial rewind does not create the full-rewind lock", () => {
  assert.equal(
    resolvePlaybackRewindLock({
      currentPositionSeconds: 250,
      furthestWatchedSeconds: 300,
      reachedRewindFloor: false,
    }),
    null,
  );
  assert.equal(
    getPlaybackRewindAvailable({
      currentPositionSeconds: 250,
      furthestWatchedSeconds: 300,
    }),
    70,
  );
});

test("rewind availability is smaller near the beginning of a lesson", () => {
  assert.equal(
    getPlaybackRewindAvailable({
      currentPositionSeconds: 50,
      furthestWatchedSeconds: 50,
    }),
    50,
  );
});
