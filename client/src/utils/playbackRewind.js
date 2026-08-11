export const PLAYBACK_REWIND_LIMIT_SECONDS = 120;
export const PLAYBACK_REWIND_STEP_SECONDS = 10;

const normalizeSeconds = (value) => Math.max(Number(value) || 0, 0);

export const getPlaybackRewindFloor = (furthestWatchedSeconds) => {
  return Math.max(
    normalizeSeconds(furthestWatchedSeconds) - PLAYBACK_REWIND_LIMIT_SECONDS,
    0,
  );
};

export const getPlaybackRewindAvailable = ({
  currentPositionSeconds,
  furthestWatchedSeconds,
}) => {
  const floor = getPlaybackRewindFloor(furthestWatchedSeconds);
  const current = normalizeSeconds(currentPositionSeconds);

  return Math.min(
    Math.max(current - floor, 0),
    PLAYBACK_REWIND_LIMIT_SECONDS,
  );
};

export const getPlaybackRewindTarget = ({
  currentPositionSeconds,
  furthestWatchedSeconds,
  stepSeconds = PLAYBACK_REWIND_STEP_SECONDS,
}) => {
  const floor = getPlaybackRewindFloor(furthestWatchedSeconds);
  const current = Math.max(normalizeSeconds(currentPositionSeconds), floor);
  const available = Math.max(current - floor, 0);
  const actualStep = Math.min(normalizeSeconds(stepSeconds), available);

  return {
    canRewind: actualStep > 0,
    availableSeconds: Math.min(available, PLAYBACK_REWIND_LIMIT_SECONDS),
    actualStepSeconds: actualStep,
    targetSeconds: Math.max(current - actualStep, floor),
    floorSeconds: floor,
  };
};

export const clampPlaybackResumePosition = ({
  currentPositionSeconds,
  furthestWatchedSeconds,
}) => {
  const furthest = normalizeSeconds(furthestWatchedSeconds);
  const floor = getPlaybackRewindFloor(furthest);

  return Math.min(
    Math.max(normalizeSeconds(currentPositionSeconds), floor),
    furthest,
  );
};

export const resolvePlaybackRewindLock = ({
  currentPositionSeconds,
  furthestWatchedSeconds,
  existingLockSeconds = null,
  reachedRewindFloor = false,
}) => {
  const current = normalizeSeconds(currentPositionSeconds);
  const furthest = normalizeSeconds(furthestWatchedSeconds);
  const requestedExistingLock = Number(existingLockSeconds);
  const existingLock =
    Number.isFinite(requestedExistingLock) && requestedExistingLock > 0
      ? Math.min(requestedExistingLock, furthest)
      : null;

  if (existingLock !== null && current < existingLock - 0.1) {
    return existingLock;
  }

  if (reachedRewindFloor && current < furthest - 0.1) {
    return furthest;
  }

  return null;
};
