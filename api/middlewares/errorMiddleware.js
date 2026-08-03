export const notFound = (
  req,
  res,
  next
) => {
  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  error.statusCode = 404;

  next(error);
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
    error.statusCode ||
    error.status ||
    500;

  let message =
    error.message ||
    "An unexpected server error occurred.";

  if (
    error.name === "MulterError"
  ) {
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

  if (
    error.type ===
    "entity.too.large"
  ) {
    statusCode = 413;
    message =
      "The request body is too large.";
  }

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    statusCode = 400;
    message =
      "The request contains invalid JSON.";
  }

  if (
    error.name ===
    "ValidationError"
  ) {
    statusCode = 400;

    message = Object.values(
      error.errors || {}
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
      "A supplied identifier or value is invalid.";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message =
      "A record with the same unique value already exists.";
  }

  if (
    error.name ===
    "JsonWebTokenError"
  ) {
    statusCode = 401;
    message =
      "Authentication token is invalid.";
  }

  if (
    error.name ===
    "TokenExpiredError"
  ) {
    statusCode = 401;
    message =
      "Authentication token has expired.";
  }

  if (statusCode >= 500) {
    console.error(
      `[ERROR:${req.id || "no-request-id"}]`,
      error
    );

    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      message =
        "An unexpected server error occurred.";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,

    requestId:
      req.id || null,

    ...(process.env.NODE_ENV !==
      "production" && {
      stack: error.stack,
    }),
  });
};

export default errorHandler;