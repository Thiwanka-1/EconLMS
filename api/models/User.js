import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isStudent = function () {
  return this.role === "student";
};

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailPattern, "Please provide a valid email address."],
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    school: {
      type: String,
      required: isStudent,
      trim: true,
      maxlength: 150,
    },

    mobileNumber: {
      type: String,
      required: isStudent,
      trim: true,
      maxlength: 20,
    },

    nicNumber: {
      type: String,
      required: isStudent,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },

    city: {
      type: String,
      required: isStudent,
      trim: true,
      maxlength: 100,
    },

    address: {
      type: String,
      required: isStudent,
      trim: true,
      maxlength: 300,
    },

    zoomEmail: {
      type: String,
      required: isStudent,
      lowercase: true,
      trim: true,
      match: [emailPattern, "Please provide a valid Zoom email address."],
    },

    nicImageFileId: {
      type: String,
      default: null,
      select: false,
    },

    nicImageOriginalName: {
      type: String,
      default: null,
      trim: true,
    },

    nicImageStoredName: {
      type: String,
      default: null,
      trim: true,
    },

    nicImageMimeType: {
      type: String,
      default: null,
      trim: true,
    },

    nicImageSizeBytes: {
      type: Number,
      default: null,
      min: 0,
    },

    nicImageUploadedAt: {
      type: Date,
      default: null,
    },

    nicVerificationStatus: {
      type: String,
      enum: [
        "not_uploaded",
        "pending",
        "verified",
        "rejected",
      ],
      default: "not_uploaded",
    },

    nicVerificationNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    nicVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    nicVerifiedAt: {
      type: Date,
      default: null,
    },

    nicReviewedAt: {
      type: Date,
      default: null,
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
    emailVerificationOtpHash: {
      type: String,
      select: false,
      default: null,
    },

emailVerificationOtpExpiresAt: {
  type: Date,
  select: false,
  default: null,
},

emailVerificationOtpSentAt: {
  type: Date,
  select: false,
  default: null,
},

passwordResetOtpHash: {
  type: String,
  select: false,
  default: null,
},

passwordResetOtpExpiresAt: {
  type: Date,
  select: false,
  default: null,
},

passwordResetOtpSentAt: {
  type: Date,
  select: false,
  default: null,
},

passwordChangedAt: {
  type: Date,
  default: null,
},

authVersion: {
  type: Number,
  default: 0,
},
  },
  {
    timestamps: true,

    toJSON: {
      transform: (_, returnedObject) => {
        delete returnedObject.password;
        delete returnedObject.__v;
        delete returnedObject.authVersion;
        delete returnedObject.nicImageFileId;
        delete returnedObject.nicImageStoredName;
        delete returnedObject.nicVerifiedBy;

        delete returnedObject.emailVerificationOtpHash;
        delete returnedObject.emailVerificationOtpExpiresAt;
        delete returnedObject.emailVerificationOtpSentAt;

        delete returnedObject.passwordResetOtpHash;
        delete returnedObject.passwordResetOtpExpiresAt;
        delete returnedObject.passwordResetOtpSentAt;

        return returnedObject;
      },
    },
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;