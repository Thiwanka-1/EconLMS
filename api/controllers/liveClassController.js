import Course from "../models/Course.js";
import BillingPeriod from "../models/BillingPeriod.js";
import LiveClass from "../models/LiveClass.js";
import ZoomRegistration from "../models/ZoomRegistration.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  getOrCreateCurrentBillingPeriod,
} from "../utils/billingPeriod.js";

import {
  getZoomMeeting,
  normalizeZoomMeetingId,
} from "../utils/zoom.js";

import {
  checkStudentLiveClassAccess,
  ensureStudentZoomRegistration,
  getDecryptedJoinUrl,
  syncLiveClassRegistrations,
} from "../services/zoomRegistrationService.js";

import {
  getPlatformSettings,
} from "../utils/platformSettings.js";

/*
 * Finds or creates the correct billing period
 * for a live class.
 */
const resolveBillingPeriod = async ({
  course,
  billingPeriodId,
}) => {
  if (
    course.paymentPlan === "one_time"
  ) {
    if (billingPeriodId) {
      throw new HttpError(
        400,
        "One-time courses cannot use a billing period."
      );
    }

    return null;
  }

  /*
   * When no period is supplied for a monthly
   * course, use the current billing period.
   */
  if (!billingPeriodId) {
    return getOrCreateCurrentBillingPeriod(
      course
    );
  }

  const billingPeriod =
    await BillingPeriod.findOne({
      _id: billingPeriodId,
      course: course._id,
      isArchived: false,
    });

  if (!billingPeriod) {
    throw new HttpError(
      400,
      "The billing period does not belong to this course."
    );
  }

  return billingPeriod;
};

/*
 * Validates the number of minutes used for
 * the Zoom joining window.
 */
