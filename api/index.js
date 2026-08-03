import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import connectDB from "./utils/connectDB.js";
import asyncHandler from "./utils/asyncHandler.js";

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

import {
  corsOptions,
  getTrustProxySetting,
  globalApiRateLimiter,
  rejectDangerousInput,
  requestIdMiddleware,
  verifyRequestOrigin,
} from "./middlewares/securityMiddleware.js";

import {
  errorHandler,
  notFound,
} from "./middlewares/errorMiddleware.js";

import {
  validateEnvironment,
} from "./utils/validateEnvironment.js";

/*
 * Routes
 */
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import billingPeriodRoutes from "./routes/billingPeriodRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import playbackRoutes from "./routes/playbackRoutes.js";
import liveClassRoutes from "./routes/liveClassRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import platformSettingRoutes from "./routes/platformSettingRoutes.js";

/*
 * Validate required environment variables
 * before connecting to external services.
 */
validateEnvironment();

const app = express();

const port = Number(
  process.env.PORT || 5000
);

/*
 * Oracle production will normally use
 * Nginx as one reverse proxy.
 */
app.set(
  "trust proxy",
  getTrustProxySetting()
);

/*
 * Prevent nested query objects such as:
 * ?email[$ne]=value
 */
app.set(
  "query parser",
  "simple"
);

app.disable("x-powered-by");

/*
 * Request ID should be created early so
 * security and error responses can include it.
 */
app.use(requestIdMiddleware);

const helmetOptions = {
  crossOriginResourcePolicy: {
    policy: "same-site",
  },
};

if (
  process.env.NODE_ENV !==
  "production"
) {
  /*
   * Avoid HSTS caching on localhost.
   */
  helmetOptions.strictTransportSecurity =
    false;
}

app.use(
  helmet(helmetOptions)
);

app.use(
  cors(corsOptions)
);

/*
 * Reject browser write requests from
 * origins not listed in CLIENT_ORIGINS.
 */
app.use(
  verifyRequestOrigin
);

/*
 * Apply one global API limiter.
 * Do not also add the old apiLimiter.
 */
app.use(
  "/api",
  globalApiRateLimiter
);

app.use(
  express.json({
    limit:
      process.env
        .REQUEST_BODY_LIMIT ||
      "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: false,

    limit:
      process.env
        .REQUEST_BODY_LIMIT ||
      "1mb",
  })
);

app.use(
  cookieParser()
);

/*
 * Must run after body and query parsing.
 */
app.use(
  rejectDangerousInput
);

if (
  process.env.NODE_ENV ===
  "development"
) {
  app.use(morgan("dev"));
}

/*
 * Health endpoint
 */
app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,

      message:
        "EconLLS API is running.",

      environment:
        process.env.NODE_ENV,

      timestamp:
        new Date().toISOString(),

      requestId: req.id,
    });
  }
);

/*
 * Protected manual billing fallback.
 *
 * This is safe to retain in production because
 * it requires an authenticated administrator,
 * and billing creation is idempotent.
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

/*
 * API routes
 */
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/courses",
  courseRoutes
);

app.use(
  "/api/billing-periods",
  billingPeriodRoutes
);

app.use(
  "/api/enrollments",
  enrollmentRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/lessons",
  lessonRoutes
);

app.use(
  "/api/playback",
  playbackRoutes
);

app.use(
  "/api/live-classes",
  liveClassRoutes
);

app.use(
  "/api/documents",
  documentRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/audit-logs",
  auditLogRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/settings",
  platformSettingRoutes
);

/*
 * These must be registered after all routes.
 */
app.use(notFound);
app.use(errorHandler);

let server = null;
let monthlyBillingJob = null;

const startServer = async () => {
  try {
    await connectDB();

    /*
     * Catch-up generation creates any missing
     * current billing periods after downtime.
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

    server = app.listen(
      port,
      () => {
        console.log(
          `EconLLS API running on port ${port}`
        );
      }
    );

    /*
     * These properties must be assigned only
     * after app.listen() returns the server.
     */
    server.requestTimeout = 120_000;
    server.headersTimeout = 65_000;
    server.keepAliveTimeout = 5_000;
    server.maxHeadersCount = 100;
  } catch (error) {
    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
};

let isShuttingDown = false;

const shutdown = async (
  signal
) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

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

  const closeDatabaseAndExit =
    async () => {
      try {
        await mongoose.connection.close();

        console.log(
          "MongoDB connection closed."
        );

        process.exit(0);
      } catch (error) {
        console.error(
          "MongoDB shutdown failed:",
          error.message
        );

        process.exit(1);
      }
    };

  if (!server) {
    await closeDatabaseAndExit();
    return;
  }

  server.close(async (error) => {
    if (error) {
      console.error(
        "HTTP server shutdown failed:",
        error.message
      );
    }

    await closeDatabaseAndExit();
  });

  /*
   * Force shutdown if an open connection prevents
   * server.close() from completing.
   */
  setTimeout(() => {
    console.error(
      "Forced shutdown after timeout."
    );

    process.exit(1);
  }, 10_000).unref();
};

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

startServer();