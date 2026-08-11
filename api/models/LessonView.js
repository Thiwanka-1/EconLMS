import mongoose from "mongoose";

const activeSessionSchema =
  new mongoose.Schema(
    {
      sessionId: {
        type: String,
        required: true,
      },

      startedAt: {
        type: Date,
        required: true,
      },

      lastHeartbeatAt: {
        type: Date,
        required: true,
      },

      watchedSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },

      currentPositionSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },

      rewindLockedUntilSeconds: {
        type: Number,
        default: null,
        min: 0,
      },

      durationSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },

      userAgent: {
        type: String,
        default: "",
      },

      ipAddress: {
        type: String,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

const playbackHistorySchema =
  new mongoose.Schema(
    {
      sessionId: {
        type: String,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "completed",
          "left",
          "timeout",
          "admin_reset",
        ],
        required: true,
      },

      startedAt: {
        type: Date,
        required: true,
      },

      endedAt: {
        type: Date,
        required: true,
      },

      lastHeartbeatAt: {
        type: Date,
        required: true,
      },

      watchedSeconds: {
        type: Number,
        default: 0,
      },

      currentPositionSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },

      rewindLockedUntilSeconds: {
        type: Number,
        default: null,
        min: 0,
      },

      durationSeconds: {
        type: Number,
        default: 0,
      },

      userAgent: {
        type: String,
        default: "",
      },

      ipAddress: {
        type: String,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

const lessonViewSchema =
  new mongoose.Schema(
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
        required: true,
      },

      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },

      viewsUsed: {
        type: Number,
        default: 0,
        min: 0,
      },

      /*
       * Extra viewing opportunities granted
       * by an administrator.
       */
      extraViews: {
        type: Number,
        default: 0,
        min: 0,
      },

      activeSession: {
        type: activeSessionSchema,
        default: null,
      },

      history: {
        type: [playbackHistorySchema],
        default: [],
      },

      lastModifiedByAdmin: {
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

lessonViewSchema.index(
  {
    student: 1,
    lesson: 1,
  },
  {
    unique: true,
  }
);

lessonViewSchema.index({
  course: 1,
  student: 1,
});

const LessonView = mongoose.model(
  "LessonView",
  lessonViewSchema
);

export default LessonView;
