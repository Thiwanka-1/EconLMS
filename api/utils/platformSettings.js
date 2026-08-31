import PlatformSetting from "../models/PlatformSetting.js";

const CACHE_DURATION_MS = 30 * 1000;
const PLATFORM_NAME = "Accounting With Udara";
const PLATFORM_TAGLINE =
  "Accounting and Commerce Learning Portal";

const LEGACY_PLATFORM_NAMES = new Set([
  "econlls",
  "econlms",
  "accountinglms",
]);

const LEGACY_PLATFORM_TAGLINES = new Set([
  "economics learning portal",
  "accounting learning portal",
]);

const LEGACY_MAINTENANCE_MESSAGES = new Set([
  "econlls is currently undergoing maintenance.",
  "econlms is currently undergoing maintenance.",
  "accountinglms is currently undergoing maintenance.",
]);

let cachedSettings = null;
let cacheExpiresAt = 0;

export const clearPlatformSettingsCache =
  () => {
    cachedSettings = null;
    cacheExpiresAt = 0;
  };

export const getPlatformSettings =
  async ({
    forceRefresh = false,
  } = {}) => {
    const now = Date.now();

    if (
      !forceRefresh &&
      cachedSettings &&
      cacheExpiresAt > now
    ) {
      return cachedSettings;
    }

    let settings =
      await PlatformSetting.findOneAndUpdate(
        {
          singletonKey: "platform",
        },
        {
          $setOnInsert: {
            singletonKey: "platform",
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      ).lean();

    const legacyBrandingUpdates = {};
    const platformName = String(
      settings?.branding?.platformName || ""
    ).trim();
    const tagline = String(
      settings?.branding?.tagline || ""
    ).trim();
    const maintenanceMessage = String(
      settings?.maintenanceNotice?.message || ""
    ).trim();

    if (
      !platformName ||
      LEGACY_PLATFORM_NAMES.has(
        platformName.toLowerCase()
      )
    ) {
      legacyBrandingUpdates[
        "branding.platformName"
      ] = PLATFORM_NAME;
    }

    if (
      !tagline ||
      LEGACY_PLATFORM_TAGLINES.has(
        tagline.toLowerCase()
      )
    ) {
      legacyBrandingUpdates[
        "branding.tagline"
      ] = PLATFORM_TAGLINE;
    }

    if (
      !maintenanceMessage ||
      LEGACY_MAINTENANCE_MESSAGES.has(
        maintenanceMessage.toLowerCase()
      )
    ) {
      legacyBrandingUpdates[
        "maintenanceNotice.message"
      ] = `${PLATFORM_NAME} is currently undergoing maintenance.`;
    }

    if (
      Object.keys(legacyBrandingUpdates)
        .length > 0
    ) {
      settings =
        await PlatformSetting.findOneAndUpdate(
          {
            singletonKey: "platform",
          },
          {
            $set: legacyBrandingUpdates,
          },
          {
            returnDocument: "after",
            runValidators: true,
          }
        ).lean();
    }

    cachedSettings = settings;
    cacheExpiresAt =
      Date.now() + CACHE_DURATION_MS;

    return settings;
  };
