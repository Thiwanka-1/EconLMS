import mongoose from "mongoose";

const liveClassSchema =
  new mongoose.Schema(
    {
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

      billingPeriod: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "BillingPeriod",
        default: null,

        required() {
          return (
            this.paymentPlan === "monthly"
          );
        },
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: 3000,
      },

      zoomMeetingId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      zoomMeetingUuid: {
        type: String,
        default: null,
      },

      startTime: {
        type: Date,
        required: true,
      },

      durationMinutes: {
        type: Number,
        required: true,
        min: 1,
        max: 1440,
      },

      timezone: {
        type: String,
        default: "Asia/Colombo",
      },

      joinWindowMinutesBefore: {
        type: Number,
        default: 30,
        min: 0,
        max: 1440,
      },

      joinWindowMinutesAfter: {
        type: Number,
        default: 15,
        min: 0,
        max: 1440,
      },

      status: {
        type: String,
        enum: [
          "scheduled",
          "completed",
          "cancelled",
        ],
        default: "scheduled",
      },

      isPublished: {
        type: Boolean,
        default: true,
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
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

liveClassSchema.index({
  course: 1,
  billingPeriod: 1,
  startTime: 1,
});

liveClassSchema.index({
  isPublished: 1,
  status: 1,
  startTime: 1,
});

const LiveClass = mongoose.model(
  "LiveClass",
  liveClassSchema
);

export default LiveClass;