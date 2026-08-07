import mongoose from "mongoose";

const emailDeliverySchema =
  new mongoose.Schema(
    {
      status: {
        type: String,
        enum: [
          "pending",
          "processing",
          "sent",
          "failed",
          "skipped",
        ],
        default: "pending",
      },

      provider: {
        type: String,
        default: "smtp",
      },

      providerMessageId: {
        type: String,
        default: null,
      },

      attemptedAt: {
        type: Date,
        default: null,
      },

      attempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      nextAttemptAt: {
        type: Date,
        default: null,
      },

      sentAt: {
        type: Date,
        default: null,
      },

      error: {
        type: String,
        default: "",
        maxlength: 1000,
      },
    },
    {
      _id: false,
    }
  );

const emailPayloadSchema = new mongoose.Schema(
  {
    subject: { type: String, default: "", maxlength: 500 },
    text: { type: String, default: "", maxlength: 20_000 },
    html: { type: String, default: "", maxlength: 50_000 },
  },
  { _id: false }
);

const notificationSchema =
  new mongoose.Schema(
    {
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      type: {
        type: String,
        enum: [
          "payment_approved",
          "payment_rejected",
          "payment_submitted",
          "nic_verified",
          "nic_rejected",
          "nic_submitted",
          "student_registered",
          "payment_reminder",
          "system",
        ],
        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },

      actionUrl: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },

      /*
       * Only store non-sensitive information here.
       * Never store passwords, OTPs, Drive file IDs,
       * Zoom join URLs or authentication tokens.
       */
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({}),
      },

      isRead: {
        type: Boolean,
        default: false,
      },

      readAt: {
        type: Date,
        default: null,
      },

      /*
       * Prevents duplicate notifications for the
       * same event.
       */
      deduplicationKey: {
        type: String,
        required: true,
        trim: true,
        maxlength: 256,
      },

      emailDelivery: {
        type: emailDeliverySchema,
        default: () => ({
          status: "pending",
          provider: "smtp",
        }),
      },

      emailPayload: {
        type: emailPayloadSchema,
        default: null,
        select: false,
      },
    },
    {
      timestamps: true,

      toJSON: {
        transform: (_, object) => {
          delete object.__v;

          if (object.emailDelivery) {
            delete object.emailDelivery.error;
          }

          delete object.emailPayload;

          return object;
        },
      },
    }
  );

notificationSchema.index(
  {
    deduplicationKey: 1,
  },
  {
    unique: true,
  }
);

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  "emailDelivery.status": 1,
  "emailDelivery.nextAttemptAt": 1,
  createdAt: 1,
});

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;
