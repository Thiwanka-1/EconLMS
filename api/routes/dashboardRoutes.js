import express from "express";

import {
  getAdminDashboard,
  getStudentDashboard,
} from "../controllers/dashboardController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/admin",
  authorize("admin"),
  getAdminDashboard
);

router.get(
  "/student",
  authorize("student"),
  getStudentDashboard
);

export default router;