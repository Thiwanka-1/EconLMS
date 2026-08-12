import express from "express";
import {
  createAdminUser,
  getAllUsers,
  getUserById,
  setUserStatus,
  updateUser,
} from "../controllers/userController.js";
import {
  deleteAdministratorPermanently,
  deleteStudentPermanently,
} from "../controllers/cleanupController.js";
import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";

const router = express.Router();

router.use(protect);

router.get("/", authorize("admin"), getAllUsers);

router.post(
  "/admin",
  authorize("admin"),
  createAdminUser
);

router.delete(
  "/admin/:id",
  validateObjectId,
  authorize("admin"),
  deleteAdministratorPermanently
);

router.get("/:id", validateObjectId, getUserById);
router.patch("/:id", validateObjectId, updateUser);

router.patch(
  "/:id/status",
  validateObjectId,
  authorize("admin"),
  setUserStatus
);

router.delete(
  "/:id",
  validateObjectId,
  authorize("admin"),
  deleteStudentPermanently
);

export default router;
