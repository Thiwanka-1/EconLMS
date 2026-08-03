import PlatformSetting from "../models/PlatformSetting.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  clearPlatformSettingsCache,
  getPlatformSettings,
} from "../utils/platformSettings.js";

import {
  recordAuditLog,
} from "../utils/auditLog.js";

const allowedFields = {
  branding: new Set([
    "platformName",
    "tagline",
  ]),

  contact: new Set([
    "supportEmail",
    "supportPhone",
    "whatsappNumber",
  ]),

  registration: new Set([
    "isOpen",
    "closedMessage",
  ]),

  maintenanceNotice: new Set([
    "enabled",
    "message",
  ]),

  paymentDetails: new Set([
    "bankName",
    "accountName",
    "accountNumber",
    "branchName",
    "instructions",
    "paymentReferenceNote",
  ]),

  learning: new Set([
    "defaultLessonMaxViews",
  ]),

  liveClasses: new Set([
    "defaultJoinBeforeMinutes",
    "defaultJoinAfterMinutes",
  ]),
};

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const validateSettingsPayload = (
  payload
) => {
  if (!isPlainObject(payload)) {
    throw new HttpError(
      400,
      "A valid settings object is required."
    );
  }

  const changedPaths = [];

  for (const [
    section,
    sectionValue,
  ] of Object.entries(payload)) {
    if (!allowedFields[section]) {
      throw new HttpError(
        400,
        `Unknown settings section: ${section}.`
      );
    }

    if (!isPlainObject(sectionValue)) {
      throw new HttpError(
        400,
        `${section} must be an object.`
      );
    }

    for (const field of Object.keys(
      sectionValue
    )) {
      if (
        !allowedFields[section].has(field)
      ) {
        throw new HttpError(
          400,
          `Unknown settings field: ${section}.${field}.`
        );
      }

      changedPaths.push(
        `${section}.${field}`
      );
    }
  }

  if (changedPaths.length === 0) {
    throw new HttpError(
      400,
      "No settings were supplied."
    );
  }

  return changedPaths;
};

const getSettingsDocument = async () => {
  await getPlatformSettings();

  return PlatformSetting.findOne({
    singletonKey: "platform",
  });
};

export const getPublicPlatformSettings =
  asyncHandler(async (req, res) => {
    const settings =
      await getPlatformSettings();

    res.status(200).json({
      success: true,

      settings: {
        branding: settings.branding,
        contact: settings.contact,
        registration:
          settings.registration,

        maintenanceNotice:
          settings.maintenanceNotice,
      },
    });
  });

export const getStudentPlatformSettings =
  asyncHandler(async (req, res) => {
    const settings =
      await getPlatformSettings();

    res.status(200).json({
      success: true,

      settings: {
        branding: settings.branding,
        contact: settings.contact,

        maintenanceNotice:
          settings.maintenanceNotice,

        paymentDetails:
          settings.paymentDetails,

        learning: settings.learning,

        liveClasses:
          settings.liveClasses,
      },
    });
  });

export const getAdminPlatformSettings =
  asyncHandler(async (req, res) => {
    const settings =
      await PlatformSetting.findOne({
        singletonKey: "platform",
      }).populate(
        "updatedBy",
        "firstName lastName email"
      );

    if (!settings) {
      await getPlatformSettings({
        forceRefresh: true,
      });

      const createdSettings =
        await PlatformSetting.findOne({
          singletonKey: "platform",
        });

      return res.status(200).json({
        success: true,
        settings: createdSettings,
      });
    }

    res.status(200).json({
      success: true,
      settings,
    });
  });

export const updatePlatformSettings =
  asyncHandler(async (req, res) => {
    const changedPaths =
      validateSettingsPayload(req.body);

    const settings =
      await getSettingsDocument();

    if (!settings) {
      throw new HttpError(
        500,
        "Platform settings could not be loaded."
      );
    }

    for (const [
      section,
      sectionValue,
    ] of Object.entries(req.body)) {
      for (const [
        field,
        value,
      ] of Object.entries(sectionValue)) {
        settings.set(
          `${section}.${field}`,
          value
        );
      }
    }

    settings.updatedBy =
      req.user._id;

    await settings.save();

    clearPlatformSettingsCache();

    await recordAuditLog({
      req,

      action:
        "PLATFORM_SETTINGS_UPDATED",

      entityType:
        "PlatformSetting",

      entityId: settings._id,

      description:
        "Platform settings were updated.",

      metadata: {
        changedPaths,
      },
    });

    res.status(200).json({
      success: true,

      message:
        "Platform settings updated successfully.",

      settings,
    });
  });