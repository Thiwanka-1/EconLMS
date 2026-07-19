import mongoose from "mongoose";
import HttpError from "../utils/HttpError.js";

const validateObjectId = (
  req,
  res,
  next
) => {
  if (
    !mongoose.isValidObjectId(req.params.id)
  ) {
    return next(
      new HttpError(
        400,
        "Invalid resource ID."
      )
    );
  }

  next();
};

export default validateObjectId;