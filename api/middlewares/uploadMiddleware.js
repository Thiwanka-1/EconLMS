import multer from "multer";
import HttpError from "../utils/HttpError.js";

const storage = multer.memoryStorage();

const createMemoryUploader = ({
  allowedMimeTypes,
  maxFileSizeMb,
  invalidTypeMessage,
}) => {
  return multer({
    storage,

    limits: {
      files: 1,
      fileSize:
        maxFileSizeMb * 1024 * 1024,
    },

    fileFilter(req, file, callback) {
      if (
        !allowedMimeTypes.has(
          file.mimetype
        )
      ) {
        return callback(
          new HttpError(
            400,
            invalidTypeMessage
          )
        );
      }

      callback(null, true);
    },
  });
};

export const uploadPaymentSlip =
  createMemoryUploader({
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ]),

    maxFileSizeMb: Number(
      process.env
        .PAYMENT_SLIP_MAX_MB || 5
    ),

    invalidTypeMessage:
      "Payment slip must be a JPG, PNG or PDF file.",
  });

export const uploadNicImage =
  createMemoryUploader({
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),

    maxFileSizeMb: Number(
      process.env.NIC_IMAGE_MAX_MB || 5
    ),

    invalidTypeMessage:
      "NIC image must be a JPG, PNG or WebP file.",
  });