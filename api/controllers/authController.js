import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  clearAuthCookie,
  generateAuthToken,
  setAuthCookie,
} from "../utils/token.js";

import {
  compareOtp,
  createOtpExpiryDate,
  generateOtp,
} from "../utils/otp.js";

import {
  sendPasswordResetOtpEmail,
  sendVerificationOtpEmail,
} from "../utils/authEmails.js";

const requiredStudentFields = [
  "firstName",
  "lastName",
  "email",
  "password",
  "confirmPassword",
  "school",
  "mobileNumber",
  "nicNumber",
  "city",
  "address",
  "zoomEmail",
];

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const validateNewPassword = ({
  password,
  confirmPassword,
}) => {
  if (!password || !confirmPassword) {
    throw new HttpError(
      400,
      "Password and confirm password are required."
    );
  }

  if (password !== confirmPassword) {
    throw new HttpError(
      400,
      "Password and confirm password do not match."
    );
  }

  if (password.length < 8) {
    throw new HttpError(
      400,
      "Password must contain at least 8 characters."
    );
  }
};

const checkOtpCooldown = (sentAt) => {
  if (!sentAt) {
    return;
  }

  const cooldownSeconds = Number(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || 60
  );

  const elapsedMilliseconds =
    Date.now() - new Date(sentAt).getTime();

  const cooldownMilliseconds =
    cooldownSeconds * 1000;

  if (elapsedMilliseconds < cooldownMilliseconds) {
    const remainingSeconds = Math.ceil(
      (cooldownMilliseconds -
        elapsedMilliseconds) /
        1000
    );

    throw new HttpError(
      429,
      `Please wait ${remainingSeconds} seconds before requesting another code.`
    );
  }
};

const createEmailVerificationOtp = async (
  user
) => {
  const { otp, otpHash } = generateOtp();

  user.emailVerificationOtpHash = otpHash;
  user.emailVerificationOtpExpiresAt =
    createOtpExpiryDate();
  user.emailVerificationOtpSentAt =
    new Date();

  await user.save();

  try {
    await sendVerificationOtpEmail({
      email: user.email,
      otp,
    });
  } catch (error) {
    console.error(
      "Verification email failed:",
      error.message
    );

    throw new HttpError(
      502,
      "Account created, but the verification email could not be sent. Please request another verification code."
    );
  }
};

const createPasswordResetOtp = async (
  user
) => {
  const { otp, otpHash } = generateOtp();

  user.passwordResetOtpHash = otpHash;
  user.passwordResetOtpExpiresAt =
    createOtpExpiryDate();
  user.passwordResetOtpSentAt = new Date();

  await user.save();

  await sendPasswordResetOtpEmail({
    email: user.email,
    otp,
  });
};

export const signup = asyncHandler(
  async (req, res) => {
    const missingFields =
      requiredStudentFields.filter((field) => {
        const value = req.body[field];

        return (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        );
      });

    if (missingFields.length > 0) {
      throw new HttpError(
        400,
        `Missing required fields: ${missingFields.join(
          ", "
        )}`
      );
    }

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      school,
      mobileNumber,
      nicNumber,
      city,
      address,
      zoomEmail,
    } = req.body;

    validateNewPassword({
      password,
      confirmPassword,
    });

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedNic = String(nicNumber)
      .trim()
      .toUpperCase();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { nicNumber: normalizedNic },
      ],
    });

    if (existingUser) {
      throw new HttpError(
        409,
        "A user with this email address or NIC number already exists."
      );
    }

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      school,
      mobileNumber,
      nicNumber: normalizedNic,
      city,
      address,
      zoomEmail: normalizeEmail(zoomEmail),
      role: "student",
      isEmailVerified: false,
    });

    await createEmailVerificationOtp(user);

    res.status(201).json({
      success: true,
      authenticated: false,
      message:
        "Account created. Please check your email for the verification code.",
      user,
    });
  }
);

export const verifyEmail = asyncHandler(
  async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new HttpError(
        400,
        "Email and verification code are required."
      );
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select(
      "+emailVerificationOtpHash +emailVerificationOtpExpiresAt"
    );

    if (!user) {
      throw new HttpError(
        400,
        "Invalid or expired verification code."
      );
    }

    if (user.isEmailVerified) {
      throw new HttpError(
        400,
        "This email address is already verified. Please log in."
      );
    }

    const otpExpired =
      !user.emailVerificationOtpExpiresAt ||
      user.emailVerificationOtpExpiresAt <
        new Date();

    const otpMatches = compareOtp(
      otp,
      user.emailVerificationOtpHash
    );

    if (otpExpired || !otpMatches) {
      throw new HttpError(
        400,
        "Invalid or expired verification code."
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    user.emailVerificationOtpSentAt = null;
    user.lastLoginAt = new Date();

    await user.save();

    const token = generateAuthToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      authenticated: true,
      message:
        "Email verified successfully.",
      user,
    });
  }
);

