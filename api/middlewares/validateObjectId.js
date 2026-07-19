import mongoose from "mongoose";
import HttpError from "../utils/HttpError.js";

export const validateObjectIdParam = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!mongoose.isValidObjectId(value)) {
      return next(
        new HttpError(
          400,
          `Invalid ${paramName}.`
        )
      );
    }

    next();
  };
};

const validateObjectId =
  validateObjectIdParam("id");

export default validateObjectId;