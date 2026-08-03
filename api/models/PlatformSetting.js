import mongoose from "mongoose";

const brandingSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: "EconLLS",
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    tagline: {
      type: String,
      default: "Economics Learning Portal",
      trim: true,
      maxlength: 200,
    },
  },
  {
    _id: false,
  }
);

const contactSchema = new mongoose.Schema(
  {
    supportEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 254,

      validate: {
        validator(value) {
          return (
            !value ||
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              value
            )
          );
        },
        message: "Invalid support email address.",
      },
    },

    supportPhone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },

    whatsappNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },
  },
  {
    _id: false,
  }
);

const registrationSchema =
  new mongoose.Schema(
    {
      isOpen: {
        type: Boolean,
        default: true,
      },

      closedMessage: {
        type: String,
        default:
          "Student registration is temporarily closed.",
        trim: true,
        maxlength: 500,
      },
    },
    {
      _id: false,
    }
  );

const maintenanceNoticeSchema =
  new mongoose.Schema(
    {
      enabled: {
        type: Boolean,
        default: false,
      },

      message: {
        type: String,
        default:
          "EconLLS is currently undergoing maintenance.",
        trim: true,
        maxlength: 500,
      },
    },
    {
      _id: false,
    }
  );

const paymentDetailsSchema =
  new mongoose.Schema(
    {
      bankName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150,
      },

      accountName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150,
      },

      accountNumber: {
        type: String,
        default: "",
        trim: true,
        maxlength: 100,
      },

      branchName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150,
      },

      instructions: {
        type: String,
        default:
          "Transfer the correct course fee and upload a clear payment slip.",
        trim: true,
        maxlength: 3000,
      },

      paymentReferenceNote: {
        type: String,
        default:
          "Include your name or student ID as the payment reference.",
        trim: true,
        maxlength: 500,
      },
    },
    {
      _id: false,
    }
  );

const learningSchema = new mongoose.Schema(
  {
    defaultLessonMaxViews: {
      type: Number,
      default: 2,
      min: 1,
      max: 100,
    },
  },
  {
    _id: false,
  }
);

const liveClassSettingsSchema =
  new mongoose.Schema(
    {
      defaultJoinBeforeMinutes: {
        type: Number,
        default: 30,
        min: 0,
        max: 1440,
      },

      defaultJoinAfterMinutes: {
        type: Number,
        default: 15,
        min: 0,
        max: 1440,
      },
    },
    {
      _id: false,
    }
  );

const platformSettingSchema =
  new mongoose.Schema(
    {
      /*
       * Only one settings document is allowed.
       */
      singletonKey: {
        type: String,
        default: "platform",
        unique: true,
        immutable: true,
      },

      branding: {
        type: brandingSchema,
        default: () => ({}),
      },

      contact: {
        type: contactSchema,
        default: () => ({}),
      },

      registration: {
        type: registrationSchema,
        default: () => ({}),
      },

      maintenanceNotice: {
        type: maintenanceNoticeSchema,
        default: () => ({}),
      },

      paymentDetails: {
        type: paymentDetailsSchema,
        default: () => ({}),
      },

      learning: {
        type: learningSchema,
        default: () => ({}),
      },

      liveClasses: {
        type: liveClassSettingsSchema,
        default: () => ({}),
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,

      toJSON: {
        transform: (_, object) => {
          delete object.__v;
          delete object.singletonKey;

          return object;
        },
      },
    }
  );

const PlatformSetting = mongoose.model(
  "PlatformSetting",
  platformSettingSchema
);

export default PlatformSetting;