export const resendVerificationOtp =
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new HttpError(
        400,
        "Email is required."
      );
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select(
      "+emailVerificationOtpSentAt"
    );

    /*
     * Generic response prevents exposing whether
     * an account exists.
     */
    if (
      !user ||
      user.isEmailVerified ||
      !user.isActive
    ) {
      return res.status(200).json({
        success: true,
        message:
          "If an unverified account exists, a new verification code will be sent.",
      });
    }

    checkOtpCooldown(
      user.emailVerificationOtpSentAt
    );

    await createEmailVerificationOtp(user);

    res.status(200).json({
      success: true,
      message:
        "A new verification code has been sent.",
    });
  });

export const login = asyncHandler(
  async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new HttpError(
        400,
        "Email and password are required."
      );
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select("+password");

    const passwordIsCorrect =
      user &&
      (await user.comparePassword(
        String(password)
      ));

    if (!user || !passwordIsCorrect) {
      throw new HttpError(
        401,
        "Invalid email or password."
      );
    }

    if (!user.isActive) {
      throw new HttpError(
        403,
        "Your account has been disabled."
      );
    }

    if (!user.isEmailVerified) {
      throw new HttpError(
        403,
        "Please verify your email before logging in."
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateAuthToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      user,
    });
  }
);

export const logout = asyncHandler(
  async (req, res) => {
    clearAuthCookie(res);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new HttpError(
        400,
        "Email is required."
      );
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select("+passwordResetOtpSentAt");

    if (
      user &&
      user.isActive &&
      user.isEmailVerified
    ) {
      checkOtpCooldown(
        user.passwordResetOtpSentAt
      );

      try {
        await createPasswordResetOtp(user);
      } catch (error) {
        console.error(
          "Password reset email failed:",
          error.message
        );
      }
    }

    res.status(200).json({
      success: true,
      message:
        "If an active account exists, a password reset code will be sent.",
    });
  }
);

export const resetPassword = asyncHandler(
  async (req, res) => {
    const {
      email,
      otp,
      password,
      confirmPassword,
    } = req.body;

    if (!email || !otp) {
      throw new HttpError(
        400,
        "Email and password reset code are required."
      );
    }

    validateNewPassword({
      password,
      confirmPassword,
    });

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select(
      "+passwordResetOtpHash +passwordResetOtpExpiresAt"
    );

    if (!user || !user.isActive) {
      throw new HttpError(
        400,
        "Invalid or expired password reset code."
      );
    }

    const otpExpired =
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt <
        new Date();

    const otpMatches = compareOtp(
      otp,
      user.passwordResetOtpHash
    );

    if (otpExpired || !otpMatches) {
      throw new HttpError(
        400,
        "Invalid or expired password reset code."
      );
    }

    user.password = password;
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpSentAt = null;
    user.passwordChangedAt = new Date();
    user.authVersion =
      Number(user.authVersion || 0) + 1;

    await user.save();

    clearAuthCookie(res);

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please log in using your new password.",
    });
  }
);

export const changePassword = asyncHandler(
  async (req, res) => {
    const {
      currentPassword,
      password,
      confirmPassword,
    } = req.body;

    if (!currentPassword) {
      throw new HttpError(
        400,
        "Current password is required."
      );
    }

    validateNewPassword({
      password,
      confirmPassword,
    });

    if (currentPassword === password) {
      throw new HttpError(
        400,
        "The new password must be different from the current password."
      );
    }

    const user = await User.findById(
      req.user._id
    ).select("+password");

    if (!user) {
      throw new HttpError(
        404,
        "User not found."
      );
    }

    const passwordIsCorrect =
      await user.comparePassword(
        currentPassword
      );

    if (!passwordIsCorrect) {
      throw new HttpError(
        401,
        "Current password is incorrect."
      );
    }

    user.password = password;
    user.passwordChangedAt = new Date();
    user.authVersion =
      Number(user.authVersion || 0) + 1;

    await user.save();

    /*
     * Previous sessions become invalid, but the
     * current session receives a fresh cookie.
     */
    const token = generateAuthToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully.",
    });
  }
);

export const getCurrentUser = asyncHandler(
  async (req, res) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  }
);