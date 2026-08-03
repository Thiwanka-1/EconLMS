import mongoose from "mongoose";

const requestDetailsSchema =
  new mongoose.Schema(
    {
      method: {
        type: String,
        default: "",
      },

      path: {
        type: String,
        default: "",
      },

      ipAddress: {
        type: String,
        default: "",
      },

      userAgent: {
        type: String,
        default: "",
        maxlength: 1000,
      },

      requestId: {
        type: String,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

const auditLogSchema =
  new mongoose.Schema(
    {
      actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      /*
       * Snapshots remain available even if the
       * administrator account is later changed.
       */
      actorEmail: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
      },

      actorRole: {
        type: String,
        default: "",
        trim: true,
      },

      action: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 150,
      },

      entityType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },

      targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({}),
      },

      request: {
        type: requestDetailsSchema,
        default: () => ({}),
      },

      outcome: {
        type: String,
        enum: ["success", "failure"],
        default: "success",
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

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  actor: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

auditLogSchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  targetUser: 1,
  createdAt: -1,
});

const AuditLog = mongoose.model(
  "AuditLog",
  auditLogSchema
);

export default AuditLog;