import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    /*
     * Required for monthly courses.
     * Null for one-time courses.
     */
    billingPeriod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingPeriod",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    /*
     * Kept hidden from normal queries.
     * Only selected for admin management or after
     * the student passes playback access checks.
     */
    youtubeVideoId: {
      type: String,
      required: true,
      trim: true,
      select: false,
      match: [
        /^[A-Za-z0-9_-]{11}$/,
        "Invalid YouTube video ID.",
      ],
    },

    lessonOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxViews: {
      type: Number,
      default: 2,
      min: 1,
      max: 100,
    },

    publishAt: {
      type: Date,
      default: null,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
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
      transform: (_, object) => {
        delete object.__v;
        return object;
      },
    },
  }
);

lessonSchema.index({
  course: 1,
  billingPeriod: 1,
  lessonOrder: 1,
});

lessonSchema.index({
  course: 1,
  isPublished: 1,
  isArchived: 1,
});

const Lesson = mongoose.model(
  "Lesson",
  lessonSchema
);

export default Lesson;