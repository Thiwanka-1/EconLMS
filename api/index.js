import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import connectDB from "./utils/connectDB.js";
import HttpError from "./utils/HttpError.js";

// Import scheduled jobs for automatic billing period generation
import {
  runBillingGenerationOnStartup,
  scheduleMonthlyBillingGeneration,
  shutdownScheduledJobs,
  triggerMonthlyBillingGenerationNow,
} from "./utils/scheduledJobs.js";

import {
  authorize,
  protect,
} from "./middlewares/authMiddleware.js";

import asyncHandler from "./utils/asyncHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import billingPeriodRoutes from "./routes/billingPeriodRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import playbackRoutes from "./routes/playbackRoutes.js";
import liveClassRoutes from "./routes/liveClassRoutes.js";

import verifyRequestOrigin from "./middlewares/originMiddleware.js";
import { apiLimiter } from "./middlewares/rateLimiters.js";
import {
  errorHandler,
  notFound,
} from "./middlewares/errorMiddleware.js";

const app = express();
const port = Number(process.env.PORT || 5000);

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/*
 * Oracle deployment will use Nginx as a reverse proxy.
 * Trust only the first proxy in production.
 */
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new HttpError(403, "This origin is not permitted by the API.")
      );
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use(verifyRequestOrigin);
app.use(apiLimiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EconLLS API is running.",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * TEST ENDPOINT: Trigger monthly billing period generation manually
 * This endpoint is useful for testing the billing generation logic without waiting for the scheduled time.
 * Only enable in development/staging environments for testing purposes.
 *
 * Usage: POST /api/admin/trigger-billing-generation
 * (In a real system, this should be protected with proper authentication/authorization)
 */
app.post(
  "/api/admin/trigger-billing-generation",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result =
      await triggerMonthlyBillingGenerationNow();

    res.status(200).json({
      success: result.success,
      message:
        "Billing-period generation completed.",
      data: result,
    });
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use(
  "/api/billing-periods",
  billingPeriodRoutes
);

app.use("/api/enrollments", enrollmentRoutes);

app.use("/api/payments", paymentRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/playback", playbackRoutes);
app.use("/api/live-classes", liveClassRoutes);

app.use(notFound);
app.use(errorHandler);

let server;
let monthlyBillingJob;

const startServer = async () => {
  try {
    await connectDB();

    /*
     * Catch-up execution:
     * If the server was offline at 00:01 on the
     * first day, this creates any missing period.
     *
     * Running it repeatedly is safe because the
     * database upsert prevents duplicates.
     */
    try {
      await runBillingGenerationOnStartup();
    } catch (error) {
      console.error(
        "[SCHEDULER] Startup billing generation failed:",
        error.message
      );
    }

    try {
      monthlyBillingJob =
        scheduleMonthlyBillingGeneration();
    } catch (error) {
      console.error(
        "[SCHEDULER] Scheduled job initialization failed:",
        error.message
      );
    }

    server = app.listen(port, () => {
      console.log(
        `EconLLS API running on port ${port}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(
    `${signal} received. Shutting down...`
  );

  try {
    await shutdownScheduledJobs();
  } catch (error) {
    console.error(
      "Scheduled-job shutdown failed:",
      error.message
    );
  }

  const closeDatabase = async () => {
    await mongoose.connection.close();
    process.exit(0);
  };

  if (server) {
    server.close(closeDatabase);
  } else {
    await closeDatabase();
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();