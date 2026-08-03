import HttpError from "../utils/HttpError.js";

const startsWithBytes = (
  buffer,
  bytes
) => {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < bytes.length
  ) {
    return false;
  }

  return bytes.every(
    (byte, index) =>
      buffer[index] === byte
  );
};

const detectMimeType = (buffer) => {
  /*
   * JPEG: FF D8 FF
   */
  if (
    startsWithBytes(buffer, [
      0xff,
      0xd8,
      0xff,
    ])
  ) {
    return "image/jpeg";
  }

  /*
   * PNG signature
   */
  if (
    startsWithBytes(buffer, [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ])
  ) {
    return "image/png";
  }

  /*
   * WebP:
   * RIFF....WEBP
   */
  if (
    buffer?.length >= 12 &&
    buffer
      .subarray(0, 4)
      .toString("ascii") === "RIFF" &&
    buffer
      .subarray(8, 12)
      .toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  /*
   * PDF: %PDF-
   */
  if (
    buffer?.length >= 5 &&
    buffer
      .subarray(0, 5)
      .toString("ascii") === "%PDF-"
  ) {
    return "application/pdf";
  }

  return null;
};

const createSignatureValidator = ({
  allowedMimeTypes,
  message,
}) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    const detectedMimeType =
      detectMimeType(req.file.buffer);

    if (
      !detectedMimeType ||
      !allowedMimeTypes.has(
        detectedMimeType
      )
    ) {
      return next(
        new HttpError(
          400,
          message
        )
      );
    }

    if (
      req.file.mimetype !==
      detectedMimeType
    ) {
      return next(
        new HttpError(
          400,
          "The uploaded file content does not match its declared file type."
        )
      );
    }

    /*
     * Normalize the MIME type used by
     * Google Drive.
     */
    req.file.mimetype =
      detectedMimeType;

    next();
  };
};

export const validatePaymentSlipSignature =
  createSignatureValidator({
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ]),

    message:
      "Payment slip content must be a valid JPG, PNG or PDF file.",
  });

export const validateNicImageSignature =
  createSignatureValidator({
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),

    message:
      "NIC image content must be a valid JPG, PNG or WebP file.",
  });