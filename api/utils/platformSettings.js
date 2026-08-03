import PlatformSetting from "../models/PlatformSetting.js";

const CACHE_DURATION_MS = 30 * 1000;

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

    const settings =
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

    cachedSettings = settings;
    cacheExpiresAt =
      Date.now() + CACHE_DURATION_MS;

    return settings;
  };