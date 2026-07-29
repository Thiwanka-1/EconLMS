export const notFound = (
  req,
  res
) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  error,
  req,
  res,
  next
) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode =
    error.statusCode || 500;

  let message =
    error.message ||
    "Internal server error.";

  if (error.name === "MulterError") {
  statusCode = 400;

  if (
    error.code ===
    "LIMIT_FILE_SIZE"
  ) {
    message =
      "The uploaded file exceeds the allowed size.";
  } else if (
    error.code ===
    "LIMIT_FILE_COUNT"
  ) {
    message =
      "Only one file can be uploaded.";
  } else if (
    error.code ===
    "LIMIT_UNEXPECTED_FILE"
  ) {
    message =
      'Unexpected upload field. Use "slip" for payment slips or "nicImage" for NIC images.';
  } else {
    message =
      "The file upload failed.";
  }
}

  if (error.code === 11000) {
    const duplicatedField =
      Object.keys(
        error.keyPattern || {}
      )[0] || "value";

    statusCode = 409;
    message = `A conflicting ${duplicatedField} already exists.`;
  }

  if (
    error.name ===
    "ValidationError"
  ) {
    statusCode = 400;

    message = Object.values(
      error.errors
    )
      .map(
        (validationError) =>
          validationError.message
      )
      .join(" ");
  }

  if (
    error.name === "CastError"
  ) {
    statusCode = 400;
    message =
      "Invalid resource ID.";
  }

  /*
   * Google API errors.
   */
  if (
    error.response?.data?.error
  ) {
    console.error(
      "External API error:",
      error.response.data
    );

    statusCode = 502;
    message =
      "The file-storage service could not complete the request.";
  }

  res.status(statusCode).json({
    success: false,
    message,

    ...(process.env.NODE_ENV ===
      "development" && {
      stack: error.stack,
    }),
  });
};