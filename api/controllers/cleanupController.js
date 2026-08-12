import asyncHandler from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLog.js";

import {
  deleteAdministratorData,
  deleteBillingPeriodData,
  deleteCourseData,
  deleteEnrollmentData,
  deleteLessonData,
  deleteLiveClassData,
  deleteRejectedPaymentData,
  deleteStudentData,
} from "../services/dataCleanupService.js";

const respondWithCleanup = async ({
  req,
  res,
  result,
  action,
  entityType,
  entityId,
  description,
}) => {
  await recordAuditLog({
    req,
    action,
    entityType,
    entityId,
    description,
    metadata: {
      counts: result.counts,
      zoomRevoked: result.zoomRevoked || 0,
      storageWarningCount: result.storageWarnings?.length || 0,
    },
  });

  res.status(200).json({
    success: true,
    message: description,
    cleanup: result,
  });
};

export const deleteStudentPermanently = asyncHandler(async (req, res) => {
  const result = await deleteStudentData({
    studentId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "STUDENT_PERMANENTLY_DELETED",
    entityType: "User",
    entityId: result.deletedStudent.id,
    description: `Student ${result.deletedStudent.email} and related LMS data were permanently deleted.`,
  });
});

export const deleteEnrollmentPermanently = asyncHandler(async (req, res) => {
  const result = await deleteEnrollmentData({
    enrollmentId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "ENROLLMENT_PERMANENTLY_DELETED",
    entityType: "Enrollment",
    entityId: result.deletedEnrollment.id,
    description: "The cancelled/suspended enrolment and its related records were permanently deleted.",
  });
});

export const deleteLiveClassPermanently = asyncHandler(async (req, res) => {
  const result = await deleteLiveClassData({
    liveClassId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "LIVE_CLASS_PERMANENTLY_DELETED",
    entityType: "LiveClass",
    entityId: result.deletedLiveClass.id,
    description: `Live class "${result.deletedLiveClass.title}" was permanently deleted from the LMS.`,
  });
});

export const deleteCoursePermanently = asyncHandler(async (req, res) => {
  const result = await deleteCourseData({
    courseId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "COURSE_PERMANENTLY_DELETED",
    entityType: "Course",
    entityId: result.deletedCourse.id,
    description: `Course ${result.deletedCourse.code} and all related LMS records were permanently deleted.`,
  });
});

export const deleteLessonPermanently = asyncHandler(async (req, res) => {
  const result = await deleteLessonData({
    lessonId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "LESSON_PERMANENTLY_DELETED",
    entityType: "Lesson",
    entityId: result.deletedLesson.id,
    description: `Lesson "${result.deletedLesson.title}" and its playback records were permanently deleted.`,
  });
});

export const deleteBillingPeriodPermanently = asyncHandler(async (req, res) => {
  const result = await deleteBillingPeriodData({
    billingPeriodId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "BILLING_PERIOD_PERMANENTLY_DELETED",
    entityType: "BillingPeriod",
    entityId: result.deletedBillingPeriod.id,
    description: `Billing period "${result.deletedBillingPeriod.label}" was permanently deleted.`,
  });
});

export const deleteRejectedPaymentPermanently = asyncHandler(async (req, res) => {
  const result = await deleteRejectedPaymentData({
    paymentId: req.params.id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "REJECTED_PAYMENT_PERMANENTLY_DELETED",
    entityType: "PaymentSubmission",
    entityId: result.deletedPayment.id,
    description: "The rejected payment submission and uploaded slip were permanently deleted.",
  });
});

export const deleteAdministratorPermanently = asyncHandler(async (req, res) => {
  const result = await deleteAdministratorData({
    administratorId: req.params.id,
    actingAdministratorId: req.user._id,
    confirmation: req.body?.confirmation,
  });

  await respondWithCleanup({
    req,
    res,
    result,
    action: "ADMINISTRATOR_PERMANENTLY_DELETED",
    entityType: "User",
    entityId: result.deletedAdministrator.id,
    description: `Administrator ${result.deletedAdministrator.email} was permanently deleted and ownership was transferred.`,
  });
});
