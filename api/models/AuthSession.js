import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    authVersion: {
      type: Number,
      required: true,
      min: 0,
    },

    deviceName: {
      type: String,
      default: "Unknown device",
      trim: true,
      maxlength: 120,
    },

    browser: {
      type: String,
      default: "Unknown browser",
      trim: true,
      maxlength: 80,
    },

    operatingSystem: {
      type: String,
      default: "Unknown operating system",
      trim: true,
      maxlength: 80,
    },

    userAgent: {
      type: String,
      default: "",
      maxlength: 1000,
      select: false,
    },

    ipAddress: {
      type: String,
      default: "",
      maxlength: 100,
      select: false,
    },

    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revocationReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

authSessionSchema.index({
  user: 1,
  revokedAt: 1,
  expiresAt: -1,
});

authSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const AuthSession = mongoose.model("AuthSession", authSessionSchema);

export default AuthSession;
