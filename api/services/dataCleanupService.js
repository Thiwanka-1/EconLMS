import AuditLog from "../models/AuditLog.js";
import BillingPeriod from "../models/BillingPeriod.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import LessonView from "../models/LessonView.js";
import LiveClass from "../models/LiveClass.js";
import Notification from "../models/Notification.js";
import PaymentSubmission from "../models/PaymentSubmission.js";
import PlatformSetting from "../models/PlatformSetting.js";
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

export const deleteLessonData = async ({ lessonId, confirmation }) => {
  const lesson = await Lesson.findById(lessonId);

  if (!lesson) {
    throw new HttpError(404, "Lesson not found.");
  }

  if (!lesson.isArchived || lesson.isPublished) {
    throw new HttpError(
      409,
      "A lesson must be unpublished and archived before permanent deletion."
    );
  }

  if (String(confirmation || "").trim() !== lesson.title) {
    throw new HttpError(400, "Enter the exact lesson title to confirm deletion.");
  }

  const activePlaybackCount = await LessonView.countDocuments({
    lesson: lesson._id,
    activeSession: { $ne: null },
  });

  if (activePlaybackCount > 0) {
    throw new HttpError(
      409,
      `${activePlaybackCount} active playback session(s) still use this lesson. Wait for them to end or expire before deleting it.`
    );
  }

  const notifications = await deleteRelatedNotifications({
    lessonIds: [lesson._id],
  });
  const lessonViews = await LessonView.deleteMany({ lesson: lesson._id });
  await Lesson.deleteOne({ _id: lesson._id });

  return {
    deletedLesson: {
      id: lesson._id,
      title: lesson.title,
    },
    counts: {
      notifications: notifications.deletedCount || 0,
      lessonViews: lessonViews.deletedCount || 0,
    },
  };
};

export const deleteBillingPeriodData = async ({ billingPeriodId, confirmation }) => {
  const billingPeriod = await BillingPeriod.findById(billingPeriodId);

  if (!billingPeriod) {
    throw new HttpError(404, "Billing period not found.");
  }

  if (!billingPeriod.isArchived || billingPeriod.isPublished) {
    throw new HttpError(
      409,
      "A billing period must be unpublished and archived before permanent deletion."
    );
  }

  if (String(confirmation || "").trim() !== billingPeriod.label) {
    throw new HttpError(400, "Enter the exact billing-period label to confirm deletion.");
  }

  const [lessonCount, liveClassCount, paymentCount, zoomCount, enrollmentCount] =
    await Promise.all([
      Lesson.countDocuments({ billingPeriod: billingPeriod._id }),
      LiveClass.countDocuments({ billingPeriod: billingPeriod._id }),
      PaymentSubmission.countDocuments({ billingPeriod: billingPeriod._id }),
      ZoomRegistration.countDocuments({ billingPeriod: billingPeriod._id }),
      Enrollment.countDocuments({ approvedBillingPeriods: billingPeriod._id }),
    ]);

  const dependencyCount =
    lessonCount + liveClassCount + paymentCount + zoomCount + enrollmentCount;

  if (dependencyCount > 0) {
    throw new HttpError(
      409,
      `This billing period still has related data (${lessonCount} lessons, ${liveClassCount} live classes, ${paymentCount} payments, ${zoomCount} Zoom registrations and ${enrollmentCount} enrolments). Delete or retain those records first.`
    );
  }

  const notifications = await deleteRelatedNotifications({
    billingPeriodIds: [billingPeriod._id],
  });
  await BillingPeriod.deleteOne({ _id: billingPeriod._id });

  return {
    deletedBillingPeriod: {
      id: billingPeriod._id,
      label: billingPeriod.label,
    },
    counts: {
      notifications: notifications.deletedCount || 0,
    },
  };
};

