import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isSameUser = (requestUser, requestedUserId) => {
  return requestUser._id.toString() === requestedUserId;
};

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
    100
  );

  const filter = {};

  if (req.query.role && ["student", "admin"].includes(req.query.role)) {
    filter.role = req.query.role;
  }

  if (req.query.isActive === "true") {
    filter.isActive = true;
  }

  if (req.query.isActive === "false") {
    filter.isActive = false;
  }

  if (req.query.search?.trim()) {
    const searchExpression = new RegExp(
      escapeRegExp(req.query.search.trim()),
      "i"
    );

    filter.$or = [
      { firstName: searchExpression },
      { lastName: searchExpression },
      { email: searchExpression },
      { mobileNumber: searchExpression },
      { nicNumber: searchExpression },
      { school: searchExpression },
    ];
  }

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    users,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const requestingOwnAccount = isSameUser(req.user, req.params.id);
  const isAdmin = req.user.role === "admin";

  if (!requestingOwnAccount && !isAdmin) {
    throw new HttpError(403, "You cannot view another student's information.");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  res.status(200).json({
    success: true,
    user,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const requestingOwnAccount = isSameUser(req.user, req.params.id);
  const isAdmin = req.user.role === "admin";

  if (!requestingOwnAccount && !isAdmin) {
    throw new HttpError(403, "You cannot update another student's account.");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  const studentEditableFields = [
    "firstName",
    "lastName",
    "school",
    "mobileNumber",
    "city",
    "address",
    "zoomEmail",
  ];

  const adminEditableFields = [
    ...studentEditableFields,
    "email",
    "nicNumber",
    "role",
    "isActive",
    "isEmailVerified",
  ];

  const allowedFields = isAdmin
    ? adminEditableFields
    : studentEditableFields;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  }

  if (req.body.email !== undefined && isAdmin) {
    user.email = String(req.body.email).trim().toLowerCase();
  }

  if (req.body.nicNumber !== undefined && isAdmin) {
    user.nicNumber = String(req.body.nicNumber).trim().toUpperCase();
  }

  /*
   * Password changes are deliberately excluded.
   * They will use dedicated change-password and forgot-password endpoints.
   */
  await user.save();

  res.status(200).json({
    success: true,
    message: "User updated successfully.",
    user,
  });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new HttpError(400, "isActive must be either true or false.");
  }

  if (isSameUser(req.user, req.params.id) && isActive === false) {
    throw new HttpError(400, "You cannot disable your own administrator account.");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  user.isActive = isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: isActive
      ? "User account enabled successfully."
      : "User account disabled successfully.",
    user,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (isSameUser(req.user, req.params.id)) {
    throw new HttpError(400, "You cannot delete your own administrator account.");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully.",
  });
});