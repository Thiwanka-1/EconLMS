import mongoose from "mongoose";

const enrollmentSchema =
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

      paymentPlan: {
        type: String,
        required: true,
        enum: ["monthly", "one_time"],
      },

      status: {
        type: String,
        enum: [
          "pending",
          "active",
          "suspended",
          "cancelled",
        ],
        default: "pending",
      },

      approvedBillingPeriods: [
        {
          type:
            mongoose.Schema.Types.ObjectId,
          ref: "BillingPeriod",
        },
      ],

      oneTimeAccessGrantedAt: {
        type: Date,
        default: null,
      },

      lastPaymentApprovedAt: {
        type: Date,
        default: null,
      },

      statusReason: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },

      managedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,

      toJSON: {
        transform: (_, object) => {
          delete object.__v;
          return object;
        },
      },
    }
  );

enrollmentSchema.index(
  {
    student: 1,
    course: 1,
  },
  {
    unique: true,
  }
);

enrollmentSchema.index({
  course: 1,
  status: 1,
});

const Enrollment = mongoose.model(
  "Enrollment",
  enrollmentSchema
);

export default Enrollment;