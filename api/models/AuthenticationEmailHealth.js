import mongoose from "mongoose";

const authenticationEmailHealthSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "authentication-email",
      unique: true,
      immutable: true,
    },

    consecutiveFailures: {
      type: Number,
      default: 0,
      min: 0,
    },

    firstFailureAt: {
      type: Date,
      default: null,
    },

    lastFailureAt: {
      type: Date,
      default: null,
    },

    lastSuccessAt: {
      type: Date,
      default: null,
    },

    lastAlertedAt: {
      type: Date,
      default: null,
    },

    lastPurpose: {
      type: String,
      enum: ["email_verification", "password_reset", "unknown"],
      default: "unknown",
    },

    lastError: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

const AuthenticationEmailHealth = mongoose.model(
  "AuthenticationEmailHealth",
  authenticationEmailHealthSchema
);

export default AuthenticationEmailHealth;
