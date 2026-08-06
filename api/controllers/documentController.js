import User from "../models/User.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  deleteDriveFile,
  getDriveFileStream,
  uploadNicImageToDrive,
} from "../utils/googleDrive.js";

import {
  processNicDecisionSideEffects,
} from "../services/decisionNotificationService.js";

import {
  notifyAdminsOfNicSubmission,
} from "../services/adminNotificationService.js";

import {
  notifyStudentOfNicSubmission,
} from "../services/studentNotificationService.js";



const getStudentWithNicFile =
  async (studentId) => {
    const student =
      await User.findOne({
        _id: studentId,
        role: "student",
      }).select("+nicImageFileId");

    if (!student) {
      throw new HttpError(
        404,
        "Student not found."
      );
    }

    return student;
  };

const streamNicImage = async ({
  student,
  res,
}) => {
  if (!student.nicImageFileId) {
    throw new HttpError(
      404,
      "NIC image has not been uploaded."
    );
  }

  const { metadata, stream } =
    await getDriveFileStream(
      student.nicImageFileId
    );

  const safeFileName = String(
    metadata.name ||
      student.nicImageOriginalName ||
      "nic-image"
  ).replace(/["\r\n]/g, "_");

  res.setHeader(
    "Content-Type",
    metadata.mimeType ||
      student.nicImageMimeType ||
      "application/octet-stream"
  );

  res.setHeader(
    "Content-Disposition",
    `inline; filename="${safeFileName}"`
  );

  res.setHeader(
    "Cache-Control",
    "private, no-store, max-age=0"
  );

  res.setHeader(
    "Pragma",
    "no-cache"
  );

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  if (metadata.size) {
    res.setHeader(
      "Content-Length",
      metadata.size
    );
  }

  stream.on("error", (error) => {
    console.error(
      "NIC Drive stream failed:",
      error.message
    );

    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message:
          "NIC image could not be loaded.",
      });
    } else {
      res.destroy(error);
    }
  });

  stream.pipe(res);
};

export const uploadMyNicImage =
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(
        400,
        "NIC image is required."
      );
    }

    const student =
      await getStudentWithNicFile(
        req.user._id
      );

    const previousFileId =
      student.nicImageFileId;

    let uploadedFile = null;

    try {
      uploadedFile =
        await uploadNicImageToDrive({
          file: req.file,
          student,
        });

      student.nicImageFileId =
        uploadedFile.id;

      student.nicImageOriginalName =
        req.file.originalname;

      student.nicImageStoredName =
        uploadedFile.name;

      student.nicImageMimeType =
        uploadedFile.mimeType ||
        req.file.mimetype;

      student.nicImageSizeBytes =
        Number(
          uploadedFile.size ||
            req.file.size
        );

      student.nicImageUploadedAt =
        new Date();

      /*
       * A new image must be checked
       * again by the administrator.
       */
      student.nicVerificationStatus =
        "pending";

      student.nicVerificationNote = "";
      student.nicVerifiedBy = null;
      student.nicVerifiedAt = null;
      student.nicReviewedAt = null;

      await student.save();
    } catch (error) {
      /*
       * Database update failed after
       * uploading the new Drive file.
       */
      if (uploadedFile?.id) {
        try {
          await deleteDriveFile(
            uploadedFile.id
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "Failed to remove unused NIC file:",
            cleanupError.message
          );
        }
      }

      throw error;
    }

    /*
     * Delete the previous image only after
     * the new file and database record succeed.
     */
    if (
      previousFileId &&
      previousFileId !==
        uploadedFile.id
    ) {
      try {
        await deleteDriveFile(
          previousFileId
        );
      } catch (error) {
        console.error(
          "Failed to delete previous NIC image:",
          error.message
        );
      }
    }

    const notificationResults = await Promise.allSettled([
      notifyAdminsOfNicSubmission({ student }),
      notifyStudentOfNicSubmission({ student }),
    ]);

    for (const notificationResult of notificationResults) {
      if (notificationResult.status === "rejected") {
        // The uploaded NIC must remain valid even if an alert fails.
        console.error(
          "[NOTIFICATION] NIC submission alert failed:",
          notificationResult.reason?.message || notificationResult.reason,
        );
      }
    }

    res.status(200).json({
      success: true,

      message:
        "NIC image uploaded successfully. Administrator verification is pending.",

      nicDocument: {
        originalFileName:
          student.nicImageOriginalName,

        mimeType:
          student.nicImageMimeType,

        sizeBytes:
          student.nicImageSizeBytes,

        uploadedAt:
          student.nicImageUploadedAt,

        verificationStatus:
          student.nicVerificationStatus,

        verificationNote:
          student.nicVerificationNote,
      },
    });
  });

