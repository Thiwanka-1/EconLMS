import multer from "multer";
import HttpError from "../utils/HttpError.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const maxFileSizeMb = Number(
  process.env.PAYMENT_SLIP_MAX_MB || 5
);

const storage = multer.memoryStorage();

export const uploadPaymentSlip = multer({
  storage,

  limits: {
    files: 1,
    fileSize:
      maxFileSizeMb * 1024 * 1024,
  },

  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new HttpError(
          400,
          "Payment slip must be a JPG, PNG or PDF file."
        )
      );
    }

    callback(null, true);
  },
});