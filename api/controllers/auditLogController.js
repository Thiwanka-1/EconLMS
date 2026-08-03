import mongoose from "mongoose";

import AuditLog from "../models/AuditLog.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

const getPagination = (query) => {
  const page = Math.max(
    Number.parseInt(query.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(
        query.limit,
        10
      ) || 25,
      1
    ),
    100
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const addObjectIdFilter = ({
  filter,
  field,
  value,
}) => {
  if (!value) {
    return;
  }

  if (
    !mongoose.isValidObjectId(value)
  ) {
    throw new HttpError(
      400,
      `Invalid ${field}.`
    );
  }

  filter[field] = value;
};

export const getAuditLogs =
  asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const filter = {};

    addObjectIdFilter({
      filter,
      field: "actor",
      value: req.query.actorId,
    });

    addObjectIdFilter({
      filter,
      field: "targetUser",
      value:
        req.query.targetUserId,
    });

    addObjectIdFilter({
      filter,
      field: "entityId",
      value: req.query.entityId,
    });

    if (req.query.action) {
      filter.action = String(
        req.query.action
      ).toUpperCase();
    }

    if (req.query.entityType) {
      filter.entityType =
        req.query.entityType;
    }

    if (req.query.outcome) {
      if (
        ![
          "success",
          "failure",
        ].includes(
          req.query.outcome
        )
      ) {
        throw new HttpError(
          400,
          "Invalid audit outcome."
        );
      }

      filter.outcome =
        req.query.outcome;
    }

    if (
      req.query.from ||
      req.query.to
    ) {
      filter.createdAt = {};

      if (req.query.from) {
        const fromDate = new Date(
          req.query.from
        );

        if (
          Number.isNaN(
            fromDate.getTime()
          )
        ) {
          throw new HttpError(
            400,
            "Invalid from date."
          );
        }

        filter.createdAt.$gte =
          fromDate;
      }

      if (req.query.to) {
        const toDate = new Date(
          req.query.to
        );

        if (
          Number.isNaN(
            toDate.getTime()
          )
        ) {
          throw new HttpError(
            400,
            "Invalid to date."
          );
        }

        filter.createdAt.$lte =
          toDate;
      }
    }

    const [
      auditLogs,
      total,
    ] = await Promise.all([
      AuditLog.find(filter)
        .populate(
          "actor",
          "firstName lastName email role"
        )
        .populate(
          "targetUser",
          "firstName lastName email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      AuditLog.countDocuments(
        filter
      ),
    ]);

    res.status(200).json({
      success: true,
      auditLogs,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },
    });
  });

export const getAuditLogById =
  asyncHandler(async (req, res) => {
    const auditLog =
      await AuditLog.findById(
        req.params.id
      )
        .populate(
          "actor",
          "firstName lastName email role"
        )
        .populate(
          "targetUser",
          "firstName lastName email role"
        );

    if (!auditLog) {
      throw new HttpError(
        404,
        "Audit log not found."
      );
    }

    res.status(200).json({
      success: true,
      auditLog,
    });
  });