import User from "../models/User.js";
import ZoomRegistration from "../models/ZoomRegistration.js";
import { revokeZoomRegistrations } from "../services/zoomRegistrationService.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  recordAuditLog,
} from "../utils/auditLog.js";

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isSameUser = (requestUser, requestedUserId) => {
  return requestUser._id.toString() === requestedUserId;
};

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
];

const protectedUserFields = new Set([
  "password",
  "role",
  "isActive",
  "isEmailVerified",
  "authVersion",
  "emailVerificationOtpHash",
  "emailVerificationOtpExpiresAt",
  "emailVerificationOtpSentAt",
  "passwordResetOtpHash",
  "passwordResetOtpExpiresAt",
  "passwordResetOtpSentAt",
  "passwordResetOtpAttempts",
]);

const normalizeEmail = (value) => {
  return String(value || "").trim().toLowerCase();
};

const normalizeNicNumber = (value) => {
  return String(value || "").trim().toUpperCase();
};

export const createAdminUser = asyncHandler(async (req, res) => {
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const confirmPassword = req.body?.confirmPassword;

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    throw new HttpError(
      400,
      "First name, last name, email, password and confirmation are required."
    );
  }

  if (password !== confirmPassword) {
    throw new HttpError(400, "Password and confirmation do not match.");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Password must contain at least 8 characters.");
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(400, "Password must not exceed 72 bytes.");
  }

  if (await User.exists({ email })) {
    throw new HttpError(409, "An account with this email address already exists.");
  }

  const administrator = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: "admin",
    isActive: true,
    isEmailVerified: true,
  });

  await recordAuditLog({
    req,
    action: "ADMIN_CREATED",
    entityType: "User",
    entityId: administrator._id,
    targetUserId: administrator._id,
    description: `Administrator account created for ${email}.`,
    metadata: {
      createdAdminEmail: email,
    },
  });

  res.status(201).json({
    success: true,
    message: "Administrator account created successfully.",
    user: administrator,
  });
});

const ensureAnotherActiveAdminExists = async (user) => {
  if (user.role !== "admin" || !user.isActive) {
    return;
  }

  const activeAdminCount = await User.countDocuments({
    role: "admin",
    isActive: true,
  });

  if (activeAdminCount <= 1) {
    throw new HttpError(
      409,
      "The final active administrator account cannot be disabled."
    );
  }
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
    throw new HttpError(
      403,
      "You cannot view another student's information."
    );
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
  const body = req.body || {};

  if (!requestingOwnAccount && !isAdmin) {
    throw new HttpError(
      403,
      "You cannot update another student's account."
    );
  }

  const protectedField = Object.keys(body).find((field) =>
    protectedUserFields.has(field)
  );

  if (protectedField) {
    throw new HttpError(
      400,
      `${protectedField} cannot be changed through this endpoint.`
    );
  }

  if (!isAdmin && (body.email !== undefined || body.nicNumber !== undefined)) {
    throw new HttpError(
      403,
      "Students cannot change their email address or NIC number through this endpoint."
    );
  }

  const user = await User.findById(req.params.id).select("+nicImageFileId");

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  const originalEmail = normalizeEmail(user.email);
  const originalNicNumber = normalizeNicNumber(user.nicNumber);
  const originalZoomEmail = normalizeEmail(user.zoomEmail);

  const requestedEmail =
    body.email !== undefined
      ? normalizeEmail(body.email)
      : originalEmail;

  const requestedNicNumber =
    body.nicNumber !== undefined
      ? normalizeNicNumber(body.nicNumber)
      : originalNicNumber;

  const requestedZoomEmail =
    body.zoomEmail !== undefined
      ? normalizeEmail(body.zoomEmail)
      : originalZoomEmail;

  const emailChanged = requestedEmail !== originalEmail;
  const nicNumberChanged =
    requestedNicNumber !== originalNicNumber;
  const zoomEmailChanged =
    requestedZoomEmail !== originalZoomEmail;

  if (
    requestingOwnAccount &&
    user.role === "admin" &&
    emailChanged
  ) {
    throw new HttpError(
      400,
      "An administrator cannot change their own email address through this endpoint."
    );
  }

  if (zoomEmailChanged) {
    const hasRegisteredZoomClass =
      await ZoomRegistration.exists({
        student: user._id,
        status: "registered",
      });

    if (hasRegisteredZoomClass) {
      throw new HttpError(
        409,
        "The Zoom email cannot be changed while registered live classes exist. Contact an administrator."
      );
    }
  }

  const allowedFields = isAdmin
    ? adminEditableFields
    : studentEditableFields;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      user[field] = body[field];
    }
  }

  if (body.email !== undefined && isAdmin) {
    user.email = requestedEmail;
  }

  if (body.nicNumber !== undefined && isAdmin) {
    user.nicNumber = requestedNicNumber;
  }

  if (body.zoomEmail !== undefined) {
    user.zoomEmail = requestedZoomEmail;
  }

  if (emailChanged) {
    user.isEmailVerified = false;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    user.emailVerificationOtpSentAt = null;
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpSentAt = null;
    user.passwordResetOtpAttempts = 0;
    user.authVersion += 1;
  }

  if (nicNumberChanged) {
    user.nicVerificationStatus = user.nicImageFileId
      ? "pending"
      : "not_uploaded";

    user.nicVerificationNote = "";
    user.nicVerifiedBy = null;
    user.nicVerifiedAt = null;
    user.nicReviewedAt = null;
  }

  await user.save();

  if (zoomEmailChanged) {
    try {
      await ZoomRegistration.updateMany(
        {
          student: user._id,
          status: {
            $in: ["pending", "failed"],
          },
        },
        {
          $set: {
            zoomEmail: user.zoomEmail,
            lastError: "",
            attempts: 0,
            lastAttemptAt: null,
          },
        }
      );
    } catch (error) {
      console.error(
        "Failed to synchronize pending Zoom registration emails:",
        error.message
      );
    }
  }

  res.status(200).json({
    success: true,
    message: "User updated successfully.",
    user,
  });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new HttpError(
      400,
      "isActive must be either true or false."
    );
  }

  if (
    isSameUser(req.user, req.params.id) &&
    isActive === false
  ) {
    throw new HttpError(
      400,
      "You cannot disable your own administrator account."
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  if (!isActive) {
    await ensureAnotherActiveAdminExists(user);
  }

  let zoomRevocation = null;

  if (user.isActive !== isActive) {
    if (!isActive && user.role === "student") {
      zoomRevocation = await revokeZoomRegistrations({
        studentId: user._id,
      });
    }

    user.isActive = isActive;

    /*
     * Revokes every existing cookie for this user.
     * Old tokens remain invalid even if the account
     * is enabled again later.
     */
    user.authVersion += 1;

    await user.save();
  }

  res.status(200).json({
    success: true,
    message: isActive
      ? "User account enabled successfully."
      : zoomRevocation?.failureCount > 0
        ? `User account disabled. ${zoomRevocation.failureCount} Zoom revocation(s) are queued for automatic retry.`
        : "User account disabled successfully.",
    user,
    zoomRevocation,
  });
});
