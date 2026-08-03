import express from "express";

import {
  getAdminPlatformSettings,
  getPublicPlatformSettings,
  getStudentPlatformSettings,
  updatePlatformSettings,
} from "../controllers/platformSettingController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

/*
 * Public branding and registration status.
 */
router.get(
  "/public",
  getPublicPlatformSettings
);

router.use(protect);

/*
 * Bank details must not be public.
 */
router.get(
  "/student",
  authorize("student"),
  getStudentPlatformSettings
);

router.get(
  "/admin",
  authorize("admin"),
  getAdminPlatformSettings
);

router.patch(
  "/admin",
  authorize("admin"),
  updatePlatformSettings
);

export default router;