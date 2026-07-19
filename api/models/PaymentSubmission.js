import mongoose from "mongoose";

const paymentSubmissionSchema =
  new mongoose.Schema(
    {
      student: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      course: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },

      enrollment: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Enrollment",
        required: true,
      },

      billingPeriod: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "BillingPeriod",
        default: null,
      },

      paymentPlan: {
        type: String,
        enum: ["monthly", "one_time"],
        required: true,
      },

      expectedAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      currency: {
        type: String,
        required: true,
        default: "LKR",
        uppercase: true,
      },

      attemptNumber: {
        type: Number,
        required: true,
        min: 1,
      },

      driveFileId: {
        type: String,
        required: true,
        select: false,
      },

      driveParentFolderId: {
        type: String,
        required: true,
        select: false,
      },

      storedFileName: {
        type: String,
        required: true,
      },

      originalFileName: {
        type: String,
        required: true,
      },

      mimeType: {
        type: String,
        required: true,
      },

      sizeBytes: {
        type: Number,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
        ],
        default: "pending",
      },

      reviewNote: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      rejectedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,

      toJSON: {
        transform: (_, object) => {
          delete object.__v;
          delete object.driveFileId;
          delete object.driveParentFolderId;

          return object;
        },
      },
    }
  );

/*
 * Prevents two pending submissions for the same
 * student, course and payment period.
 *
 * For one-time payments, billingPeriod is null.
 */
paymentSubmissionSchema.index(
  {
    student: 1,
    course: 1,
    billingPeriod: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
    name: "one_pending_submission_per_target",
  }
);

paymentSubmissionSchema.index({
  status: 1,
  createdAt: -1,
});

paymentSubmissionSchema.index({
  student: 1,
  course: 1,
  createdAt: -1,
});

const PaymentSubmission =
  mongoose.model(
    "PaymentSubmission",
    paymentSubmissionSchema
  );

export default PaymentSubmission;