import HttpError from "../utils/HttpError.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const getAllowedOrigins = () => {
  return (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const verifyRequestOrigin = (req, res, next) => {
  if (safeMethods.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");

  // Allows Postman, server-to-server calls and command-line requests.
  if (!origin) {
    return next();
  }

  if (getAllowedOrigins().includes(origin)) {
    return next();
  }

  return next(new HttpError(403, "Request origin is not allowed."));
};

export default verifyRequestOrigin;