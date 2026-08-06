import "dotenv/config";

import mongoose from "mongoose";

import LiveClass from "../models/LiveClass.js";

import {
  getZoomMeeting,
} from "./zoom.js";

import {
  describeZoomAuthentication,
  getZoomMeetingSecurityIssues,
} from "./zoomMeetingSecurity.js";

const run = async () => {
  await mongoose.connect(
    process.env.MONGO_URI
  );

  const liveClass =
    await LiveClass.findOne({})
      .select("+zoomMeetingId")
      .sort({ createdAt: -1 });

  if (!liveClass) {
    console.log(
      JSON.stringify({
        foundLiveClass: false,
        message:
          "No live class is stored yet.",
      })
    );

    return;
  }

  const meeting = await getZoomMeeting(
    liveClass.zoomMeetingId
  );

  const securityIssues =
    getZoomMeetingSecurityIssues(
      meeting
    );

  console.log(
    JSON.stringify(
      {
        foundLiveClass: true,
        liveClassTitle:
          liveClass.title,
        zoomMeetingType: meeting.type,
        approvalType:
          meeting.settings
            ?.approval_type,
        showJoinInfo:
          meeting.settings
            ?.show_join_info,
        authentication:
          describeZoomAuthentication(
            meeting
          ),
        secure:
          securityIssues.length === 0,
        securityIssues,
      },
      null,
      2
    )
  );

  if (securityIssues.length > 0) {
    process.exitCode = 1;
  }
};

try {
  await run();
} catch (error) {
  console.error(
    JSON.stringify({
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
    })
  );

  process.exitCode = 1;
} finally {
  await mongoose
    .disconnect()
    .catch(() => {});
}
