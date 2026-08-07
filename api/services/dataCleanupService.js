import AuditLog from "../models/AuditLog.js";
import BillingPeriod from "../models/BillingPeriod.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import LessonView from "../models/LessonView.js";
import LiveClass from "../models/LiveClass.js";
import Notification from "../models/Notification.js";
import PaymentSubmission from "../models/PaymentSubmission.js";
import User from "../models/User.js";
import ZoomRegistration from "../models/ZoomRegistration.js";

import HttpError from "../utils/HttpError.js";
import { deleteDriveFile } from "../utils/googleDrive.js";
import { revokeZoomRegistrations } from "./zoomRegistrationService.js";

const deleteExternalFiles = async (fileIds) => {
  const warnings = [];
  const uniqueIds = [...new Set(fileIds.filter(Boolean))];

  for (const fileId of uniqueIds) {
    try {
      await deleteDriveFile(fileId);
    } catch (error) {
      warnings.push({
        resource: "google_drive_file",
        error: error.message,
      });
    }
  }

  if (warnings.length > 0) {
    throw new HttpError(
      502,
      `${warnings.length} Google Drive file(s) could not be deleted. Database records were kept so the cleanup can be retried safely.`
    );
  }

  return warnings;
};

const requireZoomRevocation = async (filter) => {
  const result = await revokeZoomRegistrations(filter);

  if (!result.success) {
    throw new HttpError(
      502,
      `Zoom access could not be revoked for ${result.failureCount} registration(s). Nothing was deleted; retry when Zoom is available.`
    );
  }

  return result;
};

const getPaymentFiles = async (filter) => {
  return PaymentSubmission.find(filter).select("+driveFileId");
};

const idVariants = (value) => [value, value.toString()];

const deleteRelatedNotifications = async ({
  recipientId = null,
  studentId = null,
  courseId = null,
  enrollmentIds = [],
  paymentIds = [],
  liveClassIds = [],
  lessonIds = [],
  billingPeriodIds = [],
}) => {
  const conditions = [];

  if (recipientId) {
    conditions.push({ recipient: recipientId });
  }

  const addDataCondition = (field, values) => {
    const variants = values.flatMap(idVariants);

    if (variants.length > 0) {
      conditions.push({ [`data.${field}`]: { $in: variants } });
    }
  };

  if (studentId) {
    addDataCondition("studentId", [studentId]);
  }

  if (courseId) {
    addDataCondition("courseId", [courseId]);
  }

  addDataCondition("enrollmentId", enrollmentIds);
  addDataCondition("paymentId", paymentIds);
  addDataCondition("paymentSubmissionId", paymentIds);
  addDataCondition("liveClassId", liveClassIds);
  addDataCondition("lessonId", lessonIds);
  addDataCondition("billingPeriodId", billingPeriodIds);

  if (conditions.length === 0) {
    return { deletedCount: 0 };
  }

  return Notification.deleteMany({ $or: conditions });
};

export const deleteStudentData = async ({ studentId, confirmation }) => {
  const student = await User.findById(studentId).select("+nicImageFileId");

  if (!student || student.role !== "student") {
    throw new HttpError(404, "Student account not found.");
  }

  if (student.isActive) {
    throw new HttpError(409, "Disable the student account before permanent deletion.");
  }

  if (
    String(confirmation || "").trim().toLowerCase() !==
    student.email.toLowerCase()
  ) {
    throw new HttpError(400, "Enter the student's exact email address to confirm deletion.");
  }

  const [payments, enrollmentIds, liveClassIds, lessonIds] = await Promise.all([
    getPaymentFiles({ student: student._id }),
    Enrollment.distinct("_id", { student: student._id }),
    ZoomRegistration.distinct("liveClass", { student: student._id }),
    LessonView.distinct("lesson", { student: student._id }),
  ]);

  const zoom = await requireZoomRevocation({ studentId: student._id });
  const storageWarnings = await deleteExternalFiles([
    student.nicImageFileId,
    ...payments.map((payment) => payment.driveFileId),
  ]);
  const paymentIds = payments.map((payment) => payment._id);

  const results = {};
  results.notifications = await deleteRelatedNotifications({
    recipientId: student._id,
    studentId: student._id,
    enrollmentIds,
    paymentIds,
    liveClassIds,
    lessonIds,
  });
  results.zoomRegistrations = await ZoomRegistration.deleteMany({ student: student._id });
  results.lessonViews = await LessonView.deleteMany({ student: student._id });
  results.payments = await PaymentSubmission.deleteMany({ student: student._id });
  results.enrollments = await Enrollment.deleteMany({ student: student._id });

  await AuditLog.updateMany({ actor: student._id }, { $set: { actor: null } });
  await AuditLog.updateMany({ targetUser: student._id }, { $set: { targetUser: null } });

  await User.deleteOne({ _id: student._id });

  return {
    deletedStudent: {
      id: student._id,
      email: student.email,
      name: `${student.firstName} ${student.lastName}`.trim(),
    },
    counts: Object.fromEntries(
      Object.entries(results).map(([key, value]) => [key, value.deletedCount || 0])
    ),
    zoomRevoked: zoom.successCount,
    storageWarnings,
  };
};