export const deleteRejectedPaymentData = async ({ paymentId, confirmation }) => {
  const payment = await PaymentSubmission.findById(paymentId)
    .select("+driveFileId")
    .populate("student", "email")
    .populate("course", "code");

  if (!payment) {
    throw new HttpError(404, "Payment submission not found.");
  }

  if (payment.status !== "rejected") {
    throw new HttpError(
      409,
      "Only rejected payment submissions can be permanently deleted individually."
    );
  }

  if (String(confirmation || "").trim().toUpperCase() !== "DELETE") {
    throw new HttpError(400, "Enter DELETE to confirm rejected-payment deletion.");
  }

  const storageWarnings = await deleteExternalFiles([payment.driveFileId]);
  const notifications = await deleteRelatedNotifications({
    paymentIds: [payment._id],
  });
  await PaymentSubmission.deleteOne({ _id: payment._id });

  return {
    deletedPayment: {
      id: payment._id,
      studentEmail: payment.student?.email || "",
      courseCode: payment.course?.code || "",
    },
    counts: {
      notifications: notifications.deletedCount || 0,
    },
    storageWarnings,
  };
};

export const deleteAdministratorData = async ({
  administratorId,
  actingAdministratorId,
  confirmation,
}) => {
  const administrator = await User.findById(administratorId);

  if (!administrator || administrator.role !== "admin") {
    throw new HttpError(404, "Administrator account not found.");
  }

  if (administrator._id.toString() === actingAdministratorId.toString()) {
    throw new HttpError(409, "You cannot permanently delete your own administrator account.");
  }

  if (administrator.isActive) {
    throw new HttpError(409, "Disable the administrator account before permanent deletion.");
  }

  if (
    String(confirmation || "").trim().toLowerCase() !==
    administrator.email.toLowerCase()
  ) {
    throw new HttpError(
      400,
      "Enter the administrator's exact email address to confirm deletion."
    );
  }

  const activeAdminCount = await User.countDocuments({
    role: "admin",
    isActive: true,
  });

  if (activeAdminCount < 1) {
    throw new HttpError(409, "At least one active administrator must remain.");
  }

  const replacement = actingAdministratorId;

  await Promise.all([
    Course.updateMany({ createdBy: administrator._id }, { $set: { createdBy: replacement } }),
    Course.updateMany({ updatedBy: administrator._id }, { $set: { updatedBy: replacement } }),
    BillingPeriod.updateMany(
      { createdBy: administrator._id },
      { $set: { createdBy: replacement } }
    ),
    BillingPeriod.updateMany(
      { updatedBy: administrator._id },
      { $set: { updatedBy: replacement } }
    ),
    Lesson.updateMany({ createdBy: administrator._id }, { $set: { createdBy: replacement } }),
    Lesson.updateMany({ updatedBy: administrator._id }, { $set: { updatedBy: replacement } }),
    LiveClass.updateMany(
      { createdBy: administrator._id },
      { $set: { createdBy: replacement } }
    ),
    LiveClass.updateMany(
      { updatedBy: administrator._id },
      { $set: { updatedBy: replacement } }
    ),
    Enrollment.updateMany(
      { managedBy: administrator._id },
      { $set: { managedBy: replacement } }
    ),
    PaymentSubmission.updateMany(
      { reviewedBy: administrator._id },
      { $set: { reviewedBy: replacement } }
    ),
    User.updateMany(
      { nicVerifiedBy: administrator._id },
      { $set: { nicVerifiedBy: replacement } }
    ),
    PlatformSetting.updateMany(
      { updatedBy: administrator._id },
      { $set: { updatedBy: replacement } }
    ),
    LessonView.updateMany(
      { lastModifiedByAdmin: administrator._id },
      { $set: { lastModifiedByAdmin: replacement } }
    ),
    AuditLog.updateMany({ actor: administrator._id }, { $set: { actor: null } }),
    AuditLog.updateMany({ targetUser: administrator._id }, { $set: { targetUser: null } }),
  ]);

  const notifications = await Notification.deleteMany({
    recipient: administrator._id,
  });
  await User.deleteOne({ _id: administrator._id });

  return {
    deletedAdministrator: {
      id: administrator._id,
      email: administrator.email,
    },
    counts: {
      notifications: notifications.deletedCount || 0,
    },
  };
};
