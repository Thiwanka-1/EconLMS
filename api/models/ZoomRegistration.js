import mongoose from "mongoose";

const zoomRegistrationSchema =
  new mongoose.Schema(
    {
      liveClass: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "LiveClass",
        required: true,
      },

      course: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },

      billingPeriod: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "BillingPeriod",
        default: null,
      },

      student: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      zoomMeetingId: {
        type: String,
        required: true,
        select: false,
      },

      zoomEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      zoomRegistrantId: {
        type: String,
        default: null,
      },

      encryptedJoinUrl: {
        type: String,
        default: null,
        select: false,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "registered",
          "failed",
          "cancelled",
        ],
        default: "pending",
      },

      attempts: {
        type: Number,
        default: 0,
      },

      lastError: {
        type: String,
        default: "",
        maxlength: 1000,
      },

      registeredAt: {
        type: Date,
        default: null,
      },

      lastAttemptAt: {
        type: Date,
        default: null,
      },

      revocationRequired: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,

      toJSON: {
        transform: (_, object) => {
          delete object.__v;
          delete object.zoomMeetingId;
          delete object.encryptedJoinUrl;

          return object;
        },
      },
    }
  );

zoomRegistrationSchema.index(
  {
    liveClass: 1,
    student: 1,
  },
  {
    unique: true,
  }
);

zoomRegistrationSchema.index({
  student: 1,
  course: 1,
  status: 1,
});

zoomRegistrationSchema.index({
  revocationRequired: 1,
  updatedAt: 1,
});

const ZoomRegistration =
  mongoose.model(
    "ZoomRegistration",
    zoomRegistrationSchema
  );

export default ZoomRegistration;
