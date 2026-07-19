export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error.";

  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern || {})[0] || "value";

    statusCode = 409;
    message = `An account with that ${duplicatedField} already exists.`;
  }

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((validationError) => validationError.message)
      .join(" ");
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
    }),
  });
};