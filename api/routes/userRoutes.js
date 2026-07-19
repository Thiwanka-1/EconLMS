import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  setUserStatus,
  updateUser,
} from "../controllers/userController.js";
import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";

const router = express.Router();

router.use(protect);

router.get("/", authorize("admin"), getAllUsers);

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
  deleteUser
);

export default router;