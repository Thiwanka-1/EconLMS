import mongoose from "mongoose";

const jobLeaseSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, maxlength: 150 },
    owner: { type: String, required: true, maxlength: 200 },
    lockedUntil: { type: Date, required: true },
  },
  { timestamps: true }
);

jobLeaseSchema.index({ lockedUntil: 1 }, { expireAfterSeconds: 3600 });

const JobLease = mongoose.model("JobLease", jobLeaseSchema);

export default JobLease;