const parseJoinWindowMinutes = ({
  value,
  fallback,
  fieldName,
}) => {
  const parsedValue = Number(
    value ?? fallback
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > 1440
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be a whole number between 0 and 1440.`
    );
  }

  return parsedValue;
};

/*
 * Calculates when the Zoom join button should
 * open and close.
 */
const getJoinWindow = (liveClass) => {
  const startTime = new Date(
    liveClass.startTime
  ).getTime();

  const durationMinutes = Number(
    liveClass.durationMinutes
  );

  const joinBeforeMinutes = Number(
    liveClass.joinWindowMinutesBefore
  );

  const joinAfterMinutes = Number(
    liveClass.joinWindowMinutesAfter
  );

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(durationMinutes) ||
    !Number.isFinite(joinBeforeMinutes) ||
    !Number.isFinite(joinAfterMinutes)
  ) {
    throw new HttpError(
      500,
      "The live-class joining window is invalid."
    );
  }

  const endTime =
    startTime +
    durationMinutes * 60 * 1000;

  const opensAt =
    startTime -
    joinBeforeMinutes * 60 * 1000;

  const closesAt =
    endTime +
    joinAfterMinutes * 60 * 1000;

  const now = Date.now();

  return {
    opensAt: new Date(opensAt),
    closesAt: new Date(closesAt),

    canJoinNow:
      now >= opensAt &&
      now <= closesAt,
  };
};

/*
 * LiveClass.toJSON() hides Zoom meeting fields.
 * Admin endpoints can use this function when
 * those fields need to be returned.
 */
const serializeAdminLiveClass = (
  liveClass
) => {
  return liveClass.toObject({
    versionKey: false,
    transform: false,
  });
};

/*
 * ADMIN: Create a live class by connecting an
 * existing Zoom meeting.
 */
export const createLiveClass =
  asyncHandler(async (req, res) => {
    const {
      courseId,
      billingPeriodId,
      zoomMeetingId,
      title,
      description,
      joinWindowMinutesBefore,
      joinWindowMinutesAfter,
      isPublished,
    } = req.body;

    if (!courseId || !zoomMeetingId) {
      throw new HttpError(
        400,
        "Course and Zoom meeting ID are required."
      );
    }

    const course =
      await Course.findById(courseId);

    if (
      !course ||
      course.isArchived
    ) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    const normalizedMeetingId =
      normalizeZoomMeetingId(
        zoomMeetingId
      );

    if (!normalizedMeetingId) {
      throw new HttpError(
        400,
        "A valid Zoom meeting ID is required."
      );
    }

    const existingLiveClass =
      await LiveClass.findOne({
        zoomMeetingId:
          normalizedMeetingId,
      });

    if (existingLiveClass) {
      throw new HttpError(
        409,
        "This Zoom meeting is already connected to a live class."
      );
    }

    const billingPeriod =
      await resolveBillingPeriod({
        course,
        billingPeriodId,
      });

    /*
     * Fetch the official meeting details
     * directly from Zoom.
     */
    const zoomMeeting =
      await getZoomMeeting(
        normalizedMeetingId
      );

    /*
     * Type 2 means a scheduled,
     * non-recurring Zoom meeting.
     */
    if (zoomMeeting.type !== 2) {
      throw new HttpError(
        400,
        "Use a scheduled Zoom meeting, not an instant, PMI or recurring meeting."
      );
    }

    if (!zoomMeeting.start_time) {
      throw new HttpError(
        400,
        "The Zoom meeting does not have a scheduled start time."
      );
    }

    /*
     * approval_type 2 means that registration
     * is not enabled for the meeting.
     */
    if (
      zoomMeeting.settings
        ?.approval_type === 2
    ) {
      throw new HttpError(
        400,
        "Registration is not enabled for this Zoom meeting."
      );
    }

    const platformSettings =
      await getPlatformSettings();

    const defaultJoinBefore =
      platformSettings?.liveClasses
        ?.defaultJoinBeforeMinutes ??
      30;

    const defaultJoinAfter =
      platformSettings?.liveClasses
        ?.defaultJoinAfterMinutes ??
      15;

    const parsedJoinBefore =
      parseJoinWindowMinutes({
        value:
          joinWindowMinutesBefore,
        fallback:
          defaultJoinBefore,
        fieldName:
          "joinWindowMinutesBefore",
      });

    const parsedJoinAfter =
      parseJoinWindowMinutes({
        value:
          joinWindowMinutesAfter,
        fallback:
          defaultJoinAfter,
        fieldName:
          "joinWindowMinutesAfter",
      });

    const liveClass =
      await LiveClass.create({
        course: course._id,

        paymentPlan:
          course.paymentPlan,

        billingPeriod:
          billingPeriod?._id || null,

        title:
          String(
            title ||
              zoomMeeting.topic ||
              `${course.title} Live Class`
          ).trim(),

        description:
          String(
            description ||
              zoomMeeting.agenda ||
              ""
          ).trim(),

        zoomMeetingId:
          normalizedMeetingId,

        zoomMeetingUuid:
          zoomMeeting.uuid || null,

        startTime:
          new Date(
            zoomMeeting.start_time
          ),

        durationMinutes:
          Number(
            zoomMeeting.duration || 60
          ),

        timezone:
          zoomMeeting.timezone ||
          process.env.APP_TIMEZONE ||
          "Asia/Colombo",

        joinWindowMinutesBefore:
          parsedJoinBefore,

        joinWindowMinutesAfter:
          parsedJoinAfter,

        isPublished:
          typeof isPublished ===
          "boolean"
            ? isPublished
            : true,

        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

    /*
     * Register existing paid students.
     * Failure here must not delete or undo
     * the newly created live class.
     */
    let registrationSync = null;

    if (liveClass.isPublished) {
      try {
        registrationSync =
          await syncLiveClassRegistrations(
            liveClass
          );
      } catch (error) {
        console.error(
          "[ZOOM] Initial registration synchronization failed:",
          error.message
        );

        registrationSync = {
          success: false,
          successCount: 0,
          failureCount: 0,
          error: error.message,
        };
      }
    }

    const adminLiveClass =
      await LiveClass.findById(
        liveClass._id
      )
        .select(
          "+zoomMeetingId +zoomMeetingUuid"
        )
        .populate(
          "course",
          "title code paymentPlan"
        )
        .populate(
          "billingPeriod",
          "label year month"
        );

    res.status(201).json({
      success: true,

      message:
        "Live class connected successfully.",

      liveClass:
        serializeAdminLiveClass(
          adminLiveClass
        ),

      registrationSync,
    });
  });

/*
 * ADMIN: List live classes.
 */
export const getAdminLiveClasses =
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.courseId) {
      filter.course =
        req.query.courseId;
    }

    if (req.query.status) {
      const allowedStatuses = [
        "scheduled",
        "completed",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          req.query.status
        )
      ) {
        throw new HttpError(
          400,
          "Invalid live-class status."
        );
      }

      filter.status =
        req.query.status;
    }

    const liveClasses =
      await LiveClass.find(filter)
        .select(
          "+zoomMeetingId +zoomMeetingUuid"
        )
        .populate(
          "course",
          "title code paymentPlan"
        )
        .populate(
          "billingPeriod",
          "label year month"
        )
        .populate(
          "createdBy updatedBy",
          "firstName lastName email"
        )
        .sort({
          startTime: 1,
        });

    res.status(200).json({
      success: true,

      liveClasses:
        liveClasses.map(
          serializeAdminLiveClass
        ),
    });
  });

/*
 * STUDENT: List published live classes for
 * a course.
 *
 * Zoom meeting IDs and join URLs are not
 * returned here.
 */
export const getStudentLiveClasses =
  asyncHandler(async (req, res) => {
    const course =
      await Course.findById(
        req.params.courseId
      );

    if (
      !course ||
      !course.isPublished ||
      course.isArchived
    ) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    const liveClasses =
      await LiveClass.find({
        course: course._id,
        isPublished: true,
        status: "scheduled",
      })
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          startTime: 1,
        });

    const results = [];

    for (const liveClass of liveClasses) {
      const access =
        await checkStudentLiveClassAccess({
          studentId:
            req.user._id,
          liveClass,
        });

      const registration =
        await ZoomRegistration.findOne({
          liveClass:
            liveClass._id,
          student: req.user._id,
        }).select("status");

      const joinWindow =
        getJoinWindow(liveClass);

      results.push({
        ...liveClass.toJSON(),

        access: {
          hasAccess:
            access.hasAccess,
          reason: access.reason,
        },

        zoomRegistrationStatus:
          registration?.status ||
          "not_registered",

        joinWindow,
      });
    }

    res.status(200).json({
      success: true,
      liveClasses: results,
    });
  });

/*
 * STUDENT: Receive the unique Zoom join URL.
 */
export const joinLiveClass =
  asyncHandler(async (req, res) => {
    /*
     * zoomMeetingId is hidden by default in
     * the model, so it must be selected here.
     */
    const liveClass =
      await LiveClass.findById(
        req.params.id
      ).select("+zoomMeetingId");

    if (
      !liveClass ||
      !liveClass.isPublished ||
      liveClass.status !==
        "scheduled"
    ) {
      throw new HttpError(
        404,
        "Live class not found."
      );
    }

    const access =
      await checkStudentLiveClassAccess({
        studentId:
          req.user._id,
        liveClass,
      });

    if (!access.hasAccess) {
      throw new HttpError(
        403,
        access.reason
      );
    }

    const joinWindow =
      getJoinWindow(liveClass);

    if (!joinWindow.canJoinNow) {
      const currentTime =
        new Date();

      const message =
        currentTime <
        joinWindow.opensAt
          ? `The join button will become available at ${joinWindow.opensAt.toISOString()}.`
          : "The joining period for this class has ended.";

      throw new HttpError(
        403,
        message
      );
    }

    const registration =
      await ensureStudentZoomRegistration({
        student: req.user,
        liveClass,
      });

    const joinUrl =
      getDecryptedJoinUrl(
        registration
      );

    if (!joinUrl) {
      throw new HttpError(502, "The unique Zoom join URL is unavailable.");
    }

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).json({
      success: true,

      message:
        "Unique Zoom join link generated.",

      liveClass: {
        _id: liveClass._id,
        title: liveClass.title,
        startTime:
          liveClass.startTime,
      },

      zoomEmail:
        req.user.zoomEmail,

      joinUrl,

      expiresFromWebsiteAt:
        joinWindow.closesAt,
    });
  });

/*
 * ADMIN: Register all eligible paid students
 * for a live class.
 */
export const syncLiveClass =
  asyncHandler(async (req, res) => {
    const result =
      await syncLiveClassRegistrations(
        req.params.id
      );

    res.status(200).json({
      success: result.success,

      message:
        "Zoom registration synchronization completed.",

      registrationSync: result,
    });
  });

/*
 * ADMIN: Refresh title, time and duration
 * from the connected Zoom meeting.
 */
export const refreshLiveClassFromZoom =
  asyncHandler(async (req, res) => {
    /*
     * Both fields are hidden by default,
     * so they must be selected here.
     */
    const liveClass =
      await LiveClass.findById(
        req.params.id
      ).select(
        "+zoomMeetingId +zoomMeetingUuid"
      );

    if (!liveClass) {
      throw new HttpError(
        404,
        "Live class not found."
      );
    }

    const zoomMeeting =
      await getZoomMeeting(
        liveClass.zoomMeetingId
      );

    if (!zoomMeeting.start_time) {
      throw new HttpError(
        502,
        "Zoom did not return a valid meeting start time."
      );
    }

    liveClass.title =
      req.body.keepCustomTitle ===
      true
        ? liveClass.title
        : zoomMeeting.topic ||
          liveClass.title;

    liveClass.startTime =
      new Date(
        zoomMeeting.start_time
      );

    liveClass.durationMinutes =
      Number(
        zoomMeeting.duration ||
          liveClass.durationMinutes
      );

    liveClass.timezone =
      zoomMeeting.timezone ||
      liveClass.timezone;

    liveClass.zoomMeetingUuid =
      zoomMeeting.uuid ||
      liveClass.zoomMeetingUuid;

    liveClass.updatedBy =
      req.user._id;

    await liveClass.save();

    res.status(200).json({
      success: true,

      message:
        "Live class refreshed from Zoom.",

      liveClass:
        serializeAdminLiveClass(
          liveClass
        ),
    });
  });

/*
 * ADMIN: Publish, unpublish, complete or
 * cancel a live class.
 */
export const updateLiveClassStatus = asyncHandler(async (req, res) => {
  const allowedStatuses = ["scheduled", "completed", "cancelled"];
  const { status, isPublished } = req.body;

  if (status === undefined && isPublished === undefined) {
    throw new HttpError(400, "Provide status or isPublished.");
  }

  if (status !== undefined && !allowedStatuses.includes(status)) {
    throw new HttpError(400, "Invalid live-class status.");
  }

  if (isPublished !== undefined && typeof isPublished !== "boolean") {
    throw new HttpError(400, "isPublished must be true or false.");
  }

  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new HttpError(404, "Live class not found.");
  }

  if (status !== undefined) {
    liveClass.status = status;
  }

  if (isPublished !== undefined) {
    liveClass.isPublished = isPublished;
  }

  liveClass.updatedBy = req.user._id;
  await liveClass.save();

  let registrationSync = null;

  const shouldSynchronize =
    liveClass.isPublished &&
    liveClass.status === "scheduled" &&
    (isPublished === true || status === "scheduled");

  if (shouldSynchronize) {
    try {
      registrationSync = await syncLiveClassRegistrations(liveClass);
    } catch (error) {
      console.error(
        "[ZOOM] Registration synchronization after status update failed:",
        error.message
      );

      registrationSync = {
        success: false,
        successCount: 0,
        failureCount: 0,
        error: error.message,
      };
    }
  }

  res.status(200).json({
    success: true,
    message: "Live-class status updated.",
    liveClass,
    registrationSync,
  });
});