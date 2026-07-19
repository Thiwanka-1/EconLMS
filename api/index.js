import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import connectDB from "./utils/connectDB.js";
import HttpError from "./utils/HttpError.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import billingPeriodRoutes from "./routes/billingPeriodRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use(
  "/api/billing-periods",
  billingPeriodRoutes
);

app.use("/api/enrollments", enrollmentRoutes);

app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

let server;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(port, () => {
      console.log(`EconLLS API running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`);

  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  } else {
    await mongoose.connection.close();
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();