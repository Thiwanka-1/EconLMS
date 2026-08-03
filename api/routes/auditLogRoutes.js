import express from "express";

import {
  getAuditLogById,
  getAuditLogs,
} from "../controllers/auditLogController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

import {
  validateObjectIdParam,
} from "../middlewares/validateObjectId.js";

const router = express.Router();

router.use(
  protect,
  authorize("admin")
);

router.get(
  "/",
  getAuditLogs
);

router.get(
  "/:id",
  validateObjectIdParam("id"),
  getAuditLogById
);

export default router;