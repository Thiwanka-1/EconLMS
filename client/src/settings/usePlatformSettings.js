import {
  useContext,
} from "react";

import {
  PlatformSettingsContext,
} from "./PlatformSettingsContext.jsx";

export const usePlatformSettings = () => {
  const context = useContext(PlatformSettingsContext);

  if (!context) {
    throw new Error(
      "usePlatformSettings must be used inside PlatformSettingsProvider."
    );
  }

  return context;
};