export const deleteEnrollmentData = async ({ enrollmentId, confirmation }) => {
  const enrollment = await Enrollment.findById(enrollmentId)
    .populate("student", "firstName lastName email")
    .populate("course", "title code");

  if (!enrollment) {
    throw new HttpError(404, "Enrolment not found.");
  }

  if (!["cancelled", "suspended"].includes(enrollment.status)) {
    throw new HttpError(409, "Only cancelled or suspended enrolments can be permanently deleted.");
  }

  if (String(confirmation || "").trim().toUpperCase() !== "DELETE") {
    throw new HttpError(400, "Enter DELETE to confirm permanent enrolment deletion.");
  }

  const payments = await getPaymentFiles({ enrollment: enrollment._id });
  const paymentIds = payments.map((payment) => payment._id);

  const zoom = await requireZoomRevocation({
    studentId: enrollment.student?._id || enrollment.student,
    courseId: enrollment.course?._id || enrollment.course,
  });
  const storageWarnings = await deleteExternalFiles(
    payments.map((payment) => payment.driveFileId)
  );

  const notificationResult = await deleteRelatedNotifications({
    enrollmentIds: [enrollment._id],
    paymentIds,
  });
  const studentCourseNotificationResult = await Notification.deleteMany({
    recipient: enrollment.student?._id || enrollment.student,
    "data.courseId": {
      $in: idVariants(enrollment.course?._id || enrollment.course),
    },
  });
  const zoomResult = await ZoomRegistration.deleteMany({
    student: enrollment.student?._id || enrollment.student,
    course: enrollment.course?._id || enrollment.course,
  });
  const viewResult = await LessonView.deleteMany({
    student: enrollment.student?._id || enrollment.student,
    course: enrollment.course?._id || enrollment.course,
  });
  const paymentResult = await PaymentSubmission.deleteMany({ enrollment: enrollment._id });
  await Enrollment.deleteOne({ _id: enrollment._id });

  return {
    deletedEnrollment: {
      id: enrollment._id,
      studentEmail: enrollment.student?.email || "",
      courseCode: enrollment.course?.code || "",
    },
    counts: {
      notifications: notificationResult.deletedCount || 0,
      studentCourseNotifications:
        studentCourseNotificationResult.deletedCount || 0,
      zoomRegistrations: zoomResult.deletedCount || 0,
      lessonViews: viewResult.deletedCount || 0,
      payments: paymentResult.deletedCount || 0,
    },
    zoomRevoked: zoom.successCount,
    storageWarnings,
  };
};

export const deleteLiveClassData = async ({ liveClassId, confirmation }) => {
  const liveClass = await LiveClass.findById(liveClassId).select("+zoomMeetingId");

  if (!liveClass) {
    throw new HttpError(404, "Live class not found.");
  }

  if (liveClass.status === "scheduled" && liveClass.isPublished) {
    throw new HttpError(409, "Unpublish or complete/cancel the live class before deleting it.");
  }

  if (String(confirmation || "").trim() !== liveClass.title) {
    throw new HttpError(400, "Enter the exact live-class title to confirm deletion.");
  }

  const zoom = await requireZoomRevocation({ liveClassId: liveClass._id });
  const notificationResult = await deleteRelatedNotifications({
    liveClassIds: [liveClass._id],
  });
  const registrationResult = await ZoomRegistration.deleteMany({ liveClass: liveClass._id });
  await LiveClass.deleteOne({ _id: liveClass._id });

  return {
    deletedLiveClass: { id: liveClass._id, title: liveClass.title },
    counts: {
      notifications: notificationResult.deletedCount || 0,
      zoomRegistrations: registrationResult.deletedCount || 0,
    },
    zoomRevoked: zoom.successCount,
  };
};

export const deleteCourseData = async ({ courseId, confirmation }) => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new HttpError(404, "Course not found.");
  }

  if (!course.isArchived || course.isPublished) {
    throw new HttpError(409, "A course must be unpublished and archived before permanent deletion.");
  }

  if (String(confirmation || "").trim().toUpperCase() !== course.code) {
    throw new HttpError(400, "Enter the exact course code to confirm deletion.");
  }

  const [payments, enrollmentIds, lessonIds, liveClassIds, billingPeriodIds] =
    await Promise.all([
      getPaymentFiles({ course: course._id }),
      Enrollment.distinct("_id", { course: course._id }),
      Lesson.distinct("_id", { course: course._id }),
      LiveClass.distinct("_id", { course: course._id }),
      BillingPeriod.distinct("_id", { course: course._id }),
    ]);
  const paymentIds = payments.map((payment) => payment._id);

  const zoom = await requireZoomRevocation({ courseId: course._id });
  const storageWarnings = await deleteExternalFiles(
    payments.map((payment) => payment.driveFileId)
  );

  const results = {};
  results.notifications = await deleteRelatedNotifications({
    courseId: course._id,
    enrollmentIds,
    paymentIds,
    liveClassIds,
    lessonIds,
    billingPeriodIds,
  });
  results.zoomRegistrations = await ZoomRegistration.deleteMany({ course: course._id });
  results.lessonViews = await LessonView.deleteMany({ course: course._id });
  results.payments = await PaymentSubmission.deleteMany({ course: course._id });
  results.enrollments = await Enrollment.deleteMany({ course: course._id });
  results.liveClasses = await LiveClass.deleteMany({ course: course._id });
  results.lessons = await Lesson.deleteMany({ course: course._id });
  results.billingPeriods = await BillingPeriod.deleteMany({ course: course._id });
  await Course.deleteOne({ _id: course._id });

  return {
    deletedCourse: { id: course._id, code: course.code, title: course.title },
    counts: Object.fromEntries(
      Object.entries(results).map(([key, value]) => [key, value.deletedCount || 0])
    ),
    zoomRevoked: zoom.successCount,
    storageWarnings,
  };
};
