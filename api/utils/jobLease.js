import { randomUUID } from "node:crypto";
import JobLease from "../models/JobLease.js";

const processOwner = `${process.pid}-${randomUUID()}`;

export const runWithJobLease = async (
  name,
  operation,
  { leaseMilliseconds = 15 * 60 * 1000 } = {}
) => {
  const now = new Date();
  let lease = null;

  try {
    lease = await JobLease.findOneAndUpdate(
      {
        _id: name,
        $or: [
          { lockedUntil: { $lte: now } },
          { owner: processOwner },
        ],
      },
      {
        $set: {
          owner: processOwner,
          lockedUntil: new Date(Date.now() + leaseMilliseconds),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return { skipped: true, reason: "another_process_holds_the_lease" };
    }

    throw error;
  }

  if (!lease || lease.owner !== processOwner) {
    return { skipped: true, reason: "another_process_holds_the_lease" };
  }

  try {
    return await operation();
  } finally {
    await JobLease.updateOne(
      { _id: name, owner: processOwner },
      { $set: { lockedUntil: new Date() } }
    ).catch((error) => {
      console.error(`[JOB_LEASE] Failed to release ${name}:`, error.message);
    });
  }
};
