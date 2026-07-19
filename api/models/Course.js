import mongoose from "mongoose";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const weeklyScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },

    startTime: {
      type: String,
      required: true,
      match: [timePattern, "Start time must use HH:mm format."],
    },

    endTime: {
      type: String,
      required: true,
      match: [timePattern, "End time must use HH:mm format."],
    },

    timezone: {
      type: String,
      default: "Asia/Colombo",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
  },
  {
    _id: true,
  }
);

weeklyScheduleSchema.pre("validate", function () {
  if (
    this.startTime &&
    this.endTime &&
    this.startTime >= this.endTime
  ) {
    this.invalidate(
      "endTime",
      "End time must be later than start time."
    );
  }
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      default: "Economics",
      maxlength: 100,
    },

    category: {
      type: String,
      required: true,
      enum: ["grade", "revision", "other"],
    },

    academicLevel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    paymentPlan: {
      type: String,
      required: true,
      enum: ["monthly", "one_time"],
    },

    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative."],
    },

    currency: {
      type: String,
      default: "LKR",
      uppercase: true,
      trim: true,
      maxlength: 10,
    },

    thumbnailUrl: {
      type: String,
      default: null,
      trim: true,
    },

    weeklySchedule: {
      type: [weeklyScheduleSchema],
      default: [],
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    isEnrollmentOpen: {
      type: Boolean,
      default: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      transform: (_, returnedObject) => {
        delete returnedObject.__v;
        return returnedObject;
      },
    },
  }
);

courseSchema.index({
  isPublished: 1,
  isArchived: 1,
  sortOrder: 1,
});

courseSchema.index({
  category: 1,
  academicLevel: 1,
});

const Course = mongoose.model("Course", courseSchema);

export default Course;