export const getMyNicStatus =
  asyncHandler(async (req, res) => {
    const student =
      await getStudentWithNicFile(
        req.user._id
      );

    res.status(200).json({
      success: true,

      nicDocument: {
        hasImage: Boolean(
          student.nicImageFileId
        ),

        originalFileName:
          student.nicImageOriginalName,

        mimeType:
          student.nicImageMimeType,

        sizeBytes:
          student.nicImageSizeBytes,

        uploadedAt:
          student.nicImageUploadedAt,

        verificationStatus:
          student.nicVerificationStatus,

        verificationNote:
          student.nicVerificationNote,

        verifiedAt:
          student.nicVerifiedAt,

        reviewedAt:
          student.nicReviewedAt,
      },
    });
  });

export const viewMyNicImage =
  asyncHandler(async (req, res) => {
    const student =
      await getStudentWithNicFile(
        req.user._id
      );

    await streamNicImage({
      student,
      res,
    });
  });

export const viewStudentNicImageAdmin =
  asyncHandler(async (req, res) => {
    const student =
      await getStudentWithNicFile(
        req.params.studentId
      );

    await streamNicImage({
      student,
      res,
    });
  });

export const getStudentNicStatusAdmin =
  asyncHandler(async (req, res) => {
    const student =
      await getStudentWithNicFile(
        req.params.studentId
      );

    res.status(200).json({
      success: true,

      student: {
        _id: student._id,
        firstName:
          student.firstName,
        lastName:
          student.lastName,
        email: student.email,
        mobileNumber:
          student.mobileNumber,
        nicNumber:
          student.nicNumber,
      },

      nicDocument: {
        hasImage: Boolean(
          student.nicImageFileId
        ),

        originalFileName:
          student.nicImageOriginalName,

        mimeType:
          student.nicImageMimeType,

        sizeBytes:
          student.nicImageSizeBytes,

        uploadedAt:
          student.nicImageUploadedAt,

        verificationStatus:
          student.nicVerificationStatus,

        verificationNote:
          student.nicVerificationNote,

        verifiedAt:
          student.nicVerifiedAt,

        reviewedAt:
          student.nicReviewedAt,
              },
    });
  });

export const updateNicVerificationStatus =
  asyncHandler(async (req, res) => {
    const status =
      typeof req.body.status === "string"
        ? req.body.status.trim()
        : "";

    const note =
      typeof req.body.note === "string"
        ? req.body.note.trim()
        : "";

    const expectedUploadedAt =
      typeof req.body.expectedUploadedAt === "string"
        ? req.body.expectedUploadedAt.trim()
        : "";

    const allowedStatuses = [
      "verified",
      "rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new HttpError(
        400,
        "Status must be verified or rejected."
      );
    }

    if (status === "rejected" && !note) {
      throw new HttpError(
        400,
        "A rejection reason is required."
      );
    }

    if (!expectedUploadedAt) {
      throw new HttpError(
        400,
        "expectedUploadedAt is required."
      );
    }

    const expectedUploadDate =
      new Date(expectedUploadedAt);

    if (
      Number.isNaN(
        expectedUploadDate.getTime()
      )
    ) {
      throw new HttpError(
        400,
        "expectedUploadedAt must be a valid date."
      );
    }

    const student =
      await getStudentWithNicFile(
        req.params.studentId
      );

    if (!student.nicImageFileId) {
      throw new HttpError(
        400,
        "The student has not uploaded a NIC image."
      );
    }

    const currentUploadTime =
      student.nicImageUploadedAt
        ? new Date(
            student.nicImageUploadedAt
          ).getTime()
        : null;

    if (
      currentUploadTime !==
      expectedUploadDate.getTime()
    ) {
      throw new HttpError(
        409,
        "The student uploaded a newer NIC image. Review the current image before making a decision."
      );
    }

    const reviewedAt = new Date();

    student.nicVerificationStatus =
      status;

    student.nicVerificationNote =
      status === "rejected"
        ? note
        : "";

    student.nicVerifiedBy =
      req.user._id;

    student.nicReviewedAt =
      reviewedAt;

    student.nicVerifiedAt =
      status === "verified"
        ? reviewedAt
        : null;

    await student.save();

    const notificationResult =
      await processNicDecisionSideEffects({
        req,
        student,
        decision: status,
        note:
          student.nicVerificationNote,
      });

    res.status(200).json({
      success: true,

      message:
        status === "verified"
          ? "NIC image verified successfully."
          : "NIC image rejected.",

      nicDocument: {
        verificationStatus:
          student.nicVerificationStatus,

        verificationNote:
          student.nicVerificationNote,

        verifiedAt:
          student.nicVerifiedAt,

        reviewedAt:
          student.nicReviewedAt,
      },

      notifications: {
        processed: Boolean(
          notificationResult?.success
        ),
      },
    });
  });
