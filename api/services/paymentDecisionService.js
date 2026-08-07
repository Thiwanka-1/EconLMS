import mongoose from "mongoose";

import Enrollment from "../models/Enrollment.js";
import PaymentSubmission from "../models/PaymentSubmission.js";
import HttpError from "../utils/HttpError.js";

export const approvePaymentAtomically = async ({
  paymentId,
  administratorId,
  reviewNote = "",
}) => {
  const session = await mongoose.startSession();
  let result = null;

  try {
    await session.withTransaction(async () => {
      const payment = await PaymentSubmission.findById(paymentId).session(session);

      if (!payment) {
        throw new HttpError(404, "Payment submission not found.");
      }

      if (payment.status === "approved") {
        result = { payment, enrollment: null, alreadyApproved: true };
        return;
      }

      if (payment.status !== "pending") {
        throw new HttpError(409, "Only pending payments can be approved.");
      }

      const enrollment = await Enrollment.findById(payment.enrollment).session(session);

      if (!enrollment) {
        throw new HttpError(404, "Associated enrolment not found.");
      }

      const approvalDate = new Date();

      if (payment.paymentPlan === "monthly") {
        if (!payment.billingPeriod) {
          throw new HttpError(500, "Monthly payment has no billing period.");
        }

        enrollment.approvedBillingPeriods.addToSet(payment.billingPeriod);
      } else {
        enrollment.oneTimeAccessGrantedAt = approvalDate;
      }

      enrollment.status = "active";
      enrollment.lastPaymentApprovedAt = approvalDate;
      enrollment.statusReason = "";
      enrollment.managedBy = administratorId;

      payment.status = "approved";
      payment.reviewNote = reviewNote;
      payment.reviewedBy = administratorId;
      payment.reviewedAt = approvalDate;
      payment.approvedAt = approvalDate;
      payment.rejectedAt = null;

      await enrollment.save({ session });
      await payment.save({ session });

      result = { payment, enrollment, alreadyApproved: false };
    });
  } finally {
    await session.endSession();
  }

  return result;
};

export const rejectPaymentAtomically = async ({
  paymentId,
  administratorId,
  reviewNote,
}) => {
  const session = await mongoose.startSession();
  let result = null;

  try {
    await session.withTransaction(async () => {
      const payment = await PaymentSubmission.findById(paymentId).session(session);

      if (!payment) {
        throw new HttpError(404, "Payment submission not found.");
      }

      if (payment.status === "rejected") {
        result = { payment, alreadyRejected: true };
        return;
      }

      if (payment.status !== "pending") {
        throw new HttpError(409, "Only pending payments can be rejected.");
      }

      const rejectedAt = new Date();
      payment.status = "rejected";
      payment.reviewNote = reviewNote;
      payment.reviewedBy = administratorId;
      payment.reviewedAt = rejectedAt;
      payment.rejectedAt = rejectedAt;
      payment.approvedAt = null;

      await payment.save({ session });
      result = { payment, alreadyRejected: false };
    });
  } finally {
    await session.endSession();
  }

  return result;
};
