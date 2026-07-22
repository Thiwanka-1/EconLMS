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

const getJoinWindow = (liveClass) => {
  const startTime =
    new Date(
      liveClass.startTime
    ).getTime();

  const endTime =
    startTime +
    liveClass.durationMinutes *
      60 *
      1000;

  const opensAt =
    startTime -
    liveClass
      .joinWindowMinutesBefore *
      60 *
      1000;

  const closesAt =
    endTime +
    liveClass
      .joinWindowMinutesAfter *
      60 *
      1000;

  return {
    opensAt: new Date(opensAt),
    closesAt: new Date(closesAt),

    canJoinNow:
      Date.now() >= opensAt &&
      Date.now() <= closesAt,
  };
};

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

    const zoomMeeting =
      await getZoomMeeting(
        normalizedMeetingId
      );

    /*
     * Initial implementation supports one
     * scheduled Zoom meeting per live class.
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

    if (
      zoomMeeting.settings
        ?.approval_type === 2
    ) {
      throw new HttpError(
        400,
        "Registration is not enabled for this Zoom meeting."
      );
    }

    const liveClass =
      await LiveClass.create({
        course: course._id,

        paymentPlan:
          course.paymentPlan,

        billingPeriod:
          billingPeriod?._id || null,

        title:
          title ||
          zoomMeeting.topic ||
          `${course.title} Live Class`,

        description:
          description ||
          zoomMeeting.agenda ||
          "",

        zoomMeetingId:
          normalizedMeetingId,

        zoomMeetingUuid:
          zoomMeeting.uuid || null,

        startTime:
          zoomMeeting.start_time,

        durationMinutes:
          Number(
            zoomMeeting.duration || 60
          ),

        timezone:
          zoomMeeting.timezone ||
          process.env.APP_TIMEZONE ||
          "Asia/Colombo",

        joinWindowMinutesBefore:
          Number(
            joinWindowMinutesBefore ??
              process.env
                .ZOOM_DEFAULT_JOIN_BEFORE_MINUTES ??
              30
          ),

        joinWindowMinutesAfter:
          Number(
            joinWindowMinutesAfter ??
              process.env
                .ZOOM_DEFAULT_JOIN_AFTER_MINUTES ??
              15
          ),

        isPublished:
          typeof isPublished ===
          "boolean"
            ? isPublished
            : true,

        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

    let registrationSync = null;

    if (liveClass.isPublished) {
      registrationSync =
        await syncLiveClassRegistrations(
          liveClass
        );
    }

    res.status(201).json({
      success: true,
      message:
        "Live class connected successfully.",
      liveClass,
      registrationSync,
    });
  });

export const getAdminLiveClasses =
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.courseId) {
      filter.course =
        req.query.courseId;
    }

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    const liveClasses =
      await LiveClass.find(filter)
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
      liveClasses,
    });
  });

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
        await checkStudentLiveClassAccess(
          {
            studentId:
              req.user._id,
            liveClass,
          }
        );

      const registration =
        await ZoomRegistration.findOne({
          liveClass:
            liveClass._id,
          student: req.user._id,
        });

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

export const joinLiveClass =
  asyncHandler(async (req, res) => {
    const liveClass =
      await LiveClass.findById(
        req.params.id
      );

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
      await checkStudentLiveClassAccess(
        {
          studentId: req.user._id,
          liveClass,
        }
      );

    if (!access.hasAccess) {
      throw new HttpError(
        403,
        access.reason
      );
    }

    const joinWindow =
      getJoinWindow(liveClass);

    if (!joinWindow.canJoinNow) {
      throw new HttpError(
        403,
        new Date() <
          joinWindow.opensAt
          ? `The join button will become available at ${joinWindow.opensAt.toISOString()}.`
          : "The joining period for this class has ended."
      );
    }

    const registration =
      await ensureStudentZoomRegistration(
        {
          student: req.user,
          liveClass,
        }
      );

    const joinUrl =
      getDecryptedJoinUrl(
        registration
      );

    if (!joinUrl) {
      throw new HttpError(
        502,
        "The unique Zoom join URL is unavailable."
      );
    }

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

export const refreshLiveClassFromZoom =
  asyncHandler(async (req, res) => {
    const liveClass =
      await LiveClass.findById(
        req.params.id
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

    liveClass.title =
      req.body.keepCustomTitle ===
      true
        ? liveClass.title
        : zoomMeeting.topic ||
          liveClass.title;

    liveClass.startTime =
      zoomMeeting.start_time;

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
      liveClass,
    });
  });

export const updateLiveClassStatus =
  asyncHandler(async (req, res) => {
    const allowedStatuses = [
      "scheduled",
      "completed",
      "cancelled",
    ];

    const {
      status,
      isPublished,
    } = req.body;

    const liveClass =
      await LiveClass.findById(
        req.params.id
      );

    if (!liveClass) {
      throw new HttpError(
        404,
        "Live class not found."
      );
    }

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      throw new HttpError(
        400,
        "Invalid live-class status."
      );
    }

    if (status !== undefined) {
      liveClass.status = status;
    }

    if (
      isPublished !== undefined
    ) {
      if (
        typeof isPublished !==
        "boolean"
      ) {
        throw new HttpError(
          400,
          "isPublished must be true or false."
        );
      }

      liveClass.isPublished =
        isPublished;
    }

    liveClass.updatedBy =
      req.user._id;

    await liveClass.save();

    res.status(200).json({
      success: true,
      message:
        "Live-class status updated.",
      liveClass,
    });